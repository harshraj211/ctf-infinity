const multer = require('multer');

/**
 * Use memoryStorage so Multer never writes to disk and applies
 * zero transformation to the binary data.  The raw Buffer is then
 * forwarded to Firebase Storage verbatim, preserving EXIF metadata
 * and every byte needed for steganography / forensics challenges.
 */
const storage = multer.memoryStorage();

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types the admin intentionally uploads
    cb(null, true);
  },
});

module.exports = uploadMiddleware;
