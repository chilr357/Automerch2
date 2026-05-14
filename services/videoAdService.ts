/**
 * Client-side video ad generator
 *
 * Two usage modes:
 * 1) Prefer Cloud Run proxy when configured (keeps keys off client)
 * 2) Otherwise animate stills locally (canvas-based fallbacks)
 */
import { isMediaProxyConfigured, generateProxyVideo } from './mediaProxyService';

const proxied = (url: string): string => {
  try {
    const envBase = (import.meta as any).env?.VITE_API_BASE;
    const base = (envBase && String(envBase).trim()) ? String(envBase).trim().replace(/\/$/, '') : '/api';
    const encoded = encodeURIComponent(url);
    const apiRoot = base.endsWith('/api') ? base : `${base}/api`;
    return `${apiRoot}/proxy-image?url=${encoded}`;
  } catch {
    return url;
  }
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src.startsWith('data:') ? src : proxied(src);
  });
};

async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function recordCanvasToWebM(canvas: HTMLCanvasElement, drawFrame: (t: number) => void, durationMs: number, fps = 30): Promise<string> {
  const stream = (canvas as any).captureStream ? canvas.captureStream(fps) : undefined;
  if (!stream) throw new Error('Canvas captureStream not supported');
  const mimeOptions = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    // Safari fallback
    'video/mp4;codecs=h264',
    'video/mp4',
  ];
  let mimeType = '';
  for (const m of mimeOptions) {
    if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
  }
  if (!mimeType) throw new Error('No supported WebM codec available');
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

  let start = performance.now();
  let rafId = 0 as number | any;
  const loop = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    drawFrame(t);
    if (t < 1) rafId = requestAnimationFrame(loop);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  // Start
  recorder.start(100);
  rafId = requestAnimationFrame(loop);
  await new Promise((r) => setTimeout(r, durationMs + 50));
  try { cancelAnimationFrame(rafId); } catch {}
  recorder.stop();
  const blob = await done;
  return blobToDataUrl(blob);
}

function drawRoundedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

export async function generateFashionVideoAd(productImageUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900; // 4:5 vertical
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  const img = await loadImage(productImageUrl);

  const drawFrame = (t: number) => {
    // bg gradient
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#EC4899'); // pink-500
    g.addColorStop(1, '#8B5CF6'); // violet-500
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle radial highlight
    const rg = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.3, 50, canvas.width * 0.5, canvas.height * 0.3, canvas.width * 0.7);
    rg.addColorStop(0, 'rgba(255,255,255,0.18)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // product zoom (Ken Burns)
    const baseW = canvas.width * 0.78;
    const aspect = img.naturalWidth / img.naturalHeight || 1;
    const baseH = baseW / aspect;
    const scale = 1 + 0.08 * t; // 8% zoom in
    const w = baseW * scale;
    const h = baseH * scale;
    const x = (canvas.width - w) / 2;
    const y = canvas.height * 0.23 - (h - baseH) * 0.5;

    // card shadow
    ctx.save();
    ctx.filter = 'drop-shadow(0px 18px 30px rgba(0,0,0,0.35))';
    drawRoundedImage(ctx, img, x, y, w, h, 18);
    ctx.restore();

    // footer shine bar
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, canvas.height - 110, canvas.width, 110);
  };

  return recordCanvasToWebM(canvas, drawFrame, 5000, 30);
}

export async function generateChicVideoAd(productImageUrl: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  const img = await loadImage(productImageUrl);

  const drawFrame = (t: number) => {
    // minimal gradient bg
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#111827'); // gray-900
    g.addColorStop(1, '#1f2937'); // gray-800
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // parallax drift
    const driftX = Math.sin(t * Math.PI) * 8;
    const driftY = Math.cos(t * Math.PI) * 6;

    const baseW = canvas.width * 0.74;
    const aspect = img.naturalWidth / img.naturalHeight || 1;
    const baseH = baseW / aspect;
    const scale = 1.06 - 0.06 * t; // slight zoom out
    const w = baseW * scale;
    const h = baseH * scale;
    const x = (canvas.width - w) / 2 + driftX;
    const y = canvas.height * 0.26 + driftY;

    // soft border + subtle glow
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.12)';
    ctx.shadowBlur = 24;
    drawRoundedImage(ctx, img, x, y, w, h, 20);
    ctx.restore();

    // top highlight strip
    const rg = ctx.createLinearGradient(0, 0, 0, 200);
    rg.addColorStop(0, 'rgba(255,255,255,0.12)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, canvas.width, 200);
  };

  return recordCanvasToWebM(canvas, drawFrame, 5000, 30);
}

const isVideoAsset = (value?: string | null): boolean => {
  if (!value) return false;
  if (/^data:video\//i.test(value)) return true;
  return /\.(mp4|webm)(\?.*)?$/i.test(value);
};

export async function generateVideosFromStills(fashionStillUrl?: string, chicStillUrl?: string): Promise<string[]> {
  const out: string[] = [];
  // Route via media proxy if configured
  if (isMediaProxyConfigured()) {
    try {
      if (fashionStillUrl) {
        const imageDataUri = fashionStillUrl.startsWith('data:') ? fashionStillUrl : await fetchAsDataUrl(fashionStillUrl);
        const v1 = await generateProxyVideo({
          prompt: 'Create a high-production 5-second fashion/lifestyle commercial from this still. Cinematic lighting, smooth camera motion, no text.',
          imageDataUri,
          duration: 5,
        });
        if (v1) out.push(v1);
      }
      if (chicStillUrl) {
        const imageDataUri2 = chicStillUrl.startsWith('data:') ? chicStillUrl : await fetchAsDataUrl(chicStillUrl);
        const v2 = await generateProxyVideo({
          prompt: 'Create a chic lifestyle 5-second product commercial from this still. Natural light, minimal composition, no text.',
          imageDataUri: imageDataUri2,
          duration: 5,
        });
        if (v2) out.push(v2);
      }
      if (out.length) return out;
    } catch (e) {
      console.warn('Media proxy video generation failed, using local fallbacks', e);
    }
  }
  try {
    if (fashionStillUrl) {
      if (isVideoAsset(fashionStillUrl)) {
        out.push(fashionStillUrl);
      } else {
        out.push(await generateFashionVideoAd(fashionStillUrl));
      }
    }
  } catch (e) { console.warn('fashion video render fail', e); }
  try {
    if (chicStillUrl) {
      if (isVideoAsset(chicStillUrl)) {
        out.push(chicStillUrl);
      } else {
        out.push(await generateChicVideoAd(chicStillUrl));
      }
    }
  } catch (e) { console.warn('chic video render fail', e); }
  return out;
}

export async function generatePhoneCommercial(productImageUrl: string): Promise<string> {
  // Prefer proxy path if available
  if (isMediaProxyConfigured()) {
    try {
      const imageDataUri = productImageUrl.startsWith('data:') ? productImageUrl : await fetchAsDataUrl(productImageUrl);
      return await generateProxyVideo({
        prompt: 'Create a 5-second premium smartphone commercial from this still. Precision macro details, elegant movements, no text.',
        imageDataUri,
        duration: 5,
      });
    } catch (error) {
      console.warn('Media proxy phone commercial failed, falling back', error);
    }
  }
  try {
    const [primary] = await generateVideosFromStills(productImageUrl);
    if (primary) return primary;
  } catch (error) {
    console.warn('Phone commercial still animation failed, falling back', error);
  }

  try {
    return await generateChicVideoAd(productImageUrl);
  } catch (error) {
    console.warn('Chic fallback for phone commercial failed, using fashion style', error);
  }

  return generateFashionVideoAd(productImageUrl);
}
