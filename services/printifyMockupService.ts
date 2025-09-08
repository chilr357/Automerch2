import type { Product } from '../types';
import { printifyService } from './printifyService';
import { uploadBase64Image } from './imgbbService';
import { logger } from './logger';
import { fitImageToSize } from './utils/imageFit';

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

export const generatePrintifyMockup = async ({ product, designDataUrl, title, description }: GenerateMockupOptions): Promise<{ productId: string; previewUrl?: string }> => {
  // 1) Optionally fit image to provider placeholder (AOP products need full-bleed cover)
  const maybeFitToPlaceholder = async (dataUrl: string): Promise<string> => {
    try {
      const fullBleedTypes = new Set([
        'Phone Case', 'Tote Bag', 'Blanket', 'Pillow', 'Poster', 'Canvas', 'Sticker', 'Journal'
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

      // Slight bleed to ensure no white edges on cut/hem
      const bleed = (product.type === 'Phone Case' ? 1.0 : (product.blueprint_id === 326 ? 1.12 : 1.04));
      const fitted = await fitImageToSize(dataUrl, targetW, targetH, bleed);
      return fitted || dataUrl;
    } catch {
      return dataUrl;
    }
  };

  const preparedDataUrl = designDataUrl.startsWith('data:')
    ? await maybeFitToPlaceholder(designDataUrl)
    : designDataUrl;

  // 1a) Ensure we have an HTTP image URL (host data URLs on ImgBB first)
  logger.info('Mockup flow: uploading design to Printify');
  const imageUrl = preparedDataUrl.startsWith('data:')
    ? await uploadBase64Image(preparedDataUrl, `AI_Design_${Date.now()}.png`)
    : preparedDataUrl;

  // Upload the URL to Printify to obtain an uploadId for creation-time print_areas
  const uploadRes = await printifyService.uploadImageByUrl('design.png', imageUrl);
  const uploadId = uploadRes.id;

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
  let selectedVariantId: number = (product as any).default_variant_id || 0;
  let variantIds: number[] = [];
  try {
    const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
    const list: any[] = Array.isArray((variants as any)?.variants)
      ? (variants as any).variants
      : (Array.isArray(variants) ? (variants as any) : []);
    variantIds = list.map((v: any) => v.id).filter(Boolean);
    const preferred = list.find((v: any) => v.is_default || v.is_available || v.is_enabled) || list[0];
    if (preferred?.id) selectedVariantId = preferred.id;
  } catch {}
  if (!selectedVariantId) selectedVariantId = 1;
  if (variantIds.length === 0) variantIds = [selectedVariantId];

  // Determine placement tuning for full coverage
  const fullBleedTypes = new Set([
    'Phone Case', 'Tote Bag', 'Blanket', 'Pillow', 'Poster', 'Canvas', 'Sticker', 'Journal'
  ]);
  const basePlacement = { x: 0.5, y: 0.5, scale: 1.0 } as { x: number; y: number; scale: number };
  const placement = { ...basePlacement };
  if (fullBleedTypes.has(product.type as any)) {
    placement.scale = 1.18; // slight overscan to eliminate edges on most AOP
    if (product.type === 'Tote Bag') {
      placement.scale = 1.28;
      placement.y = 0.46; // nudge upward to cover upper seam area in mockups
    } else if (product.type === 'Phone Case') {
      placement.scale = 1.0; // replicate ai-agent-project placement (centered, no overscan)
      placement.y = 0.5;
    }
  }

  // Some providers expose different placeholder positions; pick the best available
  const resolvePosition = async (): Promise<string> => {
    try {
      const variants = await printifyService.getVariants(product.blueprint_id, product.print_provider_id);
      const list: any[] = Array.isArray((variants as any)?.variants)
        ? (variants as any).variants
        : (Array.isArray(variants) ? (variants as any) : []);
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
            const listReq = await fetch(`${(import.meta as any).env.VITE_API_BASE}/printify/etsy/products`);
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


