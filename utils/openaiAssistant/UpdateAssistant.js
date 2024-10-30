const OpenAI = require("openai");
// @ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_DEFAULT_INSTRUCTIONS = `
    The Document Generator is specialized in generating documents from different files like pdf, csv, xlsx, docx containing data.
    It helps users upload their data, analyzes it, and creates accurate document in same format, design and font with updated user prompts. 
    You will expect to take sample policy file along with input prompts.
    Your task is to analyze the provided policy sample, incorporate the user-inputted prompts, and generate a document with same formatting, design, and font. 
    You should ensure that the resulting document maintains the same design, format, and styling as the original.
    `;
const ASSISTANT_NAME = "The Document Generator";
const ASSISTANT_MODEL =
  process.env.DOCUMENT_INFORMATION_EXTRACTOR_ASSISTANT_MODEL_NAME;
// const ASSISTANT_MODEL = "gpt-4o-mini"
// const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL_NAME
const ASSISTANT_ID = process.env.DOCUMENT_GENERATOR_OPENAI_ASSISTANT_ID;

// console.log("ASSISTANT_ID++++ AT UPDATE ASSISTANT FILE: ", ASSISTANT_ID);
// console.log(
//   "OPENAI_API_KEY++++ AT UPDATE ASSISTANT FILE: ",
//   process.env.OPENAI_API_KEY
// );
// const ASSISTANT_ID = "asst_8OxHJKcwydxvGTH9Y60KhVie"

/**
 * @param {any} file_id
 */
async function updateAssistant(file_id) {
  try {
    const assistantDetail = await openai.beta.assistants.retrieve(ASSISTANT_ID);

    let files = assistantDetail.tool_resources.code_interpreter.file_ids || [];

    // console.log("Purpose Assistant Files assistantDetail: ", assistantDetail);

    if (files?.length > 18) {
      // If there are more than 20 files, calculate how many excess files there are
      const excessFilesCount = files?.length - 18;

      // Remove excess files from the end of the array
      for (let i = 0; i < excessFilesCount; i++) {
        files.pop();
      }
    }

    // Push the new file_id to the end of the array
    files.push(file_id);

    // Create an assistant using the file ID
    const assistant = await openai.beta.assistants.update(ASSISTANT_ID, {
      name: ASSISTANT_NAME,
      instructions: ASSISTANT_DEFAULT_INSTRUCTIONS,
      model: ASSISTANT_MODEL,
      tools: [{ type: "code_interpreter" }],
      tool_resources: {
        code_interpreter: {
          file_ids: files,
        },
      },
    });

    // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
    // console.log(`Updated Assistant: ${JSON.stringify(assistant)}`);

    // Responding with the run ID in JSON format. This ID can be used for further operations
    // such as retrieving the run's output or continuing the conversation.
    return assistant;
  } catch (error) {
    console.error("Error at Update Assistant Api:", error.error);
    throw new Error(error);
  }
}

/**
 * @param {any} file_id
 */
async function updateAssistantForDocumentExtraction(file_id) {
  const ASSISTANT_DEFAULT_INSTRUCTIONS = `
        You are an AI assistant designed to extract specific information from documents. When provided with a document, your task is to identify and extract the following details:

        Title: The main title of the document.
        Company Name: The full name of the company mentioned in the document.
        Company Abbreviations: Any abbreviations used for the company name within the document.
        Company Email: The email address associated with the company mentioned in the document.
        Ensure that the extracted information is accurate and clearly presented. If multiple instances are found, provide all relevant occurrences. The extracted details should be formatted as follows:

        Title: [Extracted Title]
        Company Name: [Extracted Company Name]
        Company Abbreviation(s): [Extracted Company Abbreviations]
        Company Email: [Extracted Company Email]
        Example:

        Title: Online Advertising Oversight Procedure – Marketplace Lending Platform Partners
        Company Name: iCreditWorks
        Company Abbreviation(s): iCW
        Company Email: mplmarketing@crossriverbank.com

        If any of the required information is not found in the document, clearly state that it is not available.
    `;
  const ASSISTANT_NAME = "Document Information Extraction";
  const ASSISTANT_MODEL = process.env.ASSISTANT_MODEL_NAME;
  const ASSISTANT_ID =
    process.env.DOCUMENT_INFORMATION_EXTRACTION_OPENAI_ASSISTANT_ID;

  try {
    const assistantDetail = await openai.beta.assistants.retrieve(ASSISTANT_ID);

    let files = assistantDetail.tool_resources.file_search.file_ids || [];

    // console.log("Purpose Assistant Files assistantDetail: ", assistantDetail);

    if (files?.length > 18) {
      // If there are more than 20 files, calculate how many excess files there are
      const excessFilesCount = files?.length - 18;

      // Remove excess files from the end of the array
      for (let i = 0; i < excessFilesCount; i++) {
        files.pop();
      }
    }

    // Push the new file_id to the end of the array
    files.push(file_id);

    // Create an assistant using the file ID
    const assistant = await openai.beta.assistants.update(ASSISTANT_ID, {
      name: ASSISTANT_NAME,
      instructions: ASSISTANT_DEFAULT_INSTRUCTIONS,
      model: ASSISTANT_MODEL,
      tools: [{ type: "code_interpreter" }],
      tool_resources: {
        code_interpreter: {
          file_ids: files,
        },
      },

      // tools: [{ "type": "file_search" }],
      // tool_resources: {
      //     file_search: {
      //         file_ids: files
      //     }
      // }
    });

    // Logging the details of the created run for debugging. This includes the run ID and any other relevant information.
    // console.log(`Updated Assistant: ${JSON.stringify(assistant)}`);

    // Responding with the run ID in JSON format. This ID can be used for further operations
    // such as retrieving the run's output or continuing the conversation.
    return assistant;
  } catch (error) {
    console.error("Error at Update Assistant Api:", error.error);
    throw new Error(error);
  }
}

module.exports = { updateAssistant, updateAssistantForDocumentExtraction };
