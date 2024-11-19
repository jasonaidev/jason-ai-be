const fs = require("fs").promises; // Use promises version
const fsSync = require("fs"); // Sync version for exists checks
const path = require("path");
const mime = require("mime-types");
const { docxToPdf } = require("./docxToPdf");
const { waitForFile } = require("../services/waitForFile");

/**
 * Uploads a file to Strapi with conversion support
 * @param {string} filePath Original file path
 * @param {string} fileName File name
 * @param {string | string[]} fileExt File extension(s) to check for conversion
 */
async function fileUpload(filePath, fileName, fileExt) {
  try {
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    let finalPath = filePath;
    let finalFileName = fileName;

    // Convert to PDF if needed
    if (fileExt?.includes(".pdf")) {
      try {
        const converted = await docxToPdf(filePath, fileName);
        finalPath = converted.path;
        finalFileName = converted.updatedFileName;

        // Wait for the converted file to be available
        await waitForFile(finalPath);
      } catch (convError) {
        console.error("PDF conversion failed:", convError);
        throw new Error(`PDF conversion failed: ${convError.message}`);
      }
    }

    // Get file stats
    const stats = await fs.stat(finalPath);

    // Upload to Strapi
    const uploadedFile = await strapi.plugins.upload.services.upload.upload({
      data: {},
      files: {
        path: finalPath,
        name: finalFileName,
        type: mime.lookup(finalPath) || "application/octet-stream",
        size: stats.size,
      },
    });

    console.log("File uploaded successfully:", uploadedFile[0].id);
    return uploadedFile[0];
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

/**
 * Deletes a file with retry mechanism
 * @param {string} fileName Name of file to delete
 * @param {number} maxRetries Maximum number of retry attempts
 */
async function deleteFile(fileName, maxRetries = 3) {
  const filePath = path.join(
    __dirname,
    `../../public/files/outputs/${fileName}`
  );
  let currentRetry = 0;

  const tryDelete = async () => {
    try {
      // Check if file exists
      if (!fsSync.existsSync(filePath)) {
        console.log("File does not exist, skipping deletion:", fileName);
        return;
      }

      // Wait for any file operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to delete
      await fs.unlink(filePath);
      console.log("File deleted successfully:", fileName);
    } catch (error) {
      // Handle file busy or permission errors
      if (
        (error.code === "EBUSY" || error.code === "EPERM") &&
        currentRetry < maxRetries
      ) {
        currentRetry++;
        console.log(
          `File is busy, retrying... (${currentRetry}/${maxRetries}):`,
          fileName
        );

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * currentRetry)
        );
        return tryDelete();
      }

      // If we're out of retries or it's a different error
      throw error;
    }
  };

  try {
    await tryDelete();
  } catch (error) {
    console.error(
      `Failed to delete file ${fileName} after ${maxRetries} attempts:`,
      error
    );
    // Log error but don't throw to prevent application crashes
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath Directory path to ensure
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Initialize output directory on module load
const outputDir = path.join(__dirname, "../../public/files/outputs");
ensureDirectory(outputDir).catch(console.error);

module.exports = { fileUpload, deleteFile };
