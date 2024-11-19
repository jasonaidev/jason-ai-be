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

            this is the user's company name : ${companyname}

            - Title: The header in the document, not the name of the document, but the header title inside the document(e.g ) the first heading (e.g G-1 Third-Party Vendor Management Component etc), the header title is normally on the first row or the first thing you see bold in the content of the document, also the title of the document should be standalone, for example if you see something like this "Compliance Training Component – Marketplace Lending Platform Partnership", then the title is "Complaince Training Component", the extension( '– Marketplace Lending Platform Partnership') should not be considered, also a tip, if it is an excel file(csv, xlsx) the title is usually in bold in the first row,row 1, for example in row 1 there can be "Military Lending Act Compliance Audit", that would be the title. ".
            - Company Name: The full name of the company mentioned in the document, also if there is any text like Insert company name, company name etc in the document , please add it in the array,  add it in this format ([companyName] and not like ["companyName"]), it should just contain one element in the array.
            - Company Abbreviation: The Company abbreviation used for the The full name of the company mentioned in the document(which you extracted earlier) within the document, (both uppercase and lowercase, for example if there is iCW and ICW for iCreditWorks, add both to it (iCW, ICW) etc), make sure it is an abbreviation of the company name(and also not a number), for example MPL cannot be an abbreviation of the company name iCreditWorks(so MPL should not be added), if you realise it is not an abberviation of the company name you extracted then do not add it to the array, if you did not extract any company name(or if you do not see any company name in the document) then return an empty array for abbreviation(if company name(which you extracted) is an empty array then company abbreviation should also be an empty array), add it in this format([name1, name2, name3] and not like ["name1", "name2", "name3"]).
            - Company Email: The email address associated with the company mentioned in the document, or if there is any text/placeholders like insert company email, company email etc, put it in the array, add it in this  format ([name1, name2, name3] and not like ["name1", "name2", "name3"]) .
            - description: description of the file, do not include the company name/email/title, just give a 50 word description of the file(document identified by ID: ${uploadedFileId})
            - User Abbreviation: Generate an abbreviation for this ${companyname}, make it two/three letter words, make sure the abbreviation is taken from this "${companyname}" .
            - User Information: Extract relevant context from user_inputs : (${user_inputs}) based on context. For each piece of relevant information, create an object with 'info' containing the extracted context from user_inputs, and 'docs' containing the related content from the document identified by ID: ${uploadedFileId}. Return this as an array of objects, always return it in that format, do not return "Not available for this".
            Ensure the extracted information is precise and clearly presented. Do not include any irrelevant information or annotations. If multiple instances are found, provide all relevant occurrences.

            You should always return the extracted information in the following format:
            
            title: Extracted Title
            companyName: [Extracted Company Name (should be in an array, e.g [companyName] and not like ["companyName"]), it should just contain one element in the array]
            companyAbbreviation: [Extracted Company Abbreviation (should be in an array, e.g [abb1, abb2, abb3] and not like ["abb1", "abb2", "abb3"], also remember, the company abbreviation should be an abbreviation of the company name, if there is no company name in the document, then the company abbreviation should be empty too/return an empty array, MPL cannot be part of the array for iCreditWorks company since it is not an abbreviation of iCreditWorks)] 
            companyEmail: [Extracted Company Email (should be in an array, e.g [email1, email2, email3] and not like ["email1", "email2", "email3"])]
            description: Extracted Description  
            userAbb : Extracted User Abbreviation
            otherInfo: [{"info": "extracted context from user_inputs", "docs": "related extracted content from the document identified by ID: ${uploadedFileId}"}]

            Note: Always give the result in the above format only(PLAIN TEXT). Do not provide anything else, if something is not available, then return it empty.
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
  const companyAbbr = extractDetailFromConversation("companyAbbreviation");
  const companyEmail = extractDetailFromConversation("companyEmail");
  const description = extractDetailFromConversation("description");
  const userAbb = extractDetailFromConversation("userAbb");
  let otherInfoRaw = extractDetailFromConversation("otherInfo");
  console.log("other info raw", otherInfoRaw);
  let otherInfo;
  try {
    otherInfo = JSON.parse(otherInfoRaw);
  } catch (error) {
    console.error("Failed to parse otherInfo:", error.message);
    // Fallback to a default value or handle the error
    otherInfo = []; // Default to an empty array or appropriate fallback
  }

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
