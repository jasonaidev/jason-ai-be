const OpenAI = require('openai');
const { saveFile } = require('../modules/saveFile');
// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function ListMessages(threadId) {
    try {
        console.log("Received Thread ID: ", threadId);
        const messages = await openai.beta.threads.messages.list(threadId);

        let filenames = []; // To store filenames of saved files
        let conversations = [];
        let threadAnnotationFileId = null;
        let description = ''

        for (const message of messages.data) {
            console.log('-'.repeat(50));
            console.log(`Role: ${message.role}`);

            for (let content of message.content) {
                console.log(content.text.value);
                if (content.type === 'text') {
                    if (content.text.annotations && content.text.annotations.length > 0) {
                        const annotation = content.text.annotations[0];
                        console.log(`Annotation Text: ${annotation.text}`);
                        console.log(`File ID: ${annotation.file_path.file_id}`);

                        try {
                            const annotationDataBytes = await openai.files.content(annotation.file_path.file_id);
                            const filename = annotation.text.split('/').pop();
                            const isFileSaved = await saveFile(annotationDataBytes, filename);
                            console.log("Filename: ", filename, "Saved: ", isFileSaved);

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
                        content: content.text.value
                    });

                    if (message.role === 'assistant' && content.text.value.startsWith('Description:')) {
                        description = content.text.value.substring(12).trim();
                    }
                }
            }
        }

        // Structure the final output
        const messagesList = {
            threadId: threadId,
            conversation: conversations,
            annotationFileId: threadAnnotationFileId
        };
        // Return after all processing is done
        return { messagesList, filenames, description };
    } catch (error) {
        console.error('Error at ListMessages API:', error);
        throw new Error(error);
    }
}


module.exports = { ListMessages }