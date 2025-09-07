/**
 * ImgBB Service
 * Image storage and hosting
 */

export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: string;
    height: string;
    size: string;
    time: string;
    expiration: string;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export interface ImgBBUploadOptions {
  image: string; // base64 encoded image
  name?: string;
  expiration?: number; // seconds, 0 for no expiration
}

export const uploadImageToImgBB = async (options: ImgBBUploadOptions): Promise<string> => {
  const { image, name = 'automerch-design', expiration = 0 } = options;
  
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    console.warn('ImgBB API key not found. Please add VITE_IMGBB_API_KEY to your environment variables.');
    throw new Error('ImgBB API key not configured. Please run "npm run setup" to configure your API keys.');
  }

  try {
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', image);
    formData.append('name', name);
    if (expiration > 0) {
      formData.append('expiration', expiration.toString());
    }

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ImgBB API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: ImgBBResponse = await response.json();
    
    if (!data.success || !data.data?.url) {
      throw new Error('Failed to upload image to ImgBB');
    }

    return data.data.url;
  } catch (error) {
    console.error('ImgBB API error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadBase64Image = async (base64DataUrl: string, name?: string): Promise<string> => {
  // Extract base64 data from data URL
  const base64Data = base64DataUrl.includes(',') ? base64DataUrl.split(',')[1] : base64DataUrl;
  return uploadImageToImgBB({ image: base64Data, name });
};
