const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');
const { waitForFile } = require('../services/waitForFile');

// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


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

module.exports = { uploadFileToAssistant };
