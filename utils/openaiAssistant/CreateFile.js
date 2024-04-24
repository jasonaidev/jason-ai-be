const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');
const { waitForFile } = require('../services/waitForFile');
const axios = require('axios');

// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


/**
 * @param {fs.PathLike} filePath
 */
async function uploadFileToAssistant(filePath) {
    try {
        console.log("Checking file path: ", filePath);

        // Wait for the file to exist
        await waitForFile(filePath);

        // Proceed with file upload since the file now exists
        const file = await openai.files.create({
            file: fs.createReadStream(filePath),
            purpose: "assistants",
        });

        // Optionally, log success message with file details
        console.log("File uploaded successfully:", file);

        return file.id;
    } catch (error) {
        // Log the error for debugging purposes
        console.error("Failed to upload file:", error.message);
        // Re-throw the error if you want the caller to handle it,
        // or handle it here based on your application's needs
        throw new Error(error);
    }
}



/**
 * @param {any} fileId
 */
async function deleteFileFromAssistant(fileId) {
    try {
        console.log("Checking file path for Delete: ", fileId);

        const file = await axios.delete(`https://api.openai.com/v1/files/${fileId}`, {
            headers: {
                Authorization: `Bearer  ${process.env.OPENAI_API_KEY}`
            }
        });
        
        // Optionally, log success message with file details
        console.log("File Deleted successfully from OpenAi Storage:", file);

        return file
    } catch (error) {
        // Log the error for debugging purposes
        console.error("Failed to delete file from OpenAi Storage:", error.message);
        // Re-throw the error if you want the caller to handle it,
        // or handle it here based on your application's needs
        throw new Error(error);
    }
}

module.exports = { uploadFileToAssistant, deleteFileFromAssistant };
