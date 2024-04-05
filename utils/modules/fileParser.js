const axios = require('axios');
const pdf = require('pdf-parse');

/**
 * Extracts text from a PDF available at a given URL.
 * 
 * @param {string} fileUrl - The URL of the PDF file.
 * @returns {Promise<string>} The extracted text as a string.
 */
async function fileParser(fileUrl) {
  try {
    // Determine the file type based on the URL extension
    const fileType = fileUrl.split('.').pop().toLowerCase();

    // Fetch the file
    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'arraybuffer', // Suitable for binary data
    });

    // Process based on file type
    if (fileType === 'pdf') {
      // Use pdf-parse to extract text from the PDF buffer
      const data = await pdf(response.data);
      return data.text;
    } else if (fileType === 'txt') {
      // Convert the ArrayBuffer to string for a text file
      const text = Buffer.from(response.data).toString('utf8');
      return text;
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('An error occurred while extracting text:', error);
    throw error;
  }
}


module.exports = { fileParser };
