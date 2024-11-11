const fs = require("fs").promises;
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

async function replaceInDocx(filePath, targetWords, replacementWord) {
  if (
    !targetWords ||
    !Array.isArray(targetWords) ||
    targetWords.length === 0 ||
    (targetWords.length === 1 && targetWords[0] === "")
  ) {
    console.log("No valid target words provided, skipping replacement");
    return filePath; // Return the original file path without modifications
  }
  
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

// Function to handle replacements for both .docx and .xlsx files
async function replaceTextInFiles(targetWords, replacementWord, ...filePaths) {
  console.log("Starting text replacement in files:", {
    targetWords,
    replacementWord,
    filePaths,
  });

  for (const filePath of filePaths) {
    try {
      if (filePath.endsWith(".docx")) {
        await replaceInDocx(filePath, targetWords, replacementWord);
      } else if (filePath.endsWith(".xlsx")) {
        await replaceInDocx(filePath, targetWords, replacementWord);
      } else {
        console.log(`Unsupported file type: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = { replaceTextInFiles, replaceInDocx };
