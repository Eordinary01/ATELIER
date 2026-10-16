import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env.js';

let configured = false;

function initCloudinary() {
  if (configured) return;
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  } else if (env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: env.CLOUDINARY_URL,
      secure: true,
    });
    configured = true;
  }
}

export function isCloudinaryConfigured(): boolean {
  initCloudinary();
  return configured;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Upload a binary buffer to Cloudinary
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = 'atelier/products',
  publicIdPrefix?: string
): Promise<UploadResult> {
  initCloudinary();

  if (!configured) {
    // Graceful dev fallback if credentials not yet set
    const fallbackId = `mock_${Date.now()}`;
    return {
      url: `https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80`,
      secureUrl: `https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80`,
      publicId: `${folder}/${fallbackId}`,
      format: 'webp',
      width: 1200,
      height: 1600,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdPrefix ? `${publicIdPrefix}_${Date.now()}` : undefined,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:best', fetch_format: 'auto' },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed'));
        }
        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a Base64 or Data URI string to Cloudinary
 */
export async function uploadBase64ToCloudinary(
  dataUriOrBase64: string,
  folder = 'atelier/products'
): Promise<UploadResult> {
  initCloudinary();

  if (!configured) {
    const fallbackId = `mock_${Date.now()}`;
    return {
      url: `https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80`,
      secureUrl: `https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80`,
      publicId: `${folder}/${fallbackId}`,
      format: 'webp',
      width: 1200,
      height: 1600,
    };
  }

  const result = await cloudinary.uploader.upload(dataUriOrBase64, {
    folder,
    resource_type: 'image',
    transformation: [
      { quality: 'auto:best', fetch_format: 'auto' },
    ],
  });

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
  };
}

/**
 * Generate signed upload parameters for client-side direct uploads
 */
export function generateSignedUploadParams(folder = 'atelier/products') {
  initCloudinary();

  if (!configured) {
    return {
      configured: false,
      timestamp: Math.round(Date.now() / 1000),
      signature: '',
      apiKey: '',
      cloudName: '',
      folder,
    };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.CLOUDINARY_API_SECRET
  );

  return {
    configured: true,
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

/**
 * Returns optimized dynamic URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string {
  initCloudinary();

  if (!configured || publicId.startsWith('http')) {
    return publicId;
  }

  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: options.quality || 'auto:best',
    width: options.width,
    height: options.height,
    crop: options.crop || (options.width && options.height ? 'fill' : undefined),
  });
}
