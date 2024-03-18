const { createRequire } = require('module');
const requireESM = createRequire(require.main.filename);

// const { SimpleChatEngine, CondenseQuestionChatEngine } = require("llamaindex");

/**
 * @param {any} llm
 */
async function createChatEngine(llm) {

  let SimpleChatEngine;

  try {
    const llamaindexModule = requireESM("llamaindex");
    SimpleChatEngine = llamaindexModule.SimpleChatEngine;
  } catch (error) {
    console.error("Error loading llamaindex SimpleChatEngine:", error);
  }

  return new SimpleChatEngine({
    llm,
  });
}



module.exports = { createChatEngine };
