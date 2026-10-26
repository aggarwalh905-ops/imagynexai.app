import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

/**
 * Image buffer ko directly Cloudinary stream ke through WebP format me upload karta hai
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  tags: string[]
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        tags,
        resource_type: 'image',
        format: 'webp',
        quality: 'auto:eco',
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Har user ki 7 se purani images ko Cloudinary se delete karta hai
 */
export async function enforceUserImageLimit(userId: string, maxLimit = 7): Promise<void> {
  try {
    const userTag = `user_${userId}`;
    const result = await cloudinary.api.resources_by_tag(userTag, {
      max_results: 30,
      direction: 'desc',
    });

    const resources = result.resources || [];

    if (resources.length > maxLimit) {
      const excessResources = resources.slice(maxLimit);
      const publicIdsToDelete = excessResources.map((res: any) => res.public_id);

      await cloudinary.api.delete_resources(publicIdsToDelete);
    }
  } catch (err) {
    console.error('Cloudinary auto-delete error:', err);
  }
}