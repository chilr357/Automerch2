import type { AdfusionResult } from '../types';

const DEFAULT_ADFUSION_BASE = 'https://adfusion-ai-893514041849.us-west1.run.app';

const resolveApiBase = (): string => {
  try {
    const value = (import.meta as any).env?.VITE_ADFUSION_API_BASE;
    if (value && String(value).trim()) {
      return String(value).trim().replace(/\/$/, '');
    }
  } catch {}
  return DEFAULT_ADFUSION_BASE;
};

const ADFUSION_API_BASE = resolveApiBase();

export interface AdfusionUploadResponse {
  success: boolean;
  imageId?: string;
  error?: string;
}

export interface AdfusionGenerateRequest {
  imageId: string;
  adFormat: 'chic' | 'fashion' | 'billboard' | 'newspaper' | 'lifestyle' | 'minimal';
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const [meta, data] = dataUrl.split(',');
  if (typeof meta !== 'string' || typeof data !== 'string') {
    throw new Error('Invalid data URL');
  }
  const match = meta.match(/data:(.*?);base64/);
  const mimeType = match?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const len = binary.length;
  const buffer = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
};

const fetchImageBlob = async (imageUrl: string): Promise<Blob> => {
  if (imageUrl.startsWith('data:')) {
    return dataUrlToBlob(imageUrl);
  }
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return await response.blob();
};

export const uploadToAdfusion = async (imageUrl: string): Promise<AdfusionUploadResponse> => {
  try {
    const blob = await fetchImageBlob(imageUrl);
    const formData = new FormData();
    formData.append('file', blob, 'design.png');

    const response = await fetch(`${ADFUSION_API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result?.imageId) {
      throw new Error('Upload succeeded but no imageId returned');
    }

    return { success: true, imageId: String(result.imageId) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return { success: false, error: message };
  }
};

export const generateAdfusionVideo = async (imageId: string, adFormat: string): Promise<AdfusionResult> => {
  try {
    const response = await fetch(`${ADFUSION_API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, adFormat }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const result = await response.json();

    if (result?.status === 'processing' && result?.jobId) {
      return await pollForCompletion(String(result.jobId));
    }

    return {
      success: true,
      stills: Array.isArray(result?.images) ? result.images : [],
      videos: Array.isArray(result?.videos) ? result.videos : [],
      scenario: adFormat,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return { success: false, stills: [], videos: [], scenario: adFormat, error: message };
  }
};

const pollForCompletion = async (jobId: string): Promise<AdfusionResult> => {
  const maxAttempts = 30;
  const delayMs = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${ADFUSION_API_BASE}/api/status/${jobId}`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const status = await response.json();
      const state = String(status?.status || '').toLowerCase();

      if (state === 'completed') {
        return {
          success: true,
          stills: Array.isArray(status?.images) ? status.images : [],
          videos: Array.isArray(status?.videos) ? status.videos : [],
          scenario: status?.adFormat,
        };
      }

      if (state === 'failed') {
        throw new Error(status?.error || 'Generation failed');
      }
    } catch (error) {
      console.warn(`Polling attempt ${attempt + 1} failed:`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Generation timeout');
};
