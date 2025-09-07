/**
 * Midjourney API Service
 * Specialized anime character generation using Niji model
 */

export interface MidjourneyImageResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    image_url: string;
  };
  error?: string;
}

export interface MidjourneyGenerateOptions {
  prompt: string;
  model?: 'niji' | 'midjourney';
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality?: 'standard' | 'high';
}

export const generateImageWithMidjourney = async (options: MidjourneyGenerateOptions): Promise<string> => {
  const { prompt, model = 'niji', aspect_ratio = '1:1', quality = 'high' } = options;
  
  const apiKey = import.meta.env.VITE_MIDJOURNEY_API_KEY;
  if (!apiKey) {
    console.warn('Midjourney API key not found. Please add VITE_MIDJOURNEY_API_KEY to your environment variables.');
    throw new Error('Midjourney API key not configured. Please run "npm run setup" to configure your API keys.');
  }

  try {
    // Enhanced prompt for anime/manga style
    const enhancedPrompt = model === 'niji' 
      ? `High-quality anime art, manga style, vibrant colors, for merchandise (t-shirt, mug). The design should be centered with a transparent or simple background. Subject: ${prompt} --niji 6 --style raw --ar ${aspect_ratio}`
      : `High-quality digital art for merchandise (t-shirt, mug). The design should be centered with a transparent or simple background. Subject: ${prompt} --ar ${aspect_ratio}`;

    // Submit generation request
    const submitResponse = await fetch('https://api.midjourney.com/v1/imagine', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        model,
        aspect_ratio,
        quality,
      }),
    });

    if (!submitResponse.ok) {
      const errorData = await submitResponse.json().catch(() => ({}));
      throw new Error(`Midjourney API error: ${submitResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.task_id;

    if (!taskId) {
      throw new Error('No task ID returned from Midjourney API');
    }

    // Poll for completion
    return await pollForCompletion(apiKey, taskId);
  } catch (error) {
    console.error('Midjourney API error:', error);
    throw new Error(`Failed to generate image with Midjourney: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const pollForCompletion = async (apiKey: string, taskId: string, maxAttempts: number = 30): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`https://api.midjourney.com/v1/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.status}`);
      }

      const data: MidjourneyImageResponse = await response.json();

      if (data.status === 'completed' && data.result?.image_url) {
        return data.result.image_url;
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Image generation failed');
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Image generation timed out');
};
