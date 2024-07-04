const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { fetchAssistantResponse } = require("./chatModules");

const dataExtraction = async (/** @type {any} */ uploadedFileId, /** @type {any} */ fileExt) => {

    const excelFile = ['.xlsx', '.csv', '.ods', '.xls'].includes(fileExt)
    const paramsForInfoExtraction = {
        inputmessage: `
            Review the ${excelFile ? fileExt : ""} document identified by ID: ${uploadedFileId}. Your task is to identify and extract the following details:

            - **Title:** The main title of the document.
            - **Company Name:** The full name of the company mentioned in the document.
            - **Company Abbreviations:** Any abbreviations used for the company name within the document.
            - **Company Email:** The email address associated with the company mentioned in the document.

            Ensure the extracted information is precise and clearly presented. Do not include any irrelevant information or annotations. If multiple instances are found, provide all relevant occurrences.

            You should always return the extracted information in the following format:
            
            title: Extracted Title
            companyName: Extracted Company Name
            companyAbbreviations: ["Extracted Company Abbreviations",]
            companyEmail: Extracted Company Email

            Note: Always give the result in the above format only. Do not provide anything else.

        `,
        fileId: uploadedFileId,
        code_interpretor: excelFile,
    }


    const threadId = await CreateThread(paramsForInfoExtraction);

    if (threadId === null) {
        throw new Error('ThreadId is null');
    }

    const runId = await RunAssistant(threadId, paramsForInfoExtraction.inputmessage, true);

    if (runId === null) {
        throw new Error('RunId is null');
    }


    const assistantResponse = await fetchAssistantResponse(runId, threadId, true);


    if (!assistantResponse) {
        throw new Error('Failed to fetch assistant response.');
    }

    const conversation = assistantResponse?.messagesList?.conversation;

    const extractDetailFromConversation = (/** @type {string} */ label) => {
        const regex = new RegExp(`${label}:\\s*([^\\n]*)`, 'i');
        for (const message of conversation) {
            if (message?.role === 'assistant' && message?.content) {
                const match = message.content.match(regex);
                
                if (match) {
                    return match[1].trim() || 'Not available';
                }
            }
        }
        return 'Not available';
    };    
    
    const title = extractDetailFromConversation('title');
    const companyName = extractDetailFromConversation('companyName');
    const companyAbbr = extractDetailFromConversation('companyAbbreviations');
    const companyEmail = extractDetailFromConversation('companyEmail');


    return {
        title,
        companyName,
        companyAbbr,
        companyEmail,
    };


}

module.exports = { dataExtraction }
