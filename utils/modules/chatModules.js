
 const { CheckRunStatus } = require("../openaiAssistant/CheckRunStatus")
 const { ListMessages } = require("../openaiAssistant/ListMessages")


/**
 * @param {any} runId
 * @param {any} threadId
 * @param {any} fileSearch
 */
async function fetchAssistantResponse(runId, threadId, fileSearch) {
  try {
    if (runId) {

      const startTime = Date.now(); // Get the current time at the start
      let status;
      let fetchCount = 0; // Number of fetches so far
      const maxFetches = 10; // Maximum number of fetches
      do {
        const params = {
          threadId: threadId,
          runId: runId
        }
        const statusData = await CheckRunStatus(params);
        status = statusData.status;
        fetchCount++; // Increment the fetch count
        console.log("status+++++++++++++", status);

        if (status === 'cancelled' || status === 'cancelling' || status === 'failed' || status === 'expired') {
          throw new Error(status);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Polling delay
      } while (status !== 'completed');
    }


    const response = await ListMessages(threadId, fileSearch);
    return response;
    
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw the error after setting the status message
    }
    throw error; // Re-throw the error if it's not an instance of Error
  }
};

module.exports = { fetchAssistantResponse }
