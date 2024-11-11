const { fetchAssistantResponse } = require("../modules/chatModules.js");
const { dataExtraction } = require("../modules/dataExtraction.js");
const { downloadFile } = require("../modules/downloadFile.js");
const { fileParser } = require("../modules/fileParser.js");
const { fileUpload, deleteFile } = require("../modules/fileUpload.js");
const { pdfToDocx } = require("../modules/pdfToDocx.js");
const {
  uploadFileToAssistant,
  deleteFileFromAssistant,
} = require("../openaiAssistant/CreateFile.js");
const { CreateThread } = require("../openaiAssistant/CreateThread.js");
const { RunAssistant } = require("../openaiAssistant/RunAssistant.js");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant.js");
const { queryToOpenAi } = require("./ai.js");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const path = require("path");
const { SystemPrompt } = require("../prompt.js");
const { CheckFileStatus } = require("../openaiAssistant/CheckFileStatus.js");
const { applyTemplateFormatting } = require("./applytemplateformatting.js");
const { replaceInDocx, replaceInDocument } = require("./replace-text.js");
const fs = require("fs").promises;

// @ts-ignore
/*** @param {{ data: any; }} req*/

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

async function createDocument(req) {
  try {
    const { data } = req;
    // console.log("Receive Query Params: ", data);

    // get the selected template
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

    // console.log("selectedTemplate: ", selectedTemplate);

    const fileUrl = selectedTemplate?.file?.url;
    const fileName = selectedTemplate?.file?.name;
    const fileExt = selectedTemplate?.file?.ext;

    // get the templates from the local template folder
    const outputPath = path.join(
      __dirname,
      `../../public/files/templates/${fileName}`
    );

    // download the template from the local template folder
    const fileStatus = await downloadFile(fileUrl, outputPath);

    if (!fileStatus) {
      throw new Error("Failed to download file.");
    }

    // if the file extension is pdf chnage it to docx
    let filePath = fileExt?.includes(".pdf")
      ? await pdfToDocx(outputPath, fileName)
      : outputPath;

    // const uploadedFileId = await uploadFileToAssistant(outputPath);
    // upload file to fileToAssistant
    const uploadedFileId = await uploadFileToAssistant(filePath);
    const file_status = await CheckFileStatus(uploadedFileId);
    if (!uploadedFileId || !file_status) {
      throw new Error("Failed to upload file to OpenAI.");
    }

    const assistant = await updateAssistant(uploadedFileId);

    if (!assistant) {
      throw new Error("Failed to update assistant with new file.");
    }

    // extract data from the template using the uploadedFileId
    const extractedDataFromDocument = await dataExtraction(
      uploadedFileId,
      fileExt,
      data?.companyName
    );

    const outputDir = await ensureOutputDirectory();
    const outputFilePath = path.join(
      outputDir,
      `user_${data?.user}_${path.basename(filePath)}`
    );
    await fs.copyFile(filePath, outputFilePath);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      if (
        fileExt?.includes(".pdf") ||
        fileExt?.includes(".docx") ||
        fileExt?.includes(".xlsx")
      ) {
        if (extractedDataFromDocument?.title) {
          const insertDocs = await replaceInDocument(
            outputFilePath,
            [extractedDataFromDocument?.title],
            data?.title
          );
        }

        if (
          parseArrayString(extractedDataFromDocument?.companyName)?.length > 0
        ) {
          const insertDocss = await replaceInDocument(
            outputFilePath,
            parseArrayString(extractedDataFromDocument?.companyName),
            data?.companyName
          );
        }

        if (
          parseArrayString(extractedDataFromDocument?.companyAbbr)?.length > 0
        ) {
          const insertDocsss = await replaceInDocument(
            outputFilePath,
            parseArrayString(extractedDataFromDocument?.companyAbbr),
            extractedDataFromDocument?.userAbb
          );
        }

        if (
          parseArrayString(extractedDataFromDocument?.companyEmail)?.length > 0
        ) {
          const insertDocssss = await replaceInDocument(
            outputFilePath,
            parseArrayString(extractedDataFromDocument?.companyEmail),
            data?.email
          );
        }

        console.log("this is the insertDocs", insertDocs);
      }
    } catch (error) {
      console.error("Error in replaceInDocx: ", error);
    }

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

    // console.log("Res of Upload: ", fileResponse);

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

    await deleteFileFromAssistant(uploadedFileId);

    await deleteFile(`user_${data?.user}_${path.basename(filePath)}`);

    return entry;
  } catch (error) {
    console.error("Error at Create Document:++ ", error);
    const { data } = req;
    await strapi.entityService.delete("api::document.document", data.id);

    throw error;
  }
}

module.exports = { createDocument };
