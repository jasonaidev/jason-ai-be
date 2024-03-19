const OpenAI = require('openai');
const { saveFile } = require('../modules/saveFile');
// @ts-ignore
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


async function ListMessages(threadId) {
    try {
        console.log("Receive Thread: ", threadId);
        const messages = await openai.beta.threads.messages.list(threadId);

        let filenames = []; // To store filenames of saved files
        let messagesList = [];

        for (const message of messages.data) {
            console.log('-'.repeat(50));
            console.log(`Role: ${message.role}`);

            for (let content of message.content) {
                console.log(content.text.value);
                if (content.type === 'text') {
                    if (content.text.annotations) {
                        for (let annotation of content.text.annotations) {
                            console.log(`Annotation Text: ${annotation.text}`);
                            console.log(`File_Id: ${annotation.file_path.file_id}`);

                            try {
                                const annotationDataBytes = await openai.files.content(annotation.file_path.file_id);
                                const filename = annotation.text.split('/').pop();

                                const isFileSaved = await saveFile(annotationDataBytes, filename);
                                console.log("filename: ", filename, isFileSaved);

                                if (isFileSaved) {
                                    filenames.push(filename);
                                }
                                // Moved adding to messagesList outside if-else since it's done in both cases
                                messagesList.push({
                                    threadId: message.thread_id,
                                    role: message.role,
                                    content: content.text.value,
                                    annotationFileId: annotation.file_path.file_id
                                });
                            } catch (error) {
                                console.error("Error before calling saveFile", error);
                                // Consider how you want to handle this error. Continue, break, return?
                            }
                        }
                    }
                }
            }
        }
        // Return after all processing is done
        return { messagesList, filenames };
    } catch (error) {
        console.error('Error at ListMessages API:', error);
        throw new Error(error);
    }
}


module.exports = { ListMessages }