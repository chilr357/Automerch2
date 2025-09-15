/**
 * Grok Image Service (configurable)
 * Adds optional image generation using a Grok-compatible API.
 *
 * Configuration (set in .env.local):
 * - VITE_GROK_API_KEY: your Grok API key (required to enable)
 * - VITE_GROK_API_BASE: base URL, e.g. https://api.x.ai/v1 (default)
 * - VITE_GROK_IMAGE_PATH: endpoint path for image generation (default: /images)
 * - VITE_GROK_OPENAI_COMPAT=1: treat the API as OpenAI Images-compatible body/response
 */

export interface GrokGenerateOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

function getEnv(name: string): string | undefined {
  try { return (import.meta as any).env?.[name]; } catch { return undefined; }
}

export const isGrokConfigured = (): boolean => Boolean(getEnv('VITE_GROK_API_KEY'));

export const generateImageWithGrok = async (options: GrokGenerateOptions): Promise<string> => {
  const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = options;

  const apiKey = getEnv('VITE_GROK_API_KEY');
  if (!apiKey) {
    throw new Error('Grok API key not configured. Set VITE_GROK_API_KEY in .env.local');
  }
  const base = (getEnv('VITE_GROK_API_BASE') || 'https://api.x.ai/v1').toString().replace(/\/$/, '');
  const path = (getEnv('VITE_GROK_IMAGE_PATH') || '/images').toString();
  const openaiCompat = String(getEnv('VITE_GROK_OPENAI_COMPAT') || '').trim() === '1';

  // Build request body. Default to OpenAI Images-compatible payload.
  const artPrompt = `Create a standalone artwork (not a product mockup). Subject: ${prompt}.
Background:
- Include a tasteful background (soft gradient/abstract/atmospheric) filling the canvas edge‑to‑edge.
- No checkerboard or transparency patterns; avoid plain white/gray.
Rules:
- Output only the artwork; do NOT render apparel, shirts, mugs, packaging, or human models.
- No text or watermarks.`;

  const body = openaiCompat || path.endsWith('/images') || path.includes('images')
    ? {
        model: getEnv('VITE_GROK_IMAGE_MODEL') || 'grok-image-latest',
        prompt: artPrompt,
        n: 1,
        size,
        quality,
        style,
      }
    : {
        prompt: artPrompt,
        size,
        quality,
        style,
      };

  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try { const j = JSON.parse(text); message = j.error?.message || j.message || text; } catch {}
    throw new Error(`Grok API error: ${res.status} - ${message}`);
  }

  // Try OpenAI-like shape first: { data: [{ url }] }
  try {
    const j = JSON.parse(text);
    const url = extractFirstImageUrl(j);
    if (url) return url;
  } catch {}

  // If server returned a raw string URL or data URL
  if (/^https?:\/\//i.test(text) || text.startsWith('data:image/')) return text.trim();

  throw new Error('Grok API returned an unrecognized image payload');
};

function extractFirstImageUrl(obj: any): string | undefined {
  // OpenAI-compatible
  if (obj?.data && Array.isArray(obj.data) && obj.data[0]?.url) return obj.data[0].url;
  // Common other shapes
  if (obj?.image_url) return obj.image_url;
  if (obj?.images && Array.isArray(obj.images) && obj.images[0]?.url) return obj.images[0].url;
  // Search recursively for likely URL
  const stack: any[] = [obj];
  while (stack.length) {
    const it = stack.pop();
    if (!it) continue;
    if (typeof it === 'string' && (/^https?:\/\//i.test(it) || it.startsWith('data:image/'))) return it;
    if (Array.isArray(it)) { stack.push(...it); continue; }
    if (typeof it === 'object') {
      for (const k of Object.keys(it)) stack.push(it[k]);
    }
  }
  return undefined;
}
