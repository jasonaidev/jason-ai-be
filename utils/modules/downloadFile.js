const fs = require('fs');
const axios = require('axios');

// Function to download and save the file
const downloadFile = async (url, outputPath) => {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise((resolve) => {
      writer.on('finish', () => resolve(true)); // Resolve true on successful write finish
      writer.on('error', () => {
        console.error('An error occurred during file writing.');
        writer.close();
        
        // Attempt to delete the file in case of error during writing (optional)
        fs.unlink(outputPath, (err) => {
          if (err) console.error('Error deleting the partial file:', err);
          resolve(false); // Resolve false on write error
        });
      });
    });
  } catch (error) {
    console.error('An error occurred during file download:', error.message);
    return false; // Return false on download (request) error
  }
};

module.exports = { downloadFile };
