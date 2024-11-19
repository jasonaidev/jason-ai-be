const fs = require("fs").promises;
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
// const XLSX = require("xlsx");
const fetch = require("node-fetch");
const FormData = require("form-data");

async function replaceInDocument(filePath, targetWords, replacementWord) {
  try {
    console.log("Processing file:", { filePath, targetWords, replacementWord });

    // Read the file
    const fileContent = await fs.readFile(filePath);

    // Create a FormData object
    const formData = new FormData();
    formData.append("file", fileContent, {
      filename: filePath.split("/").pop(),
    });
    targetWords.forEach((word) => formData.append("target_words", word));
    formData.append("replacement_word", replacementWord);

    // Send the request to the Python backend
    const response = await fetch("http://127.0.0.1:5000/replace", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorData.error}, traceback: ${errorData.traceback}`
      );
    }

    // Get the processed file as a buffer
    const processedBuffer = await response.buffer();

    // Write the processed file back to the original location
    await fs.writeFile(filePath, processedBuffer);

    console.log(`Successfully processed file: ${filePath}`);
    console.log("Replacements made for words:", targetWords);

    return filePath;
  } catch (error) {
    console.error("Error in replaceInFile:", error);
    throw error;
  }
}

async function replaceEmail(filePath, targetWords, replacementWord) {
  try {
    console.log("Processing file:", { filePath, targetWords, replacementWord });

    // Read the document content
    const content = await fs.readFile(filePath, "binary");
    const zip = new PizZip(content);

    // Load the document
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // First, get the document's XML content
    const xmlContent = zip.files["word/document.xml"].asText();

    // Create a mapping of target words to template variables
    const replacements = {};
    let modifiedXml = xmlContent;

    targetWords.forEach((word, index) => {
      // Create a unique template variable name
      const templateVar = `replacement_${index + 1}`;

      // Escape special characters in the target word for regex
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Replace the target word with the template variable while preserving XML tags
      const regex = new RegExp(
        `(<w:t[^>]*>)(.*?)(${escapedWord})(.*?)(</w:t>)`,
        "g"
      );
      modifiedXml = modifiedXml.replace(regex, `$1$2{${templateVar}}$4$5`);

      // Add to replacements object
      replacements[templateVar] = replacementWord;
    });

    // Update the document's XML content
    zip.file("word/document.xml", modifiedXml);

    // Create a new Docxtemplater instance with the modified content
    const modifiedDoc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Set the template data
    modifiedDoc.setData(replacements);

    // Render the document
    modifiedDoc.render();

    // Generate output
    const buf = modifiedDoc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // Write back to the file
    await fs.writeFile(filePath, buf);

    console.log(`Successfully processed file: ${filePath}`);
    console.log("Replacements made:", replacements);

    return filePath;
  } catch (error) {
    console.error("Error in replaceInDocx:", error);
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors
        .map((error) => error.properties.explanation)
        .join("\n");
      console.error("Detailed error:", errorMessages);
    }
    throw error;
  }
}

module.exports = {
  replaceInDocument,
  replaceEmail,
};

// const fs = require("fs").promises;
// const PizZip = require("pizzip");
// const Docxtemplater = require("docxtemplater");
// const ExcelJS = require("exceljs");
// // const XLSX = require("xlsx");
// const fetch = require("node-fetch");
// const FormData = require("form-data");

// async function replaceInDocument(filePath, targetWords, replacementWord) {
//   // Validate inputs
//   if (
//     !targetWords ||
//     !Array.isArray(targetWords) ||
//     targetWords.length === 0 ||
//     (targetWords.length === 1 && targetWords[0] === "")
//   ) {
//     console.log("No valid target words provided, skipping replacement");
//     return filePath;
//   }

//   // Determine file type and process accordingly
//   if (filePath.toLowerCase().endsWith(".xlsx")) {
//     return await replaceInXlsx(filePath, targetWords, replacementWord);
//   } else if (filePath.toLowerCase().endsWith(".docx")) {
//     return await replaceInDocx(filePath, targetWords, replacementWord);
//   } else {
//     throw new Error(
//       "Unsupported file type. Only .docx and .xlsx files are supported."
//     );
//   }
// }

// async function replaceInDocx(filePath, targetWords, replacementWord) {
//   try {
//     console.log("Processing file:", { filePath, targetWords, replacementWord });

//     // Read the file
//     const fileContent = await fs.readFile(filePath);

//     // Create a FormData object
//     const formData = new FormData();
//     formData.append("file", fileContent, {
//       filename: filePath.split("/").pop(),
//     });
//     targetWords.forEach((word) => formData.append("target_words", word));
//     formData.append("replacement_word", replacementWord);

//     // Send the request to the Python backend
//     const response = await fetch("http://127.0.0.1:5000/replace", {
//       method: "POST",
//       body: formData,
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(
//         `HTTP error! status: ${response.status}, message: ${errorData.error}, traceback: ${errorData.traceback}`
//       );
//     }

//     // Get the processed file as a buffer
//     const processedBuffer = await response.buffer();

//     // Write the processed file back to the original location
//     await fs.writeFile(filePath, processedBuffer);

//     console.log(`Successfully processed file: ${filePath}`);
//     console.log("Replacements made for words:", targetWords);

//     return filePath;
//   } catch (error) {
//     console.error("Error in replaceInDocx:", error);
//     throw error;
//   }
// }

// async function replaceInXlsx(filePath, targetWords, replacementWord) {
//   try {
//     console.log("Processing XLSX:", { filePath, targetWords, replacementWord });

//     // Filter out empty strings
//     const validTargetWords = targetWords.filter(
//       (word) => word && word.trim() !== ""
//     );
//     if (validTargetWords.length === 0) {
//       return filePath;
//     }

//     // Load workbook
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.readFile(filePath);

//     let replacementsMade = false;

//     // Process each worksheet
//     workbook.worksheets.forEach((worksheet) => {
//       // Process each row
//       worksheet.eachRow((row) => {
//         // Process each cell in the row
//         row.eachCell({ includeEmpty: false }, (cell) => {
//           // Get cell value safely
//           let cellValue = "";

//           // Handle different cell types
//           switch (cell.type) {
//             case ExcelJS.ValueType.String:
//               cellValue = cell.text || "";
//               break;
//             case ExcelJS.ValueType.Number:
//               cellValue = cell.value?.toString() || "";
//               break;
//             case ExcelJS.ValueType.Formula:
//               // Get the result of the formula
//               cellValue = cell.result?.toString() || "";
//               break;
//             default:
//               // For other types (Date, Error, etc.), convert to string if possible
//               cellValue = cell.value?.toString() || "";
//           }

//           if (cellValue) {
//             let newValue = cellValue;
//             let modified = false;

//             // Replace each target word
//             validTargetWords.forEach((target) => {
//               if (target && newValue.includes(target)) {
//                 // Use regex to replace all instances while preserving case
//                 const regex = new RegExp(
//                   target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
//                   "g"
//                 );
//                 newValue = newValue.replace(regex, replacementWord);
//                 modified = true;
//               }
//             });

//             // Update cell if changes were made
//             if (modified) {
//               // Preserve formulas if present
//               if (cell.type === ExcelJS.ValueType.Formula) {
//                 // Only update formula result if needed
//                 if (cell.result?.toString() !== newValue) {
//                   cell.value = {
//                     formula: cell.formula,
//                     result: newValue,
//                   };
//                 }
//               } else {
//                 cell.value = newValue;
//               }
//               replacementsMade = true;
//             }
//           }
//         });
//       });
//     });

//     // Only save if changes were made
//     if (replacementsMade) {
//       await workbook.xlsx.writeFile(filePath);
//       console.log(`Successfully processed XLSX file: ${filePath}`);
//     } else {
//       console.log("No replacements were needed in the XLSX file");
//     }

//     return filePath;
//   } catch (error) {
//     console.error("Error in replaceInXlsx:", error);
//     throw error;
//   }
// }

// async function replaceEmail(filePath, targetWords, replacementWord) {
//   try {
//     console.log("Processing file:", { filePath, targetWords, replacementWord });

//     // Read the document content
//     const content = await fs.readFile(filePath, "binary");
//     const zip = new PizZip(content);

//     // Load the document
//     const doc = new Docxtemplater(zip, {
//       paragraphLoop: true,
//       linebreaks: true,
//     });

//     // First, get the document's XML content
//     const xmlContent = zip.files["word/document.xml"].asText();

//     // Create a mapping of target words to template variables
//     const replacements = {};
//     let modifiedXml = xmlContent;

//     targetWords.forEach((word, index) => {
//       // Create a unique template variable name
//       const templateVar = `replacement_${index + 1}`;

//       // Escape special characters in the target word for regex
//       const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//       // Replace the target word with the template variable while preserving XML tags
//       const regex = new RegExp(
//         `(<w:t[^>]*>)(.*?)(${escapedWord})(.*?)(</w:t>)`,
//         "g"
//       );
//       modifiedXml = modifiedXml.replace(regex, `$1$2{${templateVar}}$4$5`);

//       // Add to replacements object
//       replacements[templateVar] = replacementWord;
//     });

//     // Update the document's XML content
//     zip.file("word/document.xml", modifiedXml);

//     // Create a new Docxtemplater instance with the modified content
//     const modifiedDoc = new Docxtemplater(zip, {
//       paragraphLoop: true,
//       linebreaks: true,
//     });

//     // Set the template data
//     modifiedDoc.setData(replacements);

//     // Render the document
//     modifiedDoc.render();

//     // Generate output
//     const buf = modifiedDoc.getZip().generate({
//       type: "nodebuffer",
//       compression: "DEFLATE",
//     });

//     // Write back to the file
//     await fs.writeFile(filePath, buf);

//     console.log(`Successfully processed file: ${filePath}`);
//     console.log("Replacements made:", replacements);

//     return filePath;
//   } catch (error) {
//     console.error("Error in replaceInDocx:", error);
//     if (error.properties && error.properties.errors instanceof Array) {
//       const errorMessages = error.properties.errors
//         .map((error) => error.properties.explanation)
//         .join("\n");
//       console.error("Detailed error:", errorMessages);
//     }
//     throw error;
//   }
// }

// // Function to handle replacements for both .docx and .xlsx files
// async function replaceTextInFiles(targetWords, replacementWord, ...filePaths) {
//   console.log("Starting text replacement in files:", {
//     targetWords,
//     replacementWord,
//     filePaths,
//   });

//   for (const filePath of filePaths) {
//     try {
//       if (filePath.endsWith(".docx")) {
//         await replaceInDocx(filePath, targetWords, replacementWord);
//       } else if (filePath.endsWith(".xlsx")) {
//         await replaceInDocx(filePath, targetWords, replacementWord);
//       } else {
//         console.log(`Unsupported file type: ${filePath}`);
//       }
//     } catch (error) {
//       console.error(`Error processing ${filePath}:`, error);
//       throw error;
//     }
//   }
// }

// module.exports = { replaceTextInFiles, replaceInDocx, replaceInDocument, replaceEmail };
