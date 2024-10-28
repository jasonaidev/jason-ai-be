const OpenAI = require("openai");
// @ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function CheckFileStatus(file_id) {
  let status = false;
  const maxRetries = 50; // Set your desired maximum number of retries
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // Retrieve the file status from the API
      const file = await openai.files.retrieve(file_id);

      // Log the file status
      console.log("Current file status:", file.status);

      // Check if the status is "processed"
      if (file.status === "processed") {
        console.log("File is processed.");
        status = true;
        break; // Exit the loop if the status is "processed"
      }

      // Wait for 2 seconds before checking again
      await delay(2000);
    } catch (error) {
      // Handle any errors that occur during the file status retrieval
      console.error("Error retrieving file status:", error);
      // Break the loop if there's an error, or choose to retry based on your needs
    }

    attempt++; // Increment the attempt counter

    // Log retry attempt
    console.log(`Retry attempt: ${attempt}`);
  }

  if (!status) {
    console.log("Max retries reached. File is not processed.");
  }

  return status;
}

// Call the function with the file_id

module.exports = { CheckFileStatus };
