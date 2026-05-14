import { printifyService, type PrintifyBlueprint, type PrintifyProduct } from './printifyService';

export interface BlueprintSummary {
  id: number;
  title: string;
  brand?: string;
  model?: string;
  defaultImage?: string;
}

export interface VariantSummary {
  id: number;
  title: string;
  price?: number;
  isDefault?: boolean;
  isAvailable?: boolean;
  isEnabled?: boolean;
  options?: number[];
}

export interface ShopProductListOptions {
  limit?: number;
  includeDrafts?: boolean;
}

const pickBlueprintSummary = (blueprint: PrintifyBlueprint): BlueprintSummary => ({
  id: blueprint.id,
  title: blueprint.title,
  brand: blueprint.brand,
  model: blueprint.model,
  defaultImage: blueprint.images?.[0],
});

const pickVariantSummary = (variant: any): VariantSummary => ({
  id: Number(variant?.id),
  title: variant?.title ?? '',
  price: typeof variant?.price === 'number' ? variant.price : undefined,
  isDefault: Boolean(variant?.is_default),
  isAvailable: Boolean(variant?.is_available),
  isEnabled: Boolean(variant?.is_enabled),
  options: Array.isArray(variant?.options) ? variant.options : undefined,
});

export async function listBlueprints(): Promise<BlueprintSummary[]> {
  const raw = await printifyService.getBlueprints();
  if (!Array.isArray(raw)) return [];
  return raw.map(pickBlueprintSummary);
}

export async function getBlueprintDetails(blueprintId: number): Promise<{ blueprint: BlueprintSummary; variants: VariantSummary[]; providers: any[]; } | null> {
  if (!Number.isFinite(blueprintId)) return null;

  let blueprint: PrintifyBlueprint;
  try {
    blueprint = await printifyService.getBlueprint(blueprintId);
  } catch (error) {
    console.warn('printifyProductService: failed to load blueprint', blueprintId, error);
    return null;
  }

  let providers: any[] = [];
  try {
    const result = await printifyService.getPrintProviders(blueprintId);
    providers = Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn('printifyProductService: providers unavailable', blueprintId, error);
  }

  let variants: VariantSummary[] = [];
  const primaryProviderId = providers?.[0]?.id;
  if (primaryProviderId) {
    try {
      const rawVariants = await printifyService.getVariants(blueprintId, primaryProviderId);
      const list = Array.isArray((rawVariants as any)?.variants) ? (rawVariants as any).variants : rawVariants;
      variants = Array.isArray(list) ? list.map(pickVariantSummary) : [];
    } catch (error) {
      console.warn('printifyProductService: variants unavailable', blueprintId, primaryProviderId, error);
    }
  }

  return {
    blueprint: pickBlueprintSummary(blueprint),
    variants,
    providers,
  };
}

export async function listShopProducts(options: ShopProductListOptions = {}): Promise<PrintifyProduct[]> {
  const raw = await printifyService.getProducts();
  let items: PrintifyProduct[] = Array.isArray(raw) ? raw : [];
  if (!options.includeDrafts) {
    items = items.filter((product) => product.visible);
  }
  if (typeof options.limit === 'number' && options.limit > 0) {
    items = items.slice(0, options.limit);
  }
  return items;
}

export async function getProduct(productId: string): Promise<PrintifyProduct | null> {
  if (!productId) return null;
  try {
    return await printifyService.getProduct(productId);
  } catch (error) {
    console.warn('printifyProductService.getProduct failed', error);
    return null;
  }
}

export async function publishProduct(productId: string) {
  if (!productId) throw new Error('Product id is required');
  return printifyService.publishProduct(productId);
}


