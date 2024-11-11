const fs = require('fs');
const path = require('path');
const mime = require('mime-types'); // Used to detect the file's mime type
const { docxToPdf } = require('./docxToPdf');
const { waitForFile } = require('../services/waitForFile');

/**
 * @param {any[]} fileNames
 * @param {string | string[]} fileExt
 */
async function fileUpload(filePath, fileName, fileExt) {

    try {
        // Ensure the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }

        // If the file needs to be converted, convert it
        if (fileExt?.includes('.pdf')) {
            const absolutePath = await docxToPdf(filePath, fileName);
            filePath = absolutePath.path
            fileName = absolutePath.updatedFileName
        }

        await waitForFile(filePath)

        const stats = fs.statSync(filePath);

        const uploadedFile = await strapi.plugins.upload.services.upload.upload({
            data: {}, // Mandatory declaration (can be empty)
            files: {
                path: filePath,
                name: fileName, // Example file name
                type: mime.lookup(filePath), // MIME type of the file
                size: stats.size,
            },
        });

        console.log("File uploaded successfully:", uploadedFile);

        // Assuming the response includes the file's ID, adjust based on your actual response structure
        return uploadedFile[0];
    } catch (error) {
        console.error("Upload failed:", error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}


/**
 * @param {any} fileNames
 */
async function deleteFile(fileName) {
    let filePath = path.join(__dirname, `../../public/files/outputs/${fileName}`);

    try {

        // Ensure the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist');
        }

        fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting the partial file:', err);
        });

        console.log('File deleted successfully');
    } catch (error) {
        console.error("Delete file failed:", error.message);
        // throw error;  // Re-throw the error to be handled by the caller
    }
}

module.exports = { fileUpload, deleteFile };
