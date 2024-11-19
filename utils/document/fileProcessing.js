// fileProcessing.js
const { Buffer } = require("buffer");
const stream = require("stream");
const { promisify } = require("util");
const mime = require("mime-types");
const pipeline = promisify(stream.pipeline);

// Utility functions for buffer processing
async function uploadBufferToAssistant(buffer, fileName) {
  try {
    const blob = new Blob([buffer]);
    const file = new File([blob], fileName);
    return await uploadFileToAssistant(file);
  } catch (error) {
    console.error("Error uploading buffer to assistant:", error);
    throw error;
  }
}

async function uploadBufferToStrapi(buffer, fileName, fileExt) {
  try {
    const file = {
      buffer: buffer,
      name: fileName,
      type: mime.lookup(fileExt) || "application/octet-stream",
      size: buffer.length,
    };

    const uploadedFile = await strapi.plugins.upload.services.upload.upload({
      data: {},
      files: file,
    });

    return uploadedFile[0];
  } catch (error) {
    console.error("Error uploading buffer to Strapi:", error);
    throw error;
  }
}

async function processDocumentBuffer(buffer, replacements, fileExt) {
  try {
    const { title, companyName, email, extractedData } = replacements;

    // Process based on file type
    if (fileExt?.includes(".docx")) {
      return await processDocxBuffer(buffer, {
        title,
        companyName,
        email,
        extractedData,
      });
    } else if (fileExt?.includes(".pdf")) {
      return await processPdfBuffer(buffer, {
        title,
        companyName,
        email,
        extractedData,
      });
    } else if (fileExt?.includes(".xlsx")) {
      return await processXlsxBuffer(buffer, {
        title,
        companyName,
        email,
        extractedData,
      });
    }

    return buffer;
  } catch (error) {
    console.error("Error processing document buffer:", error);
    throw error;
  }
}

async function downloadToBuffer(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("Error downloading to buffer:", error);
    throw error;
  }
}

async function parseBufferContent(buffer, fileExt) {
  try {
    // Implement parsing based on file type
    if (fileExt?.includes(".pdf")) {
      return await parsePdfBuffer(buffer);
    } else if (fileExt?.includes(".docx")) {
      return await parseDocxBuffer(buffer);
    } else if (fileExt?.includes(".txt")) {
      return buffer.toString("utf-8");
    }

    throw new Error(`Unsupported file type: ${fileExt}`);
  } catch (error) {
    console.error("Error parsing buffer content:", error);
    throw error;
  }
}

// Export utility functions
module.exports = {
  uploadBufferToAssistant,
  uploadBufferToStrapi,
  processDocumentBuffer,
  downloadToBuffer,
  parseBufferContent,
};
