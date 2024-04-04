const axios = require('axios');
const pdf = require('pdf-parse');

/**
 * Extracts text from a PDF available at a given URL.
 * 
 * @param {string} pdfUrl - The URL of the PDF file.
 * @returns {Promise<string>} The extracted text as a string.
 */
async function fileParser(pdfUrl) {
  try {
    // Fetch the PDF file
    const response = await axios({
      url: pdfUrl,
      method: 'GET',
      responseType: 'arraybuffer', // Important to handle the PDF binary data
    });

    // Use pdf-parse to extract text from the PDF buffer
    const data = await pdf(response.data);
    return data.text;
  } catch (error) {
    console.error('An error occurred while extracting text from PDF URL:', error);
    throw error;
  }
}

module.exports = { fileParser };
