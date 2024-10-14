// @ts-nocheck

const {
  OpenAIAgent,
  VectorStoreIndex,
  QueryEngineTool,
  OpenAI,
  PineconeVectorStore,
  serviceContextFromDefaults,
} = require("llamaindex");

const { Pinecone } = require("@pinecone-database/pinecone");


/**
 * @param {{ query: string; chat_history: any[]; }} req
 */
async function condenseChatEngine(req) {

  try {

    // Create an OpenAI instance with the gpt-4 model
    const llm = new OpenAI({
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { query, chat_history } = req;
    // console.log("Receive Query at ChatController file: ", query);

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


    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || "",
    });

    const pcvs = new PineconeVectorStore();

    const ctx = serviceContextFromDefaults();

    const index = await VectorStoreIndex.fromVectorStore(pcvs, ctx);

    const queryEngine = await index.asQueryEngine();


    // Create a QueryEngineTool with the query engine
    const queryEngineTool = new QueryEngineTool({
      queryEngine: queryEngine,
      metadata: {
        name: "policy_query_engine",
        description: "A query engine for Policy documents",
      },
    });

    // Create an OpenAIAgent with the function tools
    const agent = new OpenAIAgent({
      tools: [queryEngineTool],
      verbose: true,
      llm: llm,
    });

    // Chat with the agent
    const response = await agent.chat({
      message: query,
      chatHistory: messages,
    });

    // Print the response
    // console.log("Response of the BOT+++++: ", String(response));

    const result = {
      user_message: query,
      assistant_message: String(response),
    }

    return result;

  } catch (error) {
    console.error("[LlamaIndex]", error);
    return (error).message
  }
};


module.exports = { condenseChatEngine };
