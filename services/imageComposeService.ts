/**
 * Client-side image compositor
 * Overlays a design (base64 or URL) onto a product mockup image URL.
 */

import type { Product } from '../types';

export interface ComposeOptions {
  mockupUrl: string;
  designDataUrl: string; // base64 data URL
  product: Product;
}

const proxied = (url: string): string => {
  try {
    const base = (import.meta.env.VITE_API_BASE || '').toString().replace(/\/$/, '');
    if (!base) return url;
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

export const composeDesignOnMockup = async ({ mockupUrl, designDataUrl, product }: ComposeOptions): Promise<string> => {
  const [mockupImg, designImg] = await Promise.all([
    loadImage(mockupUrl),
    loadImage(designDataUrl),
  ]);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Match canvas to mockup dimensions
  canvas.width = mockupImg.naturalWidth;
  canvas.height = mockupImg.naturalHeight;

  // Draw base mockup
  ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);

  // Compute placement area heuristically by product type/printAreaPosition
  // These are simple heuristics; can be refined per mockup asset
  const padding = Math.round(canvas.width * 0.08);
  let targetX = padding;
  let targetY = padding;
  let targetW = canvas.width - padding * 2;
  let targetH = canvas.height - padding * 2;

  if (product.printAreaPosition === 'front') {
    targetY = Math.round(canvas.height * 0.18);
    targetH = Math.round(canvas.height * 0.5);
    targetX = Math.round(canvas.width * 0.2);
    targetW = canvas.width - targetX * 2;
  }

  // Fit design into target rect preserving aspect ratio
  const designRatio = designImg.naturalWidth / designImg.naturalHeight;
  let drawW = targetW;
  let drawH = Math.round(drawW / designRatio);
  if (drawH > targetH) {
    drawH = targetH;
    drawW = Math.round(drawH * designRatio);
  }
  const drawX = Math.round(targetX + (targetW - drawW) / 2);
  const drawY = Math.round(targetY + (targetH - drawH) / 2);

  // Optional: slight opacity to blend
  ctx.globalAlpha = 0.98;
  ctx.drawImage(designImg, drawX, drawY, drawW, drawH);
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/png');
};


