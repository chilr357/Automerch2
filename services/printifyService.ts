import { logger } from './logger';
/**
 * Printify API Service
 * Print-on-demand product creation and fulfillment
 */

interface CacheRecord<T> {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
}

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes caching for catalog responses
const MAX_RETRY_ATTEMPTS = 3;
const MIN_RETRY_DELAY_MS = 750;

export interface PrintifyBlueprint {
  id: number;
  title: string;
  brand: string;
  model: string;
  images: string[];
  variants: Array<{
    id: number;
    sku: string;
    cost: number;
    price: number;
    title: string;
    grams: number;
    is_enabled: boolean;
    is_default: boolean;
    is_available: boolean;
    options: number[];
  }>;
}

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  options: Array<{
    name: string;
    type: string;
    values: string[];
  }>;
  variants: Array<{
    id: number;
    sku: string;
    cost: number;
    price: number;
    title: string;
    grams: number;
    is_enabled: boolean;
    is_default: boolean;
    is_available: boolean;
    options: number[];
  }>;
  images: Array<{
    src: string;
    variant_ids: number[];
    position: string;
    is_default: boolean;
    is_selected_for_publishing: boolean;
  }>;
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked: boolean;
  external: {
    id: string;
    handle: string;
  };
}

export interface CreateProductOptions {
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: Array<{
    id: number;
    price: number;
    is_enabled: boolean;
  }>;
  print_areas: Array<{
    variant_ids: number[];
    placeholders: Array<{
      position: string;
      images: Array<{
        id: string;
        x: number;
        y: number;
        scale: number;
        angle: number;
      }>;
    }>;
  }>;
}

class PrintifyService {
  private apiKey: string;
  private shopId: string;
  private baseUrl = (() => {
    try {
      const v = (import.meta as any).env?.VITE_API_BASE;
      if (v && String(v).trim()) return String(v).trim().replace(/\/$/, '');
    } catch {}
    // Default to local proxy (never hit Printify directly from the client)
    return '/api';
  })();
  private etsyShopId: string | undefined = (import.meta.env.VITE_PRINTIFY_ETSY_SHOP_ID || '') as string;
  private blueprintListCache: CacheRecord<PrintifyBlueprint[]> | null = null;
  private blueprintCache = new Map<number, CacheRecord<PrintifyBlueprint>>();
  private variantsCache = new Map<string, CacheRecord<any[]>>();

  constructor() {
    this.apiKey = import.meta.env.VITE_PRINTIFY_API_KEY;
    this.shopId = import.meta.env.VITE_PRINTIFY_SHOP_ID;
    
    // When using proxy, keys live on server. Allow client to run without exposing keys.
  }

