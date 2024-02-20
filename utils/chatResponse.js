const { createRequire } = require('module');
const requireESM = createRequire(require.main.filename);

const { createChatEngine } = require("./engine/index.js");

/**
 * @param {{ query: any; chat_history: any; }} req
 */
async function condenseChatEngine(req) {

  try {

    let OpenAI;

    try {
      const llamaindexModule = requireESM("llamaindex");
      OpenAI = llamaindexModule.OpenAI;
    } catch (error) {
      console.error("Error loading llamaindex:", error);
      // Handle the error or return a default value
    }


    const { query, chat_history } = req;
    console.log("Receive Query at ChatController file: ", query);

    // Parse chat history into the role and content format fot chat engine.
    const messages = [];

    chat_history?.length > 0 && chat_history.forEach((/** @type {{ user_message: string; assistant_message: string; }} */ item) => {
      // Add user message to chat history
      if (item.user_message) {
        messages.push({
          role: "user",
          content: item.user_message,
        });
      }

      // Add assistant message to chat history
      if (item.assistant_message) {
        messages.push({
          role: "assistant",
          content: item.assistant_message,
        });
      }
    });




    const llm = new OpenAI({
      model: process.env.MODEL || "gpt-3.5-turbo",
    });

    const chatEngine = await createChatEngine(llm);

    // Calling LlamaIndex's ChatEngine to get a response
    const response = await chatEngine.chat({
      message: query,
      chatHistory: messages
    });


    const result = {
      user_message: query,
      assistant_message: response.response,
    }

    return result;

  } catch (error) {
    console.error("[LlamaIndex]", error);
    return (error).message
  }
};


module.exports = { condenseChatEngine };
