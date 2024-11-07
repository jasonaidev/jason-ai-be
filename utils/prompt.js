const { removeFileExtension } = require("./services/removeFileExtension");

const SystemPrompt = (
  uploadedFileId,
  data,
  fileExt,
  fileName,
  selectedTemplate,
  user_inputs,
  extractedDataFromDocument
) => {
  console.log(
    "this is the extractedDatafromDocument",
    extractedDataFromDocument
  );

  const instructions = buildPrompt(
    extractedDataFromDocument,
    data,
    user_inputs
  );
  const outputFormat = fileExt?.includes(".pdf")
    ? "docx"
    : selectedTemplate?.file?.ext;
  const fileBaseName = removeFileExtension(fileName);
  const userFileName = `${fileBaseName}_user_${data?.user}`;

  return `
    Context: You are an expert in document formatting and text replacement. Your task is to update a given document based on specific user instructions while maintaining the original design, style, font, and format.

    **Task Instructions:**

    1. **Analyze the Document:**
    - Review the document identified by ID: ${uploadedFileId} to understand its content and structure.

    ${instructions}

    3. **Maintain Original Format:**
    - Ensure that the updated document retains the original design, style, font, and format. 
    **Note:** Ensure that all sheets within the Excel file maintain their formatting and design elements, ensure the formatting remains the same. 

    4. **Template Document Format:**
    - The document is provided in ${outputFormat} format.
    
    5. **Output Format:**
    - The document is provided in ${outputFormat} format.
    - Generate the updated document in the same ${outputFormat} format.
    - Name the new file as ${userFileName}.

    6. **Generate Description:**
    - Generate a 50 word description of the updated document based solely on its content in a separate message(make sure there is always a sort of description generated).
    - Do not include details about the title, filename, or company name.
    - Message format: Description: "start description here".

    **Example:**

    - Original Title: “Annual Report 2023”
    - New Title: “${data?.title}” (e.g., “Quarterly Review 2024” in the same font and style)
    - Original Company Name: “ABC Corp”
    - New Company Name: “${data?.companyName}” (replace “ABC Corp” with “XYZ Ltd” throughout the document, including any abbreviations)
    - Original Email: “contact@abccorp.com”
    - New Email: “${data?.email}” (replace “contact@abccorp.com” with “info@xyzltd.com”)

    **Clarifying Notes:**

    - Focus strictly on the user instructions for replacements and updates.
    - Ensure that every modification adheres strictly to the original format specifics.
    `;
};

// Now build the prompt based on whether extractedDataFromDocument is available or not
const buildPrompt = (extractedDataFromDocument, data, user_inputs) => {
  const title =
    extractedDataFromDocument &&
    !extractedDataFromDocument?.title.includes("Not available")
      ? `Replace the document's title "${extractedDataFromDocument.title}" with "${data?.title}". Ensure the new title matches the original in font size, style, and appears prominently on the first page or as the first line.`
      : `Replace the document's title with "${data?.title}". Ensure the new title matches the original in font size, style, and appears prominently on the first page or as the first line.`;

  const companyAbbr =
    extractedDataFromDocument &&
    !extractedDataFromDocument?.companyAbbr.includes("Not available")
      ? `(${extractedDataFromDocument.companyAbbr})`
      : "";

  const companyNameInstruction =
    extractedDataFromDocument?.companyName &&
    !extractedDataFromDocument.companyName.includes("Not available")
      ? `Replace every occurrence of "${extractedDataFromDocument.companyName}" with "${data?.companyName}" and its abbreviation(s) ${companyAbbr}(no matter the case, for example if the abbrevation is iCW, also replace any ICW, icw, iCw, no matter the case, make it case insensitive) with an abbreviation of "${data?.companyName}"(give this an abbreviation of 2 or 3 words) . Identify and update all instances throughout the document, make sure they are updated through out the document., some document might have contents with placeholders like [Insert Company Here] (“Insert Company Here” or the “Company”), "[Insert Company Here] (“Insert Company Here” or the “Company”)"  "insert company name here", "insert company name", "company name" etc, use your discretion to identify those instances and also replace them with the company name "${data?.companyName}",   `
      : `Replace every occurrence of company name with "${data?.companyName}" and its abbreviation(s) ${companyAbbr}(no matter the case, for example if the abbrevation is iCW, also replace any ICW, icw, iCw, no matter the case, make it case insensitive) with  an abbreviation of "${data?.companyName}"(give this an abbreviation of 3 words). Identify and update all instances throughout the document. make sure they are updated through out the document., some document might have contents with placeholders like [Insert Company Here] (“Insert Company Here” or the “Company”), "[Insert Company Here] (“Insert Company Here” or the “Company”)"  ,"insert company name here", "insert company name", "company name" etc, use your discretion to identify those instances and also replace them with the company name "${data?.companyName}",  `;

  const companyEmailInstruction =
    extractedDataFromDocument?.companyEmail &&
    !extractedDataFromDocument.companyEmail.includes("Not available")
      ? `Replace every occurrence of the company's email address "${extractedDataFromDocument.companyEmail}" with "${data?.email}". Identify and update all instances throughout the document.make sure they are updated through out the document., some document might be a template with some contents like "insert company email here", "insert email", "company email" etc, use your discretion to identify those instances (also based on context) and also replace them with the company email "${data?.email}", maintain the font style and textsize used. `
      : `Replace every occurrence of the company's email address with "${data?.email}". Identify and update all instances throughout the document. make sure they are updated through out the document., some document might be a template with some contents like "insert company email here", "insert email", "company email" etc, use your discretion to identify those instances (also based on context) and also replace them with the company email "${data?.email}", maintain the font style and textsize used.`;

  return `
        2. **User Instructions for Updates:**
        - **Title:** 
            ${title}
        - **Company Name:** 
            ${companyNameInstruction}
        - **Email:** 
            ${companyEmailInstruction}
        - **Additional User Inputs:** Extract and integrate the specified data "${user_inputs}" into the document where relevant.
    `;
};

module.exports = { SystemPrompt };
