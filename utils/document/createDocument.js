const { fetchAssistantResponse } = require("../modules/chatModules");
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


        // const params = {
        //     inputmessage: `
        //     Please utilize the document identified by ID: *${uploadedFileId}*, applying it as a template of the type ${selectedTemplate?.type || "Annual Review Template"}. Your tasks are outlined as follows:

        //     1. Conduct a thorough, word-by-word analysis to fully grasp the document's content.
        //     2. Upon achieving a comprehensive understanding, you are to update the document in accordance with the given user prompts.

        //     User Instructions for Updates:
        //     - Title: ${data?.title} (Should be same font size and style)
        //     - Company Name: ${data?.companyName} (Replace it wherever found throughout the document)
        //     - Email: ${data?.email} (Replace it wherever found throughout the document)

        //     ${data?.file && user_inputs ? `-${user_inputs}` : ''}
        //     Wherever it seems appropriate within the document, these user instructions should be incorporated or used to replace existing information.

        //     It is essential to retain the original design, style, font, and format of the document.

        //     Note: The document is provided in the ${fileExt?.includes('.pdf') ? 'docx' : selectedTemplate?.file?.ext} format. You are tasked with generating a new document in the same ${fileExt?.includes('.pdf') ? 'docx' : selectedTemplate?.file?.ext} format, ensuring that the format, design, style, and font are consistently maintained and newly file named should be as ${removeFileExtension(fileName) + '_user_' + data?.user}

        //     Additionally, generate a 50 word description of the newly generated document in a separate message as follows:
        //     Description: "start description here". Just write the description based on the information found within the document only. Please don't mention information about the title, filename and company of the document.
        //     `,

        //     fileId: uploadedFileId,
        // };

        // Updated Prompt but Not working 
        // const params = {
        //     inputmessage: `
        //     Please use the document identified by ID: *${uploadedFileId}* as a template (${selectedTemplate?.type || "Annual Review Template"}). Your tasks are outlined as follows:

        //     1. **Locate and Replace Title:** Find the current title of the document and update it to ${data?.title}. Ensure the new title uses the same font size and style as the original.

        //     2. **Locate and Replace Company Name:** Search for the company name throughout the entire document and replace every instance with ${data?.companyName}.

        //     3. **Locate and Replace Email:** Search for the email throughout the entire document and replace every instance with ${data?.email}.

        //     4. **Apply Additional Instructions:** ${data?.file && user_inputs ? `${user_inputs}` : ''} (Apply these changes wherever appropriate in the document).

        //     **Requirements:**

        //     - Apply the specified changes consistently throughout the document.
        //     - Preserve the original design, style, font, and format.
        //     - Save the updated document in the same format (${fileExt?.includes('.pdf') ? 'docx' : selectedTemplate?.file?.ext}).
        //     - Name the new file: ${removeFileExtension(fileName) + '_user_' + data?.user}.

        //     **Final Task:**
        //     - Additionally, generate a 50-word description of the newly generated document in a separate message as follows:
        //     Description: "start description here". Just write the description based on the information found within the document only. Please don't mention information about the title, filename, or company name of the document.
        //     `,

        //     fileId: uploadedFileId,
        // };

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


/**
 * @param {string} fileName
 */
function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}


module.exports = { createDocument };
