const cloudinary = require('cloudinary').v2;

// Configure from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary as raw binary.
 * resource_type: 'raw' ensures NO image compression, NO stripping —
 * the exact bytes are preserved (critical for stego/forensics).
 */
async function uploadFileRaw(buffer, originalName, folder = 'challenges') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary not configured in .env');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',   // raw = no processing whatsoever
        folder,
        public_id: `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

async function deleteFile(publicUrl) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return;
  // Extract public_id from URL
  const parts = publicUrl.split('/');
  const folder = parts[parts.length - 2];
  const filename = parts[parts.length - 1];
  const public_id = `${folder}/${filename}`;
  await cloudinary.uploader.destroy(public_id, { resource_type: 'raw' });
}

module.exports = { uploadFileRaw, deleteFile };
