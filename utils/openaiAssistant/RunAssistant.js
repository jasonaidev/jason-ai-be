const OpenAI = require('openai');
// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @param {any} threadId
 * @param {any} instructions
 * @param {any} file_search
 */
async function RunAssistant(threadId, instructions, file_search) {

    try {

        const assistantId = process.env.DOCUMENT_GENERATOR_OPENAI_ASSISTANT_ID
        const dataExtractionAssistantId = process.env.DOCUMENT_INFORMATION_EXTRACTION_OPENAI_ASSISTANT_ID


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: file_search ? dataExtractionAssistantId : assistantId,
            // additional_instructions: instructions
        });

        // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
        console.log(`run: ${JSON.stringify(run)}`);

        // Responding with the run ID in JSON format. This ID can be used for further operations
        // such as retrieving the run's output or continuing the conversation.
        return run.id
    } catch (error) {
        console.error('Error at RunAssistant Api:', error);
        throw new Error(error);
    }

}

module.exports = { RunAssistant }