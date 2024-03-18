const OpenAI = require('openai');
// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function RunAssistant(threadId) {

    try {

        const assistantId = "asst_lfYyN7NN6tPMGZkHeXSlJqDh"


        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
        console.log(`run: ${JSON.stringify(run)}`);

        // Responding with the run ID in JSON format. This ID can be used for further operations
        // such as retrieving the run's output or continuing the conversation.
        return run.id
    } catch (error) {
        console.error('Error at RunAssistant Api:', error);
        throw error;
    }

}

module.exports = { RunAssistant }