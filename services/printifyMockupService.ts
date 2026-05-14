import type { Product } from '../types';
import { printifyService } from './printifyService';
import { logger } from './logger';
import { fitImageToSize, coverToExactPixels } from './utils/imageFit';

export interface GenerateMockupOptions {
  product: Product;
  designDataUrl: string; // base64 data URL (data:image/png;base64,...)
  title?: string;
  description?: string;
}

const extractBase64 = (dataUrl: string): string => {
  const [, data] = dataUrl.split(',');
  return data || dataUrl;
};

const estimateDataUrlBytes = (dataUrl: string): number => {
  const base64 = extractBase64(dataUrl);
  return Math.ceil((base64.length * 3) / 4);
};

const MAX_PRINTIFY_PAYLOAD_BYTES = 14.5 * 1024 * 1024; // safety margin under Printify's 15MB upload limit
const MAX_ENABLED_VARIANTS = 90; // stay under Printify's 100 variant cap

const chooseVariantSubset = (variants: any[], preferredId?: number): { ids: number[]; selectedId?: number } => {
  const unique: any[] = [];
  const push = (variant: any) => {
    if (!variant || typeof variant.id !== 'number') return;
    if (!unique.some((v) => v.id === variant.id)) unique.push(variant);
  };

  if (preferredId) {
    const preferred = variants.find((v: any) => v.id === preferredId);
    if (preferred) push(preferred);
  }

  const buckets = [
    variants.filter((v: any) => v.is_default),
    variants.filter((v: any) => v.is_available),
    variants.filter((v: any) => v.is_enabled),
  ];
  for (const bucket of buckets) {
    for (const variant of bucket) {
      if (unique.length >= MAX_ENABLED_VARIANTS) break;
      push(variant);
    }
    if (unique.length >= MAX_ENABLED_VARIANTS) break;
  }

  if (unique.length < MAX_ENABLED_VARIANTS) {
    for (const variant of variants) {
      if (unique.length >= MAX_ENABLED_VARIANTS) break;
      push(variant);
    }
  }

  const trimmed = unique.slice(0, MAX_ENABLED_VARIANTS);
  const ids = trimmed.map((v) => v.id).filter((id) => typeof id === 'number');
  const selected = preferredId && ids.includes(preferredId) ? preferredId : ids[0];
  return { ids, selectedId: selected };
};

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

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

const downloadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(proxied(url));
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (error) {
    console.warn('Failed to download image for Printify prep', error);
    return null;
  }
};

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const renderImageDataUrl = (
  img: HTMLImageElement,
  width: number,
  height: number,
  mimeType: 'image/png' | 'image/jpeg',
  quality?: number,
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mimeType, quality);
};

