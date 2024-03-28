const { fetchAssistantResponse } = require("../modules/chatModules");
const { downloadFile } = require("../modules/downloadFile");
const { fileUpload } = require("../modules/fileUpload");
const { pdfToDoc } = require("../modules/pdfToDoc");
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

        // const res = await pdfToDoc('m.pdf')

        // console.log("RES: ", res);

        // return 'abc'

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
        const outputPath = path.join(__dirname, `../../public/files/${fileName}`);

        // const outputPath = path.join(__dirname, `../../public/files/Deceased Notification Policy.pdf`);


        const fileStatus = await downloadFile(fileUrl, outputPath);

        if (!fileStatus) {
            throw new Error('Failed to download file.');
        }

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
            Please utilize the document identified by ID: *${uploadedFileId}*, applying it as a template of the type ${selectedTemplate?.type || "Annual Review Template"}. Your tasks are outlined as follows:

            1. Conduct a thorough, word-by-word analysis to fully grasp the document's content.
            2. Upon achieving a comprehensive understanding, you are to update the document in accordance with the given user prompts.

            User Instructions for Updates:
            - Title: ${data?.title}
            - Company Name: ${data?.companyName}
            - Email: ${data?.email}

            Wherever it seems appropriate within the document, these user instructions should be incorporated or used to replace existing information.

            It is essential to retain the original design, style, font, and format of the document.

            Note: The document is provided in the ${selectedTemplate?.file?.ext} format. You are tasked with generating a new document in the same ${selectedTemplate?.file?.ext} format, ensuring that the format, design, style, and font are consistently maintained.
            `,

            // inputmessage: `
            // This document is in pdf, you should convert it into docx and then made some changes to company name as 2029 W Policy Company.
            // Then you should convert that document to pdf again with same design and format as it is original.
            // Please make that design and format should not disturb.
            // `,

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
        const { data } = req;
        await strapi.entityService.delete('api::document.document', data.id)

        throw error;
    }
};


module.exports = { createDocument };
