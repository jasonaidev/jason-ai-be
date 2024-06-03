// @ts-nocheck
const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const path = require('path');

// Function to remove file extension from a filename
function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}

// Function to convert PDF to DOCX
async function pdfToDocx(outputPath, fileName) {
    try {
        // Generate output file path
        const fileNameWithoutExtension = removeFileExtension(fileName);
        const outputFilePath = `public/files/templates/${fileNameWithoutExtension}.docx`;

        // Check if the output file already exists
        if (fs.existsSync(outputFilePath)) {
            console.log('File already exists++:', outputFilePath);
            return outputFilePath; // Return the existing file path
        }

        // Adobe PDF Services credentials setup
        const credentials = PDFServicesSdk.Credentials
            .servicePrincipalCredentialsBuilder()
            .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
            .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
            .build();

        // Create an ExecutionContext using credentials
        const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

        // Create ExportPDF operation
        const exportPDFOperation = PDFServicesSdk.ExportPDF.Operation.createNew(PDFServicesSdk.ExportPDF.SupportedTargetFormats.DOCX);

        // Set operation input from a source file
        const input = PDFServicesSdk.FileRef.createFromLocalFile(outputPath || null);
        exportPDFOperation.setInput(input);

        // Execute the operation and save the result to the specified location
        const result = await exportPDFOperation.execute(executionContext);
        await result.saveAsFile(outputFilePath);

        // Log the success
        console.log('PDF converted to DOCX:', outputFilePath);

        // Return the output file path
        return outputFilePath;

    } catch (err) {
        console.log('Exception encountered while executing operation', err);
        throw err;
    }
}

module.exports = { pdfToDocx };
