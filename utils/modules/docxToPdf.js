// @ts-nocheck

const path = require('path');

const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');

/**
 * This sample illustrates how to create a PDF file from a DOCX file.
 * <p>
 * Refer to README.md for instructions on how to run the samples.
 */


function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}


async function docxToPdf(outputPath, fileName) {
    let fileNameWithoutExtension;

    try {
        // Initial setup, create credentials instance.
        const credentials = PDFServicesSdk.Credentials
            .servicePrincipalCredentialsBuilder()
            .withClientId(process.env.PDF_SERVICES_CLIENT_ID)
            .withClientSecret(process.env.PDF_SERVICES_CLIENT_SECRET)
            .build();

        // Create an ExecutionContext using credentials and create a new operation instance.
        const executionContext = PDFServicesSdk.ExecutionContext.create(credentials),
            createPdfOperation = PDFServicesSdk.CreatePDF.Operation.createNew();

        // Set operation input from a source file.
        const input = PDFServicesSdk.FileRef.createFromLocalFile(outputPath);
        createPdfOperation.setInput(input);

        //Generating a file name
        let outputFilePath = createOutputFilePath();

        // Execute the operation and Save the result to the specified location.
        createPdfOperation.execute(executionContext)
            .then(result => result.saveAsFile(outputFilePath))
            .catch(err => {
                if (err instanceof PDFServicesSdk.Error.ServiceApiError
                    || err instanceof PDFServicesSdk.Error.ServiceUsageError) {
                    console.log('Exception encountered while executing operation', err);
                } else {
                    console.log('Exception encountered while executing operation', err);
                }
            });

        //Generates a string containing a directory structure and file name for the output file.
        function createOutputFilePath() {
            let date = new Date();
            // let dateString = date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" +
            //     ("0" + date.getDate()).slice(-2) + "T" + ("0" + date.getHours()).slice(-2) + "-" +
            //     ("0" + date.getMinutes()).slice(-2) + "-" + ("0" + date.getSeconds()).slice(-2);
            // return ("public/files/CreatePDFFromDOCX/create" + dateString + ".pdf");
            fileNameWithoutExtension = removeFileExtension(fileName);

            return (`public/files/outputs/${fileNameWithoutExtension}.pdf`);

        }

        let basePath = path.resolve(__dirname, '../../'); // Adjust based on your file's location
        let absolutePath = path.join(basePath, outputFilePath);


        // Return the output file path
        return { path: absolutePath, updatedFileName: `${fileNameWithoutExtension}.pdf` };
    } catch (err) {
        console.log('Exception encountered while executing operation', err);
        throw err;
    }

}

module.exports = { docxToPdf }