  private getCachedPromise<T>(record: CacheRecord<T> | undefined | null): Promise<T> | null {
    if (!record) return null;
    const now = Date.now();
    if (record.value && record.expiresAt > now) {
      return Promise.resolve(record.value);
    }
    if (record.promise && record.expiresAt > now) {
      return record.promise;
    }
    return null;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const baseHeaders = this.baseUrl.includes('api.printify.com')
      ? { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
    const customHeaders = options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : { ...(options.headers as Record<string, string> | undefined) };
    const requestBody = options.body;
    const method = options.method || 'GET';

    let lastStatus = 0;
    let lastErrorText = '';

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      logger.debug('Printify request', { url, method, attempt: attempt + 1 });
      const headers = { ...baseHeaders, ...customHeaders } as Record<string, string>;
      if (requestBody instanceof FormData) {
        delete headers['Content-Type'];
      }

      const response = await fetch(url, {
        ...options,
        method,
        body: requestBody,
        headers,
      });

      if (response.ok) {
        if (response.status === 204) {
          logger.debug('Printify response', { url, status: response.status, ok: true });
          return {};
        }
        const json = await response.json().catch(() => ({}));
        logger.debug('Printify response', { url, status: response.status, ok: true });
        return json;
      }

      lastStatus = response.status;
      lastErrorText = await response.text().catch(() => '');
      logger.warn('Printify error', { url, status: response.status, body: lastErrorText, attempt: attempt + 1 });

      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRY_ATTEMPTS - 1) {
        const retryHeader = response.headers.get('retry-after');
        const retryDelay = retryHeader ? Number(retryHeader) * 1000 : MIN_RETRY_DELAY_MS * (attempt + 1);
        const delay = Number.isFinite(retryDelay) && retryDelay > 0 ? retryDelay : MIN_RETRY_DELAY_MS;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      break;
    }

    let message = 'Unknown error';
    let detail = '';
    try {
      const parsed = JSON.parse(lastErrorText || '{}');
      const errorNode = parsed?.error || parsed;
      message = errorNode?.message || parsed?.message || message;
      if (errorNode?.errors) {
        detail = Object.entries(errorNode.errors)
          .flatMap(([field, value]) => {
            const values = Array.isArray(value) ? value : [value];
            return values.map((v) => `${field}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
          })
          .join('; ');
      }
    } catch {}
    const suffix = detail ? ` (${detail})` : '';
    throw new Error(`Printify API error: ${lastStatus} - ${message}${suffix}`);
  }

  async uploadImageFromBase64(fileName: string, base64Contents: string): Promise<{ id: string }> {
    try {
      logger.info('Uploading image to Printify');
      const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
      const path = this.baseUrl.includes('api.printify.com') ? '/uploads/images.json' : `${prefix}/upload`;
      const data = await this.makeRequest(path, {
        method: 'POST',
        body: JSON.stringify({
          file_name: fileName,
          contents: base64Contents,
        }),
      });
      return data; // expects { id }
    } catch (error) {
      console.error('Error uploading image to Printify:', error);
      throw new Error(`Failed to upload image to Printify: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadImageByUrl(fileName: string, url: string): Promise<{ id: string }> {
    try {
      logger.info('Uploading image to Printify by URL');
      const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
      const path = this.baseUrl.includes('api.printify.com') ? '/uploads/images.json' : `${prefix}/upload`;
      const data = await this.makeRequest(path, {
        method: 'POST',
        body: JSON.stringify({
          file_name: fileName,
          url,
        }),
      });
      return data; // expects { id }
    } catch (error) {
      console.error('Error uploading image URL to Printify:', error);
      throw new Error(`Failed to upload image URL to Printify: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBlueprints(): Promise<PrintifyBlueprint[]> {
    const cached = this.getCachedPromise(this.blueprintListCache);
    if (cached) return cached;

    const now = Date.now();
    const promise = (async () => {
      try {
        const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
        const suffix = this.baseUrl.includes('api.printify.com') ? '.json' : '';
        const data = await this.makeRequest(`${prefix}/catalog/blueprints${suffix}`);
        const value = data || [];
        this.blueprintListCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
      } catch (error) {
        this.blueprintListCache = null;
        console.error('Error fetching blueprints:', error);
        throw new Error(`Failed to fetch blueprints: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();

    this.blueprintListCache = { promise, expiresAt: now + CACHE_TTL_MS };
    return promise;
  }

  async getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
    const cached = this.getCachedPromise(this.blueprintCache.get(blueprintId));
    if (cached) return cached;

    const promise = (async () => {
      try {
        const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
        const data = await this.makeRequest(`${prefix}/catalog/blueprints/${blueprintId}`);
        this.blueprintCache.set(blueprintId, { value: data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
      } catch (error) {
        this.blueprintCache.delete(blueprintId);
        console.error('Error fetching blueprint:', error);
        throw new Error(`Failed to fetch blueprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();

    this.blueprintCache.set(blueprintId, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
    return promise;
  }

  async getPrintProviders(blueprintId: number): Promise<any[]> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
      const suffix = this.baseUrl.includes('api.printify.com') ? '.json' : '';
      const data = await this.makeRequest(`${prefix}/catalog/blueprints/${blueprintId}/print_providers${suffix}`);
      return data || [];
    } catch (error) {
      console.error('Error fetching print providers:', error);
      throw new Error(`Failed to fetch print providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVariants(blueprintId: number, providerId: number): Promise<any[]> {
    const cacheKey = `${blueprintId}:${providerId}`;
    const cached = this.getCachedPromise(this.variantsCache.get(cacheKey));
    if (cached) return cached;

    const promise = (async () => {
      try {
        const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
        const data = await this.makeRequest(`${prefix}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`);
        const value = data || [];
        this.variantsCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
        return value;
      } catch (error) {
        this.variantsCache.delete(cacheKey);
        console.error('Error fetching variants:', error);
        throw new Error(`Failed to fetch variants: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();

    this.variantsCache.set(cacheKey, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
    return promise;
  }

  async getProducts(): Promise<PrintifyProduct[]> {
    try {
      logger.info('Fetching products');
      const prefix = this.baseUrl.includes('api.printify.com') ? `/shops/${this.shopId}` : '/printify';
      const data = await this.makeRequest(`${prefix}/products`);
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProduct(productId: string): Promise<PrintifyProduct> {
    try {
      logger.info('Fetching product', { productId });
      const prefix = this.baseUrl.includes('api.printify.com')
        ? `/shops/${this.shopId}`
        : (this.etsyShopId ? '/printify/etsy' : '/printify');
      const data = await this.makeRequest(`${prefix}/products/${productId}`);
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProductForShop(shopId: string | number, productId: string): Promise<PrintifyProduct> {
    try {
      logger.info('Fetching product for shop', { shopId, productId });
      if (this.baseUrl.includes('api.printify.com')) {
        return this.makeRequest(`/shops/${shopId}/products/${productId}.json`);
      }
      const isEtsy = String(shopId) === String(this.etsyShopId || '');
      const prefix = isEtsy ? '/printify/etsy' : '/printify';
      return this.makeRequest(`${prefix}/products/${productId}`);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createProduct(productData: CreateProductOptions): Promise<PrintifyProduct> {
    try {
      logger.info('Creating product draft in Printify');
      const prefix = this.baseUrl.includes('api.printify.com') ? `/shops/${this.shopId}` : (this.etsyShopId ? '/printify/etsy' : '/printify');
      const data = await this.makeRequest(`${prefix}/products`, {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProduct(productId: string, productData: Partial<CreateProductOptions>): Promise<PrintifyProduct> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? `/shops/${this.shopId}` : (this.etsyShopId ? '/printify/etsy' : '/printify');
      const data = await this.makeRequest(`${prefix}/products/${productId}` , {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? `/shops/${this.shopId}` : '/printify';
      await this.makeRequest(`${prefix}/products/${productId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishProduct(productId: string): Promise<any> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? `/shops/${this.shopId}` : (this.etsyShopId ? '/printify/etsy' : '/printify');
      const path = this.baseUrl.includes('api.printify.com')
        ? `${prefix}/products/${productId}/publish.json`
        : `${prefix}/products/${productId}/publish`;
      const data = await this.makeRequest(path, {
        method: 'POST',
        body: JSON.stringify({
          title: true,
          description: true,
          images: true,
          variants: true,
          tags: true,
          keyFeatures: true,
          shipping_template: true,
          retail_prices: true,
        }),
      });
      return data;
    } catch (error) {
      console.error('Error publishing product:', error);
      throw new Error(`Failed to publish product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const printifyService = new PrintifyService();
