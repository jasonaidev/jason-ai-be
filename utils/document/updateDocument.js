const { fetchAssistantResponse } = require("../modules/chatModules");
const { dataExtraction } = require("../modules/dataExtraction");
const { downloadFile } = require("../modules/downloadFile");
const { fileParser } = require("../modules/fileParser");
const { fileUpload, deleteFile } = require("../modules/fileUpload");
const { pdfToDocx } = require("../modules/pdfToDocx");
const {
  uploadFileToAssistant,
  deleteFileFromAssistant,
} = require("../openaiAssistant/CreateFile");
const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant");
const path = require("path");
const { SystemPrompt } = require("../prompt");
const {
  replaceInDocx,
  replaceInDocument,
  replaceEmail,
  replaceInXlsx,
} = require("./replace-text");
const fs = require("fs").promises;
// @ts-ignore
/**
 * @param {{ data: any; }} req
 */

function parseArrayString(str) {
  try {
    // Remove the outer brackets and split by commas
    const cleanedStr = str.slice(1, -1).trim(); // Remove the first and last characters (brackets)

    // Split the string by commas and add quotes around each item
    const array = cleanedStr.split(",").map((item) => `"${item.trim()}"`);

    // Join the array items into a valid JSON string and parse it
    return JSON.parse(`[${array.join(", ")}]`);
  } catch (e) {
    console.error("Error parsing string:", e);
    return str; // Return the original string if it can't be parsed
  }
}

