const { CreateThread } = require("../openaiAssistant/CreateThread");
const { RunAssistant } = require("../openaiAssistant/RunAssistant");
const { fetchAssistantResponse } = require("./chatModules");

const dataExtraction = async (
  /** @type {any} */ uploadedFileId,
  /** @type {any} */ fileExt,
  /** @type {any} */ companyname,
  /** @type {any} */ user_inputs
) => {
  const excelFile = [".xlsx", ".csv", ".ods", ".xls"].includes(fileExt);
  const paramsForInfoExtraction = {
    inputmessage: `
            Review the ${
              excelFile ? fileExt : ""
            } document identified by ID: ${uploadedFileId}. Your task is to identify and extract the following details:

            - **Title:** The header in the document, not the name of the document, but the header title inside the document(e.g ) the first heading (e.g G-1 Third-Party Vendor Management Component etc), the header title is normally on the first row or the first thing you see bold in the content of the document.
            - **Company Name:** The full name of the company mentioned in the document, also if there is any text like Insert company name, company name etc in the document , please add it in the array, add it in this format ([name1, name2, name3] and not like ["name1", "name2", "name3"]).
            - **Company Abbreviations:** Every company abbreviations used for the The full name of the company mentioned in the document(which you extracted earlier) within the document, (both uppercase and lowercase, for example if there is iCW and ICW for iCreditWorks, add both to it (iCW, ICW) etc), make sure it is an abbreviation of the company name(and also not a number), if you realise it is not an abberviation of the company name you extracted then do not add it to the array, if you did not extract any company name then return an empty array, add it in this format([name1, name2, name3] and not like ["name1", "name2", "name3"]).
            - **Company Email:** The email address associated with the company mentioned in the document, or if there is any text/placeholders like insert company email, company email etc, put it in the array, add it in this  format ([name1, name2, name3] and not like ["name1", "name2", "name3"]) .
            - **description:** description of the file, do not include the company name/email/title, just give a 50 word description of the file(document identified by ID: ${uploadedFileId})
            - **User Abbreviation:** Generate an abbreviation for this ${companyname}, make it two/three letter words, make sure the abbreviation is taken from this "${companyname}" .
            - **User Information:** Extract relevant context from user_inputs : (${user_inputs}) based on context. For each piece of relevant information, create an object with 'info' containing the extracted context from user_inputs, and 'docs' containing the related content from the document identified by ID: ${uploadedFileId}. Return this as an array of objects.
            Ensure the extracted information is precise and clearly presented. Do not include any irrelevant information or annotations. If multiple instances are found, provide all relevant occurrences.

            You should always return the extracted information in the following format:
            
            title: Extracted Title
            companyName: [Extracted Company Name (should be in an array)]
            companyAbbreviations: [Extracted Company Abbreviations]
            companyEmail: [Extracted Company Email (should be in an array)]
            description: Extracted Description  
            userAbb : Extracted User Abbreviation
            otherInfo: [{"info": "extracted context from user_inputs", "docs": "related extracted content from the document identified by ID: ${uploadedFileId}"}]

            Note: Always give the result in the above format only. Do not provide anything else.
        `,
    fileId: uploadedFileId,
    file_search: !excelFile,
  };

  const threadId = await CreateThread(paramsForInfoExtraction);

  if (threadId === null) {
    throw new Error("ThreadId is null");
  }

  const runId = await RunAssistant(
    threadId,
    paramsForInfoExtraction.inputmessage,
    true
  );

  if (runId === null) {
    throw new Error("RunId is null");
  }

  const assistantResponse = await fetchAssistantResponse(runId, threadId, true);

  if (!assistantResponse) {
    throw new Error("Failed to fetch assistant response.");
  }

  const conversation = assistantResponse?.messagesList?.conversation;

  const extractDetailFromConversation = (/** @type {string} */ label) => {
    const regex = new RegExp(`${label}:\\s*([^\\n]*)`, "i");
    for (const message of conversation) {
      if (message?.role === "assistant" && message?.content) {
        const match = message.content.match(regex);

        if (match) {
          return match[1].trim() || "Not available";
        }
      }
    }
    return "Not available";
  };

  const title = extractDetailFromConversation("title");
  const companyName = extractDetailFromConversation("companyName");
  const companyAbbr = extractDetailFromConversation("companyAbbreviations");
  const companyEmail = extractDetailFromConversation("companyEmail");
  const description = extractDetailFromConversation("description");
  const userAbb = extractDetailFromConversation("userAbb");
  const otherInfo = JSON.parse(extractDetailFromConversation("otherInfo"));
  return {
    title,
    companyName,
    companyAbbr,
    companyEmail,
    description,
    userAbb,
    otherInfo,
  };
};

module.exports = { dataExtraction };
