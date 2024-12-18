const OpenAI = require("openai");
const { saveFile } = require("../modules/saveFile");
// @ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @param {any} threadId
 * @param {any} fileSearch
 */
async function ListMessages(threadId, fileSearch) {
  try {
    console.log("Received Thread ID: ", threadId);
    const messages = await openai.beta.threads.messages.list(threadId);

    let filenames = []; // To store filenames of saved files
    let conversations = [];
    let threadAnnotationFileId = null;
    let description = "";

    for (const message of messages.data) {
      //   console.log("-".repeat(50));
      //   console.log(`Role: ${message.role}`);

      for (let content of message.content) {
        console.log("the content:", content.text.value);
        if (content.type === "text") {
          if (
            content.text.annotations &&
            content.text.annotations.length > 0 &&
            !fileSearch
          ) {
            const annotation = content.text.annotations[0];
            // console.log(`Annotation Text: ${annotation.text}`);
            // console.log(`File ID: ${annotation?.file_path?.file_id}`);

            try {
              const annotationDataBytes = await openai.files.content(
                annotation?.file_path?.file_id
              );
              const filename = annotation.text.split("/").pop();
              const isFileSaved = await saveFile(annotationDataBytes, filename);
              //   console.log("Filename: ", filename, "Saved: ", isFileSaved);

              if (isFileSaved) {
                filenames.push(filename);
              }
              if (!threadAnnotationFileId) {
                threadAnnotationFileId = annotation.file_path.file_id; // Set top-level annotationFileId if not already set
              }
            } catch (error) {
              console.error("Error while handling file:", error);
            }
          }

          conversations.push({
            role: message.role,
            content: content.text.value,
          });

          if (message.role === "assistant") {
            const descriptionMatch = content.text.value.match(
              /Description:\s*"(.+?)"/
            );
            if (descriptionMatch) {
              description = descriptionMatch[1].trim();
            } else if (content.text.value.includes("Description:")) {
              description = content.text.value.split("Description:")[1].trim();
            }
          }
        }
      }
    }

    // Structure the final output
    const messagesList = {
      threadId: threadId,
      conversation: conversations,
      annotationFileId: threadAnnotationFileId,
    };
    // Return after all processing is done
    return { messagesList, filenames, description };
  } catch (error) {
    console.error("Error at ListMessages API:", error);
    throw new Error(error);
  }
}

module.exports = { ListMessages };
