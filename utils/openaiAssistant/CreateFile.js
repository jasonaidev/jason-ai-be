const fs = require('fs');
const OpenAI = require('openai');
const path = require('path');

// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function createFile(filePath) {
    try {
        // const filePath = path.join(__dirname, '../../files/AnnualReviewTemplate.docx');

        // Ensure the file exists before attempting to upload
        if (fs.existsSync(filePath)) {
            console.log('The file exists.');
        } else {
            console.log('The file does not exist.');
        }

        const file = await openai.files.create({
            file: fs.createReadStream(filePath),
            purpose: "assistants",
        });

        // Optionally, log success message with file details
        console.log("File uploaded successfully:", file);

        return file.id;
    } catch (error) {
        // Log the error for debugging purposes
        console.error("Failed to create file:", error.message);

        // Re-throw the error if you want the caller to handle it,
        // or handle it here based on your application's needs
        throw error;
    }
}

module.exports = { createFile };
