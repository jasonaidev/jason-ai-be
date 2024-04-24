// @ts-nocheck
const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const path = require('path');

/**
 * This sample illustrates how to export a PDF file to a Word (DOCX) file. The OCR processing is also performed on the input PDF file to extract text from images in the document.
 * <p>
 * Refer to README.md for instructions on how to run the samples.
 */

function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}

async function pdfToDocx(outputPath, fileName) {
    try {
        // Initial setup, create credentials instance.
        const credentials = PDFServicesSdk.Credentials
            .servicePrincipalCredentialsBuilder()
            .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
            .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
            .build();

        // Create an ExecutionContext using credentials and create a new operation instance.
        const executionContext = PDFServicesSdk.ExecutionContext.create(credentials),
            exportPDF = PDFServicesSdk.ExportPDF,
            exportPDFOperation = exportPDF.Operation.createNew(exportPDF.SupportedTargetFormats.DOCX);

        // Set operation input from a source file.
        // const input = PDFServicesSdk.FileRef.createFromLocalFile('./files/Deceased Notification Policy.pdf');
        const input = PDFServicesSdk.FileRef.createFromLocalFile(outputPath || null);
        exportPDFOperation.setInput(input);

        // Create a new ExportPDFOptions instance from the specified OCR locale and set it into the operation.
        // @ts-ignore
        const options = new exportPDF.options.ExportPDFOptions(exportPDF.options.ExportPDFOptions.OCRSupportedLocale.EN_US);
        // @ts-ignore
        exportPDFOperation.setOptions(options);

        //Generating a file name
        let outputFilePath = createOutputFilePath();

        // Execute the operation and Save the result to the specified location.
        exportPDFOperation.execute(executionContext)
            .then(result => result.saveAsFile(outputFilePath))
            .catch(err => {
                if (err instanceof PDFServicesSdk.Error.ServiceApiError
                    || err instanceof PDFServicesSdk.Error.ServiceUsageError) {
                    console.log('Exception encountered while executing operation', err);
                    throw err
                } else {
                    console.log('Exception encountered while executing operation', err);
                    throw err
                }
            });

        //Generates a string containing a directory structure and file name for the output file.
        function createOutputFilePath() {
            let date = new Date();
            let dateString = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" +
                ("0" + date.getDate()).slice(-2) + "T" + ("0" + date.getHours()).slice(-2) + "-" +
                ("0" + date.getMinutes()).slice(-2) + "-" + ("0" + date.getSeconds()).slice(-2);
            // return ("public/files/ExportPDFWithOCROptions/export" + dateString + ".docx");
            // return ("public/files/export" + dateString + ".docx");
            const fileNameWithoutExtension = removeFileExtension(fileName);

            return (`public/files/templates/${fileNameWithoutExtension}.docx`);
        }

        let basePath = path.resolve(__dirname, '../../'); // Adjust based on your file's location
        let absolutePath = path.join(basePath, outputFilePath);


        // Return the output file path
        return absolutePath;

    } catch (err) {
        console.log('Exception encountered while executing operation', err);
        throw err;
    }
}

module.exports = { pdfToDocx }