const OpenAI = require('openai');
// @ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @param {any} params
 */
async function CreateThread(params) {

  try {
    const data = params;
    const inputMessage = data?.inputmessage;
    const file_id = data?.fileId
    const file_search = data?.file_search

    // Überprüfen, ob die Eingabemessage vorhanden und ein String ist
    if (!inputMessage || typeof inputMessage !== 'string') {
      throw new Error('inputmessage is missing or not a string');
    }


    // Thread erstellen
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: inputMessage,
          attachments: [{ file_id: file_id, tools: [{ type: file_search ? "file_search" : "code_interpreter" }] }],
        },
      ],
    });
    const threadId = thread.id;
    console.log('Thread ID:', threadId);

    return threadId
  } catch (error) {
    console.error('Error at CreateThread Api:', error);
    throw new Error(error);

  }

}

module.exports = { CreateThread }