async function ensureOutputDirectory() {
  const outputDir = path.join(__dirname, `../../public/files/outputs`);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

async function updateDocument(req) {
  try {
    const { data } = req;
    console.log("Receive Query Params for Update+++: ", data);

    const selectedTemplate = await strapi.db
      .query("api::policy-template.policy-template")
      .findOne({
        where: {
          id: data?.template,
        },
        populate: true,
      });

    if (
      !selectedTemplate ||
      !selectedTemplate.file ||
      !selectedTemplate.file.url
    ) {
      throw new Error("Template or file URL not found.");
    }

    // Example usage:
    const fileUrl = selectedTemplate?.file?.url;
    const fileName = selectedTemplate?.file?.name;
    const fileExt = selectedTemplate?.file?.ext;

    const outputPath = path.join(
      __dirname,
      `../../public/files/templates/${fileName}`
    );

    const fileStatus = await downloadFile(fileUrl, outputPath);

    if (!fileStatus) {
      throw new Error("Failed to download file.");
    }

    let filePath = fileExt?.includes(".pdf")
      ? await pdfToDocx(outputPath, fileName)
      : outputPath;

    // const uploadedFileId = await uploadFileToAssistant(outputPath);
    const uploadedFileId = await uploadFileToAssistant(filePath);
    if (!uploadedFileId) {
      throw new Error("Failed to upload file to OpenAI.");
    }

    const assistant = await updateAssistant(uploadedFileId);

    if (!assistant) {
      throw new Error("Failed to update assistant with new file.");
    }

    let user_inputs;
    if (data?.file) {
      const currentDocumentFile = await strapi.db
        .query("plugin::upload.file")
        .findOne({
          where: {
            id: data?.file,
          },
        });

      user_inputs = await fileParser(currentDocumentFile?.url);
      console.log("user_inputs Text: ", user_inputs.slice(0, 50));
    }

    const extractedDataFromDocument = await dataExtraction(
      uploadedFileId,
      fileExt,
      data?.companyName,
      user_inputs
    );

    const outputDir = await ensureOutputDirectory();
    const outputFilePath = path.join(
      outputDir,
      `user_${data?.user}_${path.basename(filePath)}`
    );
    await fs.copyFile(filePath, outputFilePath);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let done = [];
    try {
      if (
        fileExt?.includes(".pdf") ||
        fileExt?.includes(".docx") ||
        fileExt?.includes(".xlsx")
      ) {
        if (fileExt?.includes(".xlsx")) {
          console.log("Processing Excel file");
          // Batch process for Excel files
          const replacements = [];

          // Add title replacement if exists
          if (
            extractedDataFromDocument?.title &&
            extractedDataFromDocument?.title !== ""
          ) {
            console.log("Adding title replacement");
            replacements.push({
              targets: [extractedDataFromDocument?.title],
              replacement: data?.title,
            });
          }

          // Add other info replacements
          if (extractedDataFromDocument?.otherInfo) {
            console.log("Processing other info replacements");
            for (const com of extractedDataFromDocument.otherInfo) {
              if (com?.docs !== "" && !done.includes(com?.docs)) {
                replacements.push({
                  targets: [com?.docs],
                  replacement: com?.info,
                });
                done.push(com?.docs);
              }
            }
          }

          // Add company name replacements
          const companyName = [
            ...parseArrayString(extractedDataFromDocument?.companyName),
            "Insert Company Name",
            "[Insert Company Name]",
            "Company Name",
            "iCreditWorks",
            "iCreditWork",
            "Insert Company",
            "Insert Company Here",
            "[Insert Company Here]",
          ].filter(
            (com) =>
              com !== "" &&
              com !== "Insert Credit Union Here" &&
              com !== "Insert Strategic Partner Here" &&
              com !== "Insert Strategic Partners Here" &&
              com !== "Insert Partner Here" &&
              com !== "Insert Financial Institution Here" &&
              !done.includes(com)
          );

          if (companyName.length > 0) {
            console.log("Adding company name replacements");
            replacements.push({
              targets: companyName,
              replacement: data?.companyName,
            });
            done.push(...companyName);
          }

          // Add company abbreviation replacements
          const companyAbbr =[
           ...parseArrayString(extractedDataFromDocument?.companyAbbr),
            "iCW",
            "ICW"
          ].filter((com) => com !== "" && com !== "MPL" && !done.includes(com));

          if (companyAbbr.length > 0) {
            console.log("Adding company abbreviation replacements");
            replacements.push({
              targets: companyAbbr,
              replacement: extractedDataFromDocument?.userAbb,
            });
            done.push(...companyAbbr);
          }

          // Add email replacements
          const companyEmail = [
            ...parseArrayString(extractedDataFromDocument?.companyEmail),
            "Insert Company Email",
            "[Insert Company Email]",
            "Company Email",
            "Insert Email",
            "Insert Email Here",
            "[Insert Email Here]",
          ].filter((com) => com !== "" && !done.includes(com));

          if (companyEmail.length > 0) {
            console.log("Adding email replacements");
            replacements.push({
              targets: companyEmail,
              replacement: data?.email,
            });
            done.push(...companyEmail);
          }

          // Process all replacements in one go
          console.log("Processing all replacements");
          for (const replacement of replacements) {
            try {
              await replaceInXlsx(
                outputFilePath,
                replacement.targets,
                replacement.replacement
              );
            } catch (error) {
              console.error("Error making replacement:", error);
              // Continue with other replacements
            }
          }
        } else {
          // Process PDF and DOCX files
          console.log("Processing PDF/DOCX file");

          // Replace title
          if (
            extractedDataFromDocument?.title &&
            extractedDataFromDocument?.title !== ""
          ) {
            console.log("Replacing title");
            const insertDocs = await replaceInDocument(
              outputFilePath,
              [extractedDataFromDocument?.title],
              data?.title,
              false
            );
            done.push(extractedDataFromDocument?.title);
          }

          // Replace other info
          if (extractedDataFromDocument?.otherInfo) {
            console.log("Replacing other info");
            for (const com of extractedDataFromDocument.otherInfo) {
              if (com?.docs !== "" && !done.includes(com?.docs)) {
                const insertDocsss = await replaceInDocument(
                  outputFilePath,
                  [com?.docs],
                  com?.info,
                  false
                );
                done.push(com?.docs);
              }
            }
          }

          // Replace company name
          let companyName = [
            ...parseArrayString(extractedDataFromDocument?.companyName),
            "Insert Company Name",
            "[Insert Company Name]",
            "Company Name",
            "Insert Company",
            "Insert Company Here",
            "[Insert Company Here]",
          ];

          if (companyName?.length > 0) {
            console.log("Replacing company names");
            for (const com of companyName) {
              if (
                com !== "" &&
                com !== "Insert Credit Union Here" &&
                com !== "Insert Strategic Partner Here" &&
                com !== "Insert Strategic Partners Here" &&
                com !== "Insert Partner Here" &&
                com !== "Insert Financial Institution Here" &&
                com !== "MPL" &&
                !done.includes(com)
              ) {
                const insertDocss = await replaceInDocument(
                  outputFilePath,
                  [com],
                  data?.companyName,
                  false
                );
                done.push(com);
              }
            }
          }

          // Replace company abbreviations
          if (
            parseArrayString(extractedDataFromDocument?.companyAbbr)?.length > 0
          ) {
            console.log("Replacing company abbreviations");
            for (const com of parseArrayString(
              extractedDataFromDocument?.companyAbbr
            )) {
              if (com !== "" && com !== "MPL" && !done.includes(com)) {
                const insertDocsss = await replaceInDocument(
                  outputFilePath,
                  [com],
                  extractedDataFromDocument?.userAbb,
                  false
                );
                done.push(com);
              }
            }
          }

          // Replace company email (PDF/DOCX specific)
          let companyEmaill = [
            ...parseArrayString(extractedDataFromDocument?.companyEmail),
          ];
          if (companyEmaill?.length > 0) {
            console.log("Replacing company emails (PDF/DOCX specific)");
            for (const com of companyEmaill) {
              if (com !== "" && !done.includes(com)) {
                const insertDocssss = await replaceEmail(
                  outputFilePath,
                  [com],
                  data?.email
                );
                done.push(com);
              }
            }
          }

          // Replace all email variations
          let companyEmail = [
            ...parseArrayString(extractedDataFromDocument?.companyEmail),
            "Insert Company Email",
            "[Insert Company Email]",
            "Company Email",
            "Insert Email",
            "Insert Email Here",
            "[Insert Email Here]",
          ];

          if (companyEmail?.length > 0) {
            console.log("Replacing all email variations");
            for (const com of companyEmail) {
              if (com !== "" && !done.includes(com)) {
                const insertDocssss = await replaceInDocument(
                  outputFilePath,
                  [com],
                  data?.email,
                  false
                );
                done.push(com);
              }
            }
          }
        }
      }

      console.log("Document processing completed");
    } catch (error) {
      console.error("Error in document processing:", error);
      throw error;
    }


    let fileResponse;
    try {
      fileResponse = await fileUpload(
        outputFilePath,
        `user_${data?.user}_${path.basename(filePath)}`,
        fileExt
      );
    } catch (error) {
      console.error(
        `File upload failed, retrying... (${retryCount + 1}/${maxRetries})`,
        error
      );
    }

    if (!fileResponse) {
      throw new Error("Failed to upload file response or invalid response ID.");
    }

    const entry = await strapi.entityService.update(
      "api::document.document",
      data.id,
      {
        data: {
          file: fileResponse?.id,
          // conversation: assistantResponse?.messagesList,
          description: extractedDataFromDocument?.description,
          updatedAt: new Date(),
        },
        populate: "*",
      }
    );

    console.log("Entry Saved into the DB+++ ", entry);

    // Delete Files
    await deleteFileFromAssistant(uploadedFileId);
    // await deleteFileFromAssistant(data?.openAiFileId);

    const originalFileName = `user_${data?.user}_${path.basename(filePath)}`;

    await deleteFile(originalFileName);

    if (fileExt?.includes(".pdf")) {
      const pdfFileName = originalFileName.replace(".docx", ".pdf");
      await deleteFile(pdfFileName);
    }

    return entry;
  } catch (error) {
    console.error("Error at Create Document:++ ", error);
    // const { data } = req;
    // await strapi.entityService.delete('api::document.document', data.id)

    throw error;
  }
}

module.exports = { updateDocument };