const ensurePrintifySafeSize = async (dataUrl: string): Promise<string> => {
  try {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    if (estimateDataUrlBytes(dataUrl) <= MAX_PRINTIFY_PAYLOAD_BYTES) return dataUrl;
    if (typeof window === 'undefined' || !('document' in window)) return dataUrl;

    const baseImage = await loadImageElement(dataUrl);
    const baseWidth = baseImage.naturalWidth || baseImage.width;
    const baseHeight = baseImage.naturalHeight || baseImage.height;

    const detectTransparency = (): boolean => {
      try {
        const sampleSize = Math.max(1, Math.min(256, Math.min(baseWidth, baseHeight)));
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return false;
        ctx.drawImage(baseImage, 0, 0, sampleSize, sampleSize);
        const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 255) return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const hasAlpha = detectTransparency();

    const pngScales = hasAlpha
      ? [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3]
      : [0.95, 0.9, 0.85, 0.8];
    for (const scale of pngScales) {
      const w = baseWidth * scale;
      const h = baseHeight * scale;
      const candidate = renderImageDataUrl(baseImage, w, h, 'image/png');
      if (estimateDataUrlBytes(candidate) <= MAX_PRINTIFY_PAYLOAD_BYTES) {
        return candidate;
      }
    }

    if (hasAlpha) {
      console.warn('Design image contains transparency; flattening to JPEG to satisfy Printify upload limits.');
    }
    const qualities = [0.92, 0.85, 0.75, 0.65, 0.55];
    for (const q of qualities) {
      const candidate = renderImageDataUrl(baseImage, baseWidth, baseHeight, 'image/jpeg', q);
      if (estimateDataUrlBytes(candidate) <= MAX_PRINTIFY_PAYLOAD_BYTES) {
        return candidate;
      }
    }

    // If converting alone isn't enough, progressively downscale while keeping quality reasonable.
    let scale = 0.9;
    while (scale >= 0.4) {
      const width = baseWidth * scale;
      const height = baseHeight * scale;
      const candidate = renderImageDataUrl(baseImage, width, height, 'image/jpeg', 0.75);
      if (estimateDataUrlBytes(candidate) <= MAX_PRINTIFY_PAYLOAD_BYTES) {
        return candidate;
      }
      scale -= 0.1;
    }
    // Final fallback: aggressive compression.
    const aggressive = renderImageDataUrl(baseImage, baseWidth * 0.3, baseHeight * 0.3, 'image/jpeg', 0.65);
    const aggressiveBytes = estimateDataUrlBytes(aggressive);
    if (aggressiveBytes > MAX_PRINTIFY_PAYLOAD_BYTES) {
      console.warn('Design still exceeds Printify upload limit after aggressive compression', {
        bytes: aggressiveBytes,
      });
    }
    return aggressive;
  } catch {
    return dataUrl;
  }
};

export const generatePrintifyMockup = async ({ product, designDataUrl, title, description }: GenerateMockupOptions): Promise<{ productId: string; previewUrl?: string }> => {
  // 1) Optionally fit image to provider placeholder (AOP products need full-bleed cover)
  const apparelTypes = new Set(['T-Shirt', 'Hoodie']);

  const maybeFitToPlaceholder = async (dataUrl: string): Promise<string> => {
    try {
      const fullBleedTypes = new Set([
        'Phone Case', 'Tote Bag', 'Blanket', 'Pillow', 'Poster', 'Canvas', 'Sticker', 'Journal',
        ...Array.from(apparelTypes),
      ]);
      if (!fullBleedTypes.has(product.type as any)) return dataUrl;
      const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
      const list: any[] = Array.isArray((variants as any)?.variants)
        ? (variants as any).variants
        : (Array.isArray(variants) ? (variants as any) : []);
      const targetVariantId: number = (product as any).default_variant_id || list[0]?.id;
      const variant = list.find((v: any) => v.id === targetVariantId) || list[0];
      const ph = (variant?.placeholders || []).find((p: any) => p.position === (product.printAreaPosition || 'front')) || variant?.placeholders?.[0];
      const targetW = Math.max(1, ph?.width || 1326);
      const targetH = Math.max(1, ph?.height || 2045);

      // For phone cases, match placeholder pixels exactly with overscan to guarantee full coverage
      if (product.type === 'Phone Case') {
        const fittedExact = await coverToExactPixels(dataUrl, targetW, targetH, 1.5);
        return fittedExact || dataUrl;
      }
      let bleed = (product.blueprint_id === 326 ? 1.12 : 1.04);
      if (apparelTypes.has(product.type as any)) {
        bleed = 1.35;
      }
      const fitted = await fitImageToSize(dataUrl, targetW, targetH, bleed);
      return fitted || dataUrl;
    } catch {
      return dataUrl;
    }
  };

  let preparedDataUrl = designDataUrl;

  if (!preparedDataUrl.startsWith('data:')) {
    const downloaded = await downloadImageAsDataUrl(preparedDataUrl);
    if (downloaded) {
      preparedDataUrl = downloaded;
    }
  }

  if (preparedDataUrl.startsWith('data:')) {
    preparedDataUrl = await maybeFitToPlaceholder(preparedDataUrl);
    preparedDataUrl = await ensurePrintifySafeSize(preparedDataUrl);
  }

  // 1a) Upload design directly to Printify. Using base64 avoids the ImgBB 32 MB cap.
  logger.info('Mockup flow: uploading design to Printify');
  let uploadId: string | undefined;
  if (preparedDataUrl.startsWith('data:')) {
    const base64 = extractBase64(preparedDataUrl);
    const ext = preparedDataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
    const uploadRes = await printifyService.uploadImageFromBase64(`AI_Design_${Date.now()}.${ext}`, base64);
    uploadId = uploadRes?.id;
  } else {
    console.warn('Printify mockup falling back to URL upload (image may be inaccessible to Printify)', { preparedDataUrl });
    const uploadRes = await printifyService.uploadImageByUrl('design.png', preparedDataUrl);
    uploadId = uploadRes?.id;
  }
  if (!uploadId) {
    throw new Error('Failed to upload design image to Printify');
  }

  // 1b) Discover a catalog mockup image to show while we wait
  let catalogMockupUrl: string | undefined;
  try {
    const blueprint = await printifyService.getBlueprint(product.blueprint_id);
    try {
      const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
      const list: any[] = Array.isArray((variants as any)?.variants)
        ? (variants as any).variants
        : (Array.isArray(variants) ? (variants as any) : []);
      const first = list.find((v: any) => v.is_default || v.is_available || v.is_enabled) || list[0];
      const preview = first?.images?.[0]?.src || first?.preview || first?.images?.[0];
      catalogMockupUrl = preview || blueprint?.images?.[0];
    } catch {
      catalogMockupUrl = (blueprint as any)?.images?.[0];
    }
  } catch {}

  // 2) Collect all valid variant ids for this blueprint/provider (enable all)
  let cachedVariants: any[] = [];
  let selectedVariantId: number = (product as any).default_variant_id || 0;
  let variantIds: number[] = [];
  try {
    const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
    const list: any[] = Array.isArray((variants as any)?.variants)
      ? (variants as any).variants
      : (Array.isArray(variants) ? (variants as any) : []);
    cachedVariants = list;
    const preferred = list.find((v: any) => v.is_default || v.is_available || v.is_enabled) || list[0];
    if (preferred?.id) selectedVariantId = preferred.id;
    const subset = chooseVariantSubset(list, selectedVariantId);
    if (subset.ids.length > 0) {
      variantIds = subset.ids;
      if (subset.selectedId) selectedVariantId = subset.selectedId;
    } else {
      variantIds = list.map((v: any) => v.id).filter(Boolean);
    }
  } catch {}
  if (!selectedVariantId) selectedVariantId = 1;
  if (variantIds.length === 0) variantIds = [selectedVariantId];

  // Determine placement tuning for full coverage
  const fullBleedTypes = new Set([
    'Phone Case', 'Tote Bag', 'Blanket', 'Pillow', 'Poster', 'Canvas', 'Sticker', 'Journal',
    ...Array.from(apparelTypes),
  ]);
  const basePlacement = { x: 0.5, y: 0.5, scale: 1.0 } as { x: number; y: number; scale: number };
  const placement = { ...basePlacement };
  if (fullBleedTypes.has(product.type as any)) {
    placement.scale = 1.18; // slight overscan to eliminate edges on most AOP
    if (product.type === 'Tote Bag') {
      placement.scale = 1.28;
      placement.y = 0.46; // nudge upward to cover upper seam area in mockups
    } else if (product.type === 'Phone Case') {
      placement.scale = 1.2; // enlarge within placeholder to guarantee full-bleed
      placement.y = 0.5;
    } else if (apparelTypes.has(product.type as any)) {
      placement.scale = product.type === 'Hoodie' ? 1.55 : 1.6;
      placement.y = product.type === 'Hoodie' ? 0.49 : 0.51;
    }
  }

  // Some providers expose different placeholder positions; pick the best available
  const resolvePosition = async (): Promise<string> => {
    try {
      if (!cachedVariants.length) {
        const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
        cachedVariants = Array.isArray((variants as any)?.variants)
          ? (variants as any).variants
          : (Array.isArray(variants) ? (variants as any) : []);
      }
      const list: any[] = cachedVariants;
      const v = list.find((x: any) => x.id === selectedVariantId) || list[0];
      const positions = (v?.placeholders || []).map((p: any) => p.position);
      if (product.type === 'Phone Case' && positions.includes('back')) return 'back';
      if (positions.includes(product.printAreaPosition)) return product.printAreaPosition as any;
      if (positions.includes('front')) return 'front';
      return positions[0] || (product.printAreaPosition as any) || 'front';
    } catch {
      return (product.printAreaPosition as any) || 'front';
    }
  };
  const positionToUse = await resolvePosition();

  // 3) Create minimal product (no print_areas) like iOS
  const createData: any = {
    title: title || `${product.name} - Custom Design`,
    description: description || `Custom ${product.type} with uploaded design`,
    blueprint_id: product.blueprint_id,
    print_provider_id: product.print_provider_id,
    variants: variantIds.map(id => ({ id, price: Math.round(product.price * 100), is_enabled: true })),
    // Some shops require print_areas at creation time (code 8150). Provide it here with uploaded image id.
    print_areas: [
      {
        variant_ids: variantIds,
        placeholders: [
          {
            position: positionToUse,
            images: [
              {
                id: uploadId,
                x: placement.x,
                y: placement.y,
                scale: placement.scale,
                angle: 0,
              },
            ],
          },
        ],
      },
    ],
  };
  logger.info('Mockup flow: creating product draft', { blueprint_id: product.blueprint_id, print_provider_id: product.print_provider_id });
  const created = await printifyService.createProduct(createData);

  // 4) Optionally update product with image id (some shops require id instead of src)
  try {
    const updateData: any = {
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: positionToUse,
              images: [
                {
                  id: uploadId,
                  x: placement.x,
                  y: placement.y,
                  scale: placement.scale,
                  angle: 0,
                },
              ],
            },
          ],
        },
      ],
    };
    await printifyService.updateProduct(created.id, updateData);
  } catch (_) {}

  // 5) Poll for generated mockup
  const productId = created.id;
  const createdTitle: string | undefined = created.title;
  logger.info('Mockup flow: polling for generated mockup', { productId });
  // Initial settle delay to let Printify finish background processing
  await new Promise(r => setTimeout(r, 7000));
  const previewUrl = (await pollForMockup(productId, 60, createdTitle)) || catalogMockupUrl;
  return { productId, previewUrl };
};

