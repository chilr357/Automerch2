import { apiManager, ApiError } from './utils/apiManager';
import type { Product } from '../types';

type ListingState = 'draft' | 'active' | 'inactive' | 'sold_out';
	export interface ListingData {
  title: string;
  description: string;
  tags: string[];
  product: Product;
  previewUrl?: string | null;
  designUrl?: string | null;
  price: number;
  quantity: number;
}

export interface PublishResult {
  listingId: string;
  state: ListingState;
  url?: string;
  createdAt: string;
  source: 'etsy' | 'simulated';
}

const ETSY_RATE_LIMIT_MS = 1000;

const fallbackPublish = (data: ListingData): PublishResult => {
  return {
    listingId: `sim-${Date.now()}`,
    state: 'draft',
    url: undefined,
    createdAt: new Date().toISOString(),
    source: 'simulated',
  };
};

export const validateListingData = (data: ListingData): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  if (!data.title || data.title.length < 5) issues.push('Listing title is required.');
  if (!data.description || data.description.length < 40) issues.push('Listing description is required.');
  if (!data.tags || !data.tags.length) issues.push('At least one tag is required.');
  if (!data.price || data.price <= 0) issues.push('Price must be greater than zero.');
  if (!data.quantity || data.quantity <= 0) issues.push('Quantity must be at least one.');
  return { valid: issues.length === 0, issues };
};

export const publishListing = async (data: ListingData): Promise<PublishResult> => {
  const validation = validateListingData(data);
  if (!validation.valid) {
    throw new Error(`Listing validation failed: ${validation.issues.join(' ')}`);
  }

  try {
    const result = await apiManager.request<PublishResult>('/etsy/listings/publish', {
      method: 'POST',
      service: 'etsy',
      rateLimitMs: ETSY_RATE_LIMIT_MS,
      body: {
        ...data,
        blueprintId: data.product.blueprint_id,
        printProviderId: data.product.print_provider_id,
      },
    });
    if (!result?.listingId) {
      throw new Error('Missing listingId in response');
    }
    return { ...result, source: 'etsy' };
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('Etsy publish failed through API', error.payload || error.message);
    } else {
      console.warn('Etsy publish failed, using simulated response', error);
    }
    return fallbackPublish(data);
  }
};

export const getShopOrders = async (): Promise<any[]> => {
  try {
    const response = await apiManager.request<any[]>('/etsy/orders', {
      method: 'GET',
      service: 'etsy',
      rateLimitMs: ETSY_RATE_LIMIT_MS,
    });
    if (!Array.isArray(response)) return [];
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('Failed to load Etsy orders', error.payload || error.message);
      if (error.status === 401) {
        throw new Error('Etsy authentication required. Please reconnect your shop.');
      }
    } else {
      console.warn('Failed to load Etsy orders', error);
    }
    return [];
  }
};
