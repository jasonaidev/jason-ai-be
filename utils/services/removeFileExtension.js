/**
 * @param {string} fileName
 */
function removeFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName; // No dot found, or it's at the start, return as is
    return fileName.substring(0, lastDotIndex);
}

module.exports = { removeFileExtension }