const pollForMockup = async (productId: string, maxAttempts: number = 60, createdTitle?: string): Promise<string | undefined> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Attempt Etsy shop first when configured
      try {
        const etsyShop = (import.meta as any).env.VITE_PRINTIFY_ETSY_SHOP_ID;
        if (etsyShop) {
          const prod = await printifyService.getProductForShop(etsyShop, productId);
          const firstImage = prod.images?.find((img: any) => img.is_default) || prod.images?.[0];
          if (firstImage?.src) return firstImage.src;
          // If not found directly, list products and try to match by title or id prefix
          try {
            const base = (() => {
              try { const b = (import.meta as any).env?.VITE_API_BASE; if (b && String(b).trim()) return String(b).trim().replace(/\/$/, ''); } catch {}
              return '/api';
            })();
            const listReq = await fetch(`${base}/printify/etsy/products`);
            const list = await listReq.json().catch(() => []);
            const match = Array.isArray(list)
              ? list.find((p: any) => p.id === productId || (createdTitle && typeof p.title === 'string' && p.title.includes(createdTitle)))
              : null;
            const img = match?.images?.[0]?.src;
            if (img) return img;
          } catch {}
        }
      } catch {}
      const prod = await printifyService.getProduct(productId);
      const firstImage = prod.images?.find(img => img.is_default) || prod.images?.[0];
      if (firstImage?.src) {
        return firstImage.src;
      }
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return undefined;
};
