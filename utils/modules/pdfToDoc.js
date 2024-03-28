const { PdfApi } = require("asposepdfcloud");
const fs = require('fs');
const path = require('path');

// Initialize the PdfApi with your credentials
const pdfApi = new PdfApi('838c9a91-4095-47d2-a31c-b01ce71d1053', '59db3f60a564742443d90c678040bbf5');

/**
 * Converts a PDF file to a DOC file.
 * @param {string} fileName - The name of the file to convert.
 * @returns {Promise<boolean>} - Returns true if conversion is successful, otherwise false.
 */
async function pdfToDoc(fileName) {
    const directoryPath = path.join(__dirname, '../../public', 'files');
    const filePath = path.join(directoryPath, fileName);
    const entryPath = `${fileName}`;
    const resultName = `${fileName}.doc`;
    const resultPath = 'output/' + resultName;
    const storageName = 'mystorage';
    const outputDirectoryPath = path.join(__dirname, '../../public', 'convertedFiles');
    const fileToWrite = path.join(outputDirectoryPath, resultName);

    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Source file does not exist at path: ${filePath}`);
        }

        const data = fs.readFileSync(filePath);
        await pdfApi.uploadFile(entryPath, Buffer.from(data), storageName);
        await pdfApi.putPdfInStorageToDoc(entryPath, resultPath, null, null, null, null, null, null, null, null, null, storageName);
        const fileData = await pdfApi.downloadFile(resultPath, storageName, '');

        if (!fs.existsSync(outputDirectoryPath)) {
            fs.mkdirSync(outputDirectoryPath, { recursive: true });
        }

        fs.writeFileSync(fileToWrite, fileData.body);
        console.log('PDF converted to DOC successfully');
        return true; // Conversion successful
    } catch (error) {
        console.error('An error occurred:', error.message);
        return false; // Conversion failed
    }
}

module.exports = { pdfToDoc };
