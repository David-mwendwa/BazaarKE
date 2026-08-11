import cloudinary from 'cloudinary';

/**
 * Global Cloudinary configuration.
 *
 * Values are read from environment variables:
 * - `CLOUDINARY_CLOUD_NAME`
 * - `CLOUDINARY_API_KEY`
 * - `CLOUDINARY_API_SECRET`
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file (image or supported document) to Cloudinary.
 *
 * Supports the following MIME types when a base64 data URI is provided:
 * - Any image type: `image/*`
 * - PDF documents: `application/pdf`
 * - Word documents: `application/msword`,
 *   `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
 *
 * When `file` is not a data URI (for example, a remote URL), the MIME type is
 * not pre-validated here and Cloudinary is allowed to handle validation.
 * Uploads use `resource_type: 'auto'` so Cloudinary can infer the resource
 * type as needed.
 *
 * @async
 * @param {string} file - File payload, typically a base64 data URI
 *   (e.g. `data:image/png;base64,...`) or a remote URL.
 * @param {object} [options] - Additional Cloudinary upload options, such as
 *   `folder`, `public_id`, `width`, `crop`, etc.
 * @returns {Promise<object>} Resolves with Cloudinary's upload result
 *   (e.g. containing `public_id`, `secure_url`, `url`, etc.).
 * @throws {Error} If no file is provided or an unsupported MIME type is
 *   detected for a data URI.
 */
const uploadToCloudinary = async (file, options) => {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const match = typeof file === 'string' ? /data:([^;]+)/.exec(file) : null;
    const mimeType = match && match[1] ? match[1] : 'unknown';

    // When a data URI is provided, enforce a whitelist of supported types
    if (match) {
      const allowedMimeTypes = [
        /^image\//,
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      const isAllowed = allowedMimeTypes.some((allowed) =>
        allowed instanceof RegExp
          ? allowed.test(mimeType)
          : allowed === mimeType
      );

      if (!isAllowed) {
        throw new Error(
          `Unsupported file type for upload (uploaded mimeType: ${mimeType})`
        );
      }
    }

    return await cloudinary.v2.uploader.upload(file, {
      resource_type: 'auto',
      use_filename: true,
      ...options,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
};

/**
 * Remove a file from Cloudinary by its public ID.
 *
 * Commonly used when updating or deleting a document that references a
 * Cloudinary-hosted asset.
 *
 * @async
 * @param {string} id - Cloudinary public ID of the asset to delete.
 * @returns {Promise<object>} Resolves with Cloudinary's destroy result.
 * @throws {Error} If no ID is provided or the Cloudinary operation fails.
 */
const removeFromCloudinary = async (id) => {
  try {
    if (!id) {
      throw new Error('Please provide cloudinary id');
    }

    return await cloudinary.v2.uploader.destroy(id);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
};

export { uploadToCloudinary, removeFromCloudinary };
