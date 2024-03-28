var http = require('http');
const fs = require('fs');

var CloudmersiveConvertApiClient = require('cloudmersive-convert-api-client');


async function pdfToDocx() {
    var defaultClient = CloudmersiveConvertApiClient.ApiClient.instance;

    // Configure API key authorization: Apikey
    var Apikey = defaultClient.authentications['Apikey'];
    Apikey.apiKey = "de64102e-a898-410b-9a97-9135cb8e789e"
    // Uncomment the following line to set a prefix for the API key, e.g. "Token" (defaults to null)
    //Apikey.apiKeyPrefix['Apikey'] = "Token"

    var apiInstance = new CloudmersiveConvertApiClient.ConvertDocumentApi();

    var inputFile = Buffer.from(fs.readFileSync("./m.pdf").buffer); // File | Input file to perform the operation on.

    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log('API called successfully. Writing to docx file...');
            // The 'data' is the binary content of the docx file
            fs.writeFile("./output.docx", data, 'binary', function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        }
    };
    apiInstance.convertDocumentPdfToDocx(inputFile, callback);

}
module.exports = { pdfToDocx }