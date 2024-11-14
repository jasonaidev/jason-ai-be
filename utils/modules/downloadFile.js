const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Function to download and save the file
const downloadFile = async (url, outputPath) => {
  try {
    // Create the directory path if it doesn't exist
    const directory = path.dirname(outputPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log(`Created directory: ${directory}`);
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("File has been written successfully.");
        resolve(true);
      });
      writer.on("error", (error) => {
        console.error("An error occurred during file writing:", error);
        writer.close();

        // Attempt to delete the file in case of error during writing
        fs.unlink(outputPath, (err) => {
          if (err) console.error("Error deleting the partial file:", err);
        });
        reject(error); // Reject with the actual error
      });
    });
  } catch (error) {
    console.error("An error occurred during file download:", error.message);
    throw error; // Throw the error to be handled by the caller
  }
};

module.exports = { downloadFile };
