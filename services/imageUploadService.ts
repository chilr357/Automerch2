/**
 * Image Upload Service
 * Handles image uploads, processing, and storage
 */

import { uploadBase64Image } from './imgbbService';

export interface ImageUploadResult {
  url: string;
  filename: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ImageUploadOptions {
  maxSize?: number; // in bytes, default 32MB
  allowedTypes?: string[]; // default ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  quality?: number; // 0-1, for compression
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSize: 32 * 1024 * 1024, // 32MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  quality: 0.9,
};

/**
 * Validates an image file
 */
export const validateImageFile = (file: File, options: ImageUploadOptions = {}): { valid: boolean; error?: string } => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Check file size
  if (file.size > opts.maxSize) {
    return {
      valid: false,
      error: `File size too large. Maximum size is ${Math.round(opts.maxSize / (1024 * 1024))}MB.`,
    };
  }
  
  // Check file type
  if (!opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${opts.allowedTypes.join(', ')}.`,
    };
  }
  
  return { valid: true };
};

/**
 * Compresses an image file
 */
export const compressImage = (file: File, quality: number = 0.9): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 2048px on longest side)
      const maxSize = 2048;
      let { width, height } = img;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Converts a file to base64 data URL
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads an image file to ImgBB
 */
export const uploadImageFile = async (
  file: File, 
  options: ImageUploadOptions = {}
): Promise<ImageUploadResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Validate file
  const validation = validateImageFile(file, opts);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  try {
    // Compress image if needed
    let processedFile = file;
    if (file.size > 5 * 1024 * 1024) { // Compress if larger than 5MB
      processedFile = await compressImage(file, opts.quality);
    }
    
    // Convert to base64
    const base64DataUrl = await fileToBase64(processedFile);
    
    // Upload to ImgBB
    const filename = `automerch-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const imageUrl = await uploadBase64Image(base64DataUrl, filename);
    
    return {
      url: imageUrl,
      filename: processedFile.name,
      size: processedFile.size,
      type: processedFile.type,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Uploads a base64 data URL to ImgBB
 */
export const uploadBase64DataUrl = async (
  dataUrl: string, 
  filename?: string
): Promise<ImageUploadResult> => {
  try {
    const name = filename || `automerch-${Date.now()}`;
    const imageUrl = await uploadBase64Image(dataUrl, name);
    
    // Extract size and type from data URL
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const size = Math.round((data.length * 3) / 4); // Approximate size
    
    return {
      url: imageUrl,
      filename: name,
      size,
      type: mimeType,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Base64 upload error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Gets image dimensions from a URL
 */
export const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};
