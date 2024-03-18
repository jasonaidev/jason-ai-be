const { fetchAssistantResponse } = require("../modules/chatModules");
const { downloadFile } = require("../modules/downloadFile");
const { fileUpload } = require("../modules/fileUpload");
const { createFile } = require("../openaiAssistant/CreateFile");
const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant");
const { queryToOpenAi } = require("./ai");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const path = require('path');


// @ts-ignore
async function createDocument(req) {

    try {
        const { data } = req;
        console.log("Receive Query Params: ", data);


        const selectedTemplate = await strapi.db.query('api::policy-template.policy-template').findOne({
            data: {
                where: { id: data.template }
            },
            populate: true
        })

        if (!selectedTemplate || !selectedTemplate.file || !selectedTemplate.file.url) {
            throw new Error('Template or file URL not found.');
        }

        // Example usage:
        const fileUrl = selectedTemplate?.file?.url;
        const fileName = selectedTemplate?.file?.name;
        const outputPath = path.join(__dirname, `../../files/${fileName}`);


        const fileStatus = await downloadFile(fileUrl, outputPath);


        if (!fileStatus) {
            throw new Error('Failed to download file.');
        }


        // let uploadedFileId = null;

        // if (fileStatus) {
        //     uploadedFileId = await createFile(outputPath)
        // }


        const uploadedFileId = await createFile(outputPath);
        if (!uploadedFileId) {
            throw new Error('Failed to upload file to OpenAI.');
        }


        const assistant = await updateAssistant(uploadedFileId);

        if (!assistant) {
            throw new Error('Failed to update assistant with new file.');
        }


        const params = {
            inputmessage: `
            You should use the document with this id *${uploadedFileId}* as ${selectedTemplate?.type ? selectedTemplate?.type : "Annual Review Template"}. Your target is read and analyze the document word by word first and then understand it. 
            Once you understand the main topic then you should update the document by user prompts.

            In whole document where you found that this might be the company name, yo should replace it with 2029 W Policy Company. 

            Don't do matching techniques.
            You should maintain the same design, style, font and format. 
            Note: Provided document in ${selectedTemplate?.file?.ext} format. You should generate new document in ${selectedTemplate?.file?.ext} format with same format, design, style and font.
            `,

            fileId: uploadedFileId,
        };
        const threadId = await CreateThread(params);

        if (threadId === null) {
            throw new Error('ThreadId is null');
        }

        const runId = await RunAssistant(threadId);

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
            fileResponse = await fileUpload(assistantResponse?.filenames)
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
    }
};


module.exports = { createDocument };
