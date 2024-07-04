const { fetchAssistantResponse } = require("../modules/chatModules");
const { dataExtraction } = require("../modules/dataExtraction");
const { downloadFile } = require("../modules/downloadFile");
const { fileParser } = require("../modules/fileParser");
const { fileUpload, deleteFile } = require("../modules/fileUpload");
const { pdfToDocx } = require("../modules/pdfToDocx");
const { uploadFileToAssistant } = require("../openaiAssistant/CreateFile");
const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant");
const { queryToOpenAi } = require("./ai");
const { JSONLoader } = require("langchain/document_loaders/fs/json");
const path = require('path');
const { SystemPrompt } = require("../prompt");

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

        const fileUrl = selectedTemplate?.file?.url;
        const fileName = selectedTemplate?.file?.name;
        const fileExt = selectedTemplate?.file?.ext

        const outputPath = path.join(__dirname, `../../public/files/templates/${fileName}`);


        const fileStatus = await downloadFile(fileUrl, outputPath);

        if (!fileStatus) {
            throw new Error('Failed to download file.');
        }


        let filePath = fileExt?.includes('.pdf') ? await pdfToDocx(outputPath, fileName) : outputPath;

        console.log("FILE EXT: ", fileExt, fileExt?.includes('.pdf'), filePath);

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
        if (data?.file) {

            const currentDocumentFile = await strapi.db.query('plugin::upload.file').findOne({
                where: {
                    id: data?.file
                },
            })

            user_inputs = await fileParser(currentDocumentFile?.url)

            console.log("user_inputs Text: ", user_inputs.slice(0, 50));
        }


        const extractedDataFromDocument = await dataExtraction(uploadedFileId, fileExt);

        const params = {
            inputmessage: SystemPrompt(uploadedFileId, data, fileExt, fileName, selectedTemplate, user_inputs, extractedDataFromDocument),
            fileId: uploadedFileId,
            fileExt: fileExt
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

        // console.log("assistantResponse++++: ", assistantResponse);

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
                description: assistantResponse?.description,
                updatedAt: new Date()
            },
            populate: '*'
        });

        console.log("Entry Saved into the DB+++ ", entry);


        // Delete Files
        await deleteFile(assistantResponse?.filenames)


        return entry

    } catch (error) {
        console.error("Error at Create Document:++ ", error);
        const { data } = req;
        await strapi.entityService.delete('api::document.document', data.id)

        throw error;
    }
};


module.exports = { createDocument };
