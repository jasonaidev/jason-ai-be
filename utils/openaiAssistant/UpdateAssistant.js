const OpenAI = require('openai');
// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: 'org-kM1WMmVJildBGFO0a1hrZAPK'
});

const ASSISTANT_DEFAULT_INSTRUCTIONS = `
    The Document Generator is specialized in generating documents from different files like pdf, csv, xlsx, docx containing data.
    It helps users upload their data, analyzes it, and creates accurate document in same format, design and font with updated user prompts. 
    You will expect to take sample policy file along with input prompts.
    Your task is to analyze the provided policy sample, incorporate the user-inputted prompts, and generate a document with same formatting, design, and font. 
    You should ensure that the resulting document maintains the same design, format, and styling as the original.
    `
const ASSISTANT_NAME = "The Document Generator Test"
const ASSISTANT_MODEL = "gpt-4-1106-preview"
const ASSISTANT_ID = "asst_lfYyN7NN6tPMGZkHeXSlJqDh"
// const ASSISTANT_ID = "asst_8OxHJKcwydxvGTH9Y60KhVie"


/**
 * @param {any} file_id
 */
async function updateAssistant(file_id) {

    try {

        // Create an assistant using the file ID
        const assistant = await openai.beta.assistants.update(ASSISTANT_ID, {
                name: ASSISTANT_NAME,
                instructions: ASSISTANT_DEFAULT_INSTRUCTIONS,
                model: ASSISTANT_MODEL,
                tools: [{ "type": "code_interpreter" }],
                file_ids: [file_id]
        });

        // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
        console.log(`Assistant: ${JSON.stringify(assistant)}`);

        // Responding with the run ID in JSON format. This ID can be used for further operations
        // such as retrieving the run's output or continuing the conversation.
        return assistant
    } catch (error) {
        console.error('Error at Update Assistant Api:', error.error);
        throw error;
    }

}

module.exports = { updateAssistant }