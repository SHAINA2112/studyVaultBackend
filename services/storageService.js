import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary.
 * `resourceType` should be 'auto' for documents (PDFs) or 'image' for thumbnails.
 */
export function uploadBufferToCloudinary(buffer, { folder, resourceType = 'auto', filename }) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: filename ? filename.replace(/\.[^/.]+$/, '') : undefined,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

export function deleteFromCloudinary(publicId, resourceType = 'auto') {
  if (!publicId) return Promise.resolve(null);
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch((err) => {
    console.error('[storageService] Failed to delete Cloudinary asset:', publicId, err.message);
    return null;
  });
}

export default cloudinary;
