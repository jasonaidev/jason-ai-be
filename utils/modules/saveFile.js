const fs = require('fs').promises; // Correctly importing the promise-based API
const path = require('path');


/**
 * @param {{ buffer: () => any; }} dataBytes
 * @param {string} fileName
 */
async function saveFile(dataBytes, fileName) {
    const directoryPath = path.join(__dirname, '../../public/files', 'results');

    const bufferDataBytes = await dataBytes.buffer();

    // Ensure the `files` directory exists
    try {
        await fs.mkdir(directoryPath, { recursive: true });
    } catch (err) {
        console.error('An error occurred while creating the directory:', err);
        throw err; // Rethrow the error for upstream handling if necessary
    }

    const filePath = path.join(directoryPath, fileName);

    // Write the byte data to the file
    try {
        await fs.writeFile(filePath, bufferDataBytes);
        console.log(`File ${fileName} has been saved in the 'files' directory.`);
        return true; // Return true indicating the file was successfully saved
    } catch (err) {
        console.error('An error occurred while saving the file:', err);
        return false; // Return false indicating the file saving failed
    }
}


module.exports = { saveFile }
