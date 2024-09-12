const OpenAI = require("openai");
// @ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function CheckRunStatus(params) {
  try {
    const data = params;
    const threadId = data.threadId;
    const runId = data.runId;

    // Log the received thread ID and run ID for debugging
    // console.log(`Received request with threadId: ${threadId} and runId: ${runId}`);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Retrieve the status of the run for the given thread ID and run ID using the OpenAI API
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

    // Log the retrieved run status for debugging
    console.log(`Retrieved run status: ${runStatus.status}`);
    await delay(4000);
    return runStatus;
  } catch (error) {
    console.error("Error at Check Run Status Assistant Api:", error);
    throw new Error(error);
  }
}

module.exports = { CheckRunStatus };
