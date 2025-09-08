// Simple client-side canvas fitter to ensure an image covers target size
// Returns a data URL (PNG) with the image scaled and center-cropped to fill

export async function fitImageToSize(sourceDataUrl: string, targetWidth: number, targetHeight: number, bleedScale: number = 1): Promise<string> {
  try {
    if (typeof window === 'undefined' || !('document' in window)) return sourceDataUrl;
    const img = await loadImage(sourceDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(targetWidth));
    canvas.height = Math.max(1, Math.floor(targetHeight));
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceDataUrl;

    const targetAspect = canvas.width / canvas.height;
    const srcAspect = img.width / img.height;

    let drawWidth: number;
    let drawHeight: number;
    if (srcAspect > targetAspect) {
      drawHeight = canvas.height * (bleedScale || 1);
      drawWidth = drawHeight * srcAspect;
    } else {
      drawWidth = canvas.width * (bleedScale || 1);
      drawHeight = drawWidth / srcAspect;
    }

    const dx = (canvas.width - drawWidth) / 2;
    const dy = (canvas.height - drawHeight) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    return canvas.toDataURL('image/png');
  } catch {
    return sourceDataUrl;
  }
}

// Upscales to specific pixel dimensions with cover behavior (for strict device placeholders)
export async function coverToExactPixels(sourceDataUrl: string, exactWidth: number, exactHeight: number, overscan: number = 1.0): Promise<string> {
  try {
    if (typeof window === 'undefined' || !('document' in window)) return sourceDataUrl;
    const img = await loadImage(sourceDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(exactWidth));
    canvas.height = Math.max(1, Math.floor(exactHeight));
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceDataUrl;

    const targetAspect = canvas.width / canvas.height;
    const srcAspect = img.width / img.height;

    let drawWidth: number;
    let drawHeight: number;
    if (srcAspect > targetAspect) {
      drawHeight = canvas.height * overscan;
      drawWidth = drawHeight * srcAspect;
    } else {
      drawWidth = canvas.width * overscan;
      drawHeight = drawWidth / srcAspect;
    }
    const dx = (canvas.width - drawWidth) / 2;
    const dy = (canvas.height - drawHeight) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    return canvas.toDataURL('image/png');
  } catch {
    return sourceDataUrl;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}


