const PROXY_URL = (import.meta as any).env?.VITE_MEDIA_PROXY_URL as string | undefined;
const PROXY_API_KEY = (import.meta as any).env?.VITE_SERVER_API_KEY as string | undefined;

const ensureConfigured = () => {
  if (!PROXY_URL || !PROXY_API_KEY) {
    throw new Error('Media proxy is not configured. Set VITE_MEDIA_PROXY_URL and VITE_SERVER_API_KEY.');
  }
};

export const isMediaProxyConfigured = (): boolean => {
  try {
    return Boolean(PROXY_URL && PROXY_API_KEY);
  } catch {
    return false;
  }
};

interface ProxyRequestOptions {
  path: string;
  body: any;
}

const requestProxy = async <T>({ path, body }: ProxyRequestOptions): Promise<T> => {
  ensureConfigured();
  const response = await fetch(`${PROXY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PROXY_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Proxy request failed (${response.status}): ${text}`);
  }
  return response.json() as Promise<T>;
};

export const generateProxyImage = async (params: { prompt: string; imageDataUri?: string; width?: number; height?: number }): Promise<string> => {
  const { prompt, imageDataUri, width, height } = params;
  const payload: any = { prompt };
  if (imageDataUri) payload.imageBase64 = imageDataUri;
  if (width) payload.width = width;
  if (height) payload.height = height;
  const { imageUrl } = await requestProxy<{ imageUrl: string }>({ path: '/generate-image', body: payload });
  if (!imageUrl) throw new Error('Media proxy returned empty imageUrl');
  return imageUrl;
};

export const generateProxyVideo = async (params: { prompt: string; imageDataUri?: string; duration?: number }): Promise<string> => {
  const { prompt, imageDataUri, duration } = params;
  const payload: any = { prompt };
  if (imageDataUri) payload.imageBase64 = imageDataUri;
  if (duration) payload.duration = duration;
  const { videoUrl } = await requestProxy<{ videoUrl: string }>({ path: '/generate-video', body: payload });
  if (!videoUrl) throw new Error('Media proxy returned empty videoUrl');
  return videoUrl;
};
