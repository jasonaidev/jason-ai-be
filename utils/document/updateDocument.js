const { fetchAssistantResponse } = require("../modules/chatModules");
const { downloadFile } = require("../modules/downloadFile");
const { fileParser } = require("../modules/fileParser");
const { fileUpload, deleteFile } = require("../modules/fileUpload");
const { pdfToDocx } = require("../modules/pdfToDocx");
const { uploadFileToAssistant, deleteFileFromAssistant } = require("../openaiAssistant/CreateFile");
const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { updateAssistant } = require("../openaiAssistant/UpdateAssistant");
const path = require('path');

// @ts-ignore
/**
 * @param {{ data: any; }} req
 */
async function updateDocument(req) {
    try {
        const { data } = req;
        console.log("Receive Query Params for Update+++: ", data);

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
            Effectuate the following:

                1. Conduct a thorough, word-by-word analysis of the document identified by ID: *${uploadedFileId}* to fully grasp its content.
                
                2. Update the document based on the given user inputs while retaining the original design, style, font, and format.

                **User Instructions for Updates:**
                - **Title:** ${data?.title} (Maintain same font size and style)
                - **Company Name:** ${data?.companyName} (Replace wherever found in the document)
                - **Email:** ${data?.email} (Replace wherever found in the document)
                - **Additional User Inputs:** ${data?.file ? user_inputs : ''}

                3. Ensure that the format, design, style, and font are consistently maintained. Produce the updated document in the same ${fileExt?.includes('.pdf') ? 'docx' : selectedTemplate?.file?.ext} format. The new file name should be: ${removeFileExtension(fileName) + '_user_' + data?.user}.

                4.Generate a 50-word description of the newly updated document in a separate message based solely on the content within the document. Do not mention the title, filename, or company name. 
                    Message format as follows:
                    Description: "start description here".

                **Clarifying Notes:**
                - Follow the exact update instructions provided by the user.
                - Ensure every modification adheres strictly to the original format specifics.

                If any step or instruction needs further detail or there are uncertainties, refer back for clarification.
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


        // Delete Files
        await deleteFileFromAssistant(data?.openAiFileId)

        await deleteFile(assistantResponse?.filenames)

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


module.exports = { updateDocument };
