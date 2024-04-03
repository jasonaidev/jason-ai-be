const fs = require('fs');
const path = require('path');

async function waitForFile(filePath, maxDuration = 120000, intervalDuration = 5000) {
    return new Promise((resolve, reject) => {
        let elapsedTime = 0;

        const intervalId = setInterval(() => {
            if (fs.existsSync(filePath)) {
                console.log('The file exists.', filePath);
                clearInterval(intervalId);
                resolve(filePath);
            } else {
                elapsedTime += intervalDuration;
                console.log('Checking for file after conversion...');
                if (elapsedTime >= maxDuration) {
                    console.log('The file does not after waiting 2 minutes.');
                    clearInterval(intervalId);
                    reject(new Error('File does not exist after waiting 2 minutes.'));
                }
            }
        }, intervalDuration);
    });
}

module.exports = { waitForFile }
