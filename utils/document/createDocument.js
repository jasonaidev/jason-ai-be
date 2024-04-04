const { fetchAssistantResponse } = require("../modules/chatModules");
const { downloadFile } = require("../modules/downloadFile");
const { fileParser } = require("../modules/fileParser");
const { fileUpload } = require("../modules/fileUpload");
const { pdfToDoc } = require("../modules/pdfToDoc");
const { pdfToDocx } = require("../modules/pdfToDocx");
const { uploadFileToAssistant } = require("../openaiAssistant/CreateFile");
const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant");
const { queryToOpenAi } = require("./ai");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const path = require('path');

// @ts-ignore
/**
 * @param {{ data: any; }} req
 */
async function createDocument(req) {

    try {

        const { data } = req;
        console.log("Receive Query Params: ", data);


        const selectedTemplate = await strapi.db.query('api::policy-template.policy-template').findOne({
            where: {
                id: data?.template
            },
            populate: true
        })

        if (!selectedTemplate || !selectedTemplate.file || !selectedTemplate.file.url) {
            throw new Error('Template or file URL not found.');
        }

        console.log("selectedTemplate: ", selectedTemplate);

        // Example usage:
        const fileUrl = selectedTemplate?.file?.url;
        const fileName = selectedTemplate?.file?.name;
        const fileExt = selectedTemplate?.file?.ext

        // Fetch template details
        // const { file: { url, name, ext } } = selectedTemplate;

        const outputPath = path.join(__dirname, `../../public/files/templates/${fileName}`);


        const fileStatus = await downloadFile(fileUrl, outputPath);

        if (!fileStatus) {
            throw new Error('Failed to download file.');
        }

        
        let filePath = fileExt?.includes('.pdf') ? await pdfToDocx(outputPath, fileName) : outputPath;
        
        console.log("FILE EXT: ", fileExt, fileExt?.includes('.pdf'),  filePath);
        
        // const uploadedFileId = await uploadFileToAssistant(outputPath);
        const uploadedFileId = await uploadFileToAssistant(filePath);
        if (!uploadedFileId) {
            throw new Error('Failed to upload file to OpenAI.');
        }


        const assistant = await updateAssistant(uploadedFileId);

        if (!assistant) {
            throw new Error('Failed to update assistant with new file.');
        }

        let user_inputs;
        if(data?.file){

            const currentDocumentFile = await strapi.db.query('plugin::upload.file').findOne({
                where: {
                    id: data?.file
                },
            })

            user_inputs = await fileParser(currentDocumentFile?.url)

            console.log("user_inputs Text: ", user_inputs.slice(0, 50));
        }


        const params = {
            inputmessage: `
            Please utilize the document identified by ID: *${uploadedFileId}*, applying it as a template of the type ${selectedTemplate?.type || "Annual Review Template"}. Your tasks are outlined as follows:

            1. Conduct a thorough, word-by-word analysis to fully grasp the document's content.
            2. Upon achieving a comprehensive understanding, you are to update the document in accordance with the given user prompts.

            User Instructions for Updates:
            - Title: ${data?.title}
            - Company Name: ${data?.companyName}
            - Email: ${data?.email}

            ${data?.file && user_inputs ? `-${user_inputs}` : ''}
            Wherever it seems appropriate within the document, these user instructions should be incorporated or used to replace existing information.

            It is essential to retain the original design, style, font, and format of the document.

            Note: The document is provided in the ${fileExt?.includes('.pdf') ? 'docx' : selectedTemplate?.file?.ext} format. You are tasked with generating a new document in the same ${fileExt?.includes('.pdf') ? 'docx'  :selectedTemplate?.file?.ext} format, ensuring that the format, design, style, and font are consistently maintained and newly file named should be as ${removeFileExtension(fileName) + '_user_' + data?.user}
            `,

            fileId: uploadedFileId,
        };
        const threadId = await CreateThread(params);

        if (threadId === null) {
            throw new Error('ThreadId is null');
        }

        const runId = await RunAssistant(threadId, params.inputmessage);

        if (runId === null) {
            throw new Error('RunId is null');
        }


        const assistantResponse = await fetchAssistantResponse(runId, threadId);

        console.log("assistantResponse++++: ", assistantResponse);

        if (!assistantResponse) {
            throw new Error('Failed to fetch assistant response.');
        }

        let fileResponse;
        if (assistantResponse?.filenames?.length > 0) {
            fileResponse = await fileUpload(assistantResponse?.filenames, fileExt)
        }

        console.log("Res of Upload: ", fileResponse);

        if (!fileResponse) {
            throw new Error('Failed to upload file response or invalid response ID.');
        }

        const entry = await strapi.entityService.update('api::document.document', data.id, {
            data: {
                file: fileResponse?.id,
                conversation: assistantResponse?.messagesList,
                updatedAt: new Date()
            },
            populate: '*'
        });

        console.log("Entry Saved into the DB+++ ", entry);

        return entry

    } catch (error) {
        console.error("Error at Create Document:++ ", error);
        // const { data } = req;
        // await strapi.entityService.delete('api::document.document', data.id)

        throw error;
    }
};


/**
 * @param {string} fileName
 */
function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}


module.exports = { createDocument };
