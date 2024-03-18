// const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
// const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

// const { OpenAI } = require("langchain/llms/openai");
const { OpenAI } = require("@langchain/openai")
const { loadQAStuffChain } = require("langchain/chains");
// const { Document } = require("langchain/document");

const queryToOpenAi = async (
    /** @type {any} */ question,
    /** @type {any} */ docs,
    // modelName = "gpt-4-turbo-preview"
    modelName = "gpt-4"
  ) => {
    console.log("Ai.js file is working here+++++++");
    console.log("Prompt: ", question);

    const llm = new OpenAI({ modelName, temperature: 0.4 });
  
    const chain = loadQAStuffChain(llm);
  
    const result = await chain._call({
      input_documents: docs,
      question: question,
      options: {
        max_tokens: 10000,
      },
    });

    // console.log("Result: ", result);
  
    return result.text;
  };


  module.exports = { queryToOpenAi }