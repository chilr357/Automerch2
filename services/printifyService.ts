import { logger } from './logger';
/**
 * Printify API Service
 * Print-on-demand product creation and fulfillment
 */

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
  private baseUrl = (import.meta.env.VITE_API_BASE || '').toString().trim() || 'https://api.printify.com/v1';
  private etsyShopId: string | undefined = (import.meta.env.VITE_PRINTIFY_ETSY_SHOP_ID || '') as string;

  constructor() {
    this.apiKey = import.meta.env.VITE_PRINTIFY_API_KEY;
    this.shopId = import.meta.env.VITE_PRINTIFY_SHOP_ID;
    
    // When using proxy, keys live on server. Allow client to run without exposing keys.
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug('Printify request', { url, method: options.method || 'GET' });
    const response = await fetch(url, {
      ...options,
      headers: this.baseUrl.includes('api.printify.com')
        ? {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
          }
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error('Printify error', { status: response.status, body: text });
      let message = 'Unknown error';
      try { message = JSON.parse(text).message; } catch {}
      throw new Error(`Printify API error: ${response.status} - ${message}`);
    }
    const json = await response.json().catch(() => ({}));
    logger.debug('Printify response', { url, ok: true });
    return json;
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
    try {
      const data = await this.makeRequest('/catalog/blueprints.json');
      return data || [];
    } catch (error) {
      console.error('Error fetching blueprints:', error);
      throw new Error(`Failed to fetch blueprints: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
      const data = await this.makeRequest(`${prefix}/catalog/blueprints/${blueprintId}`);
      return data;
    } catch (error) {
      console.error('Error fetching blueprint:', error);
      throw new Error(`Failed to fetch blueprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPrintProviders(blueprintId: number): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/catalog/blueprints/${blueprintId}/print_providers.json`);
      return data || [];
    } catch (error) {
      console.error('Error fetching print providers:', error);
      throw new Error(`Failed to fetch print providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVariants(blueprintId: number, providerId: number): Promise<any[]> {
    try {
      const prefix = this.baseUrl.includes('api.printify.com') ? '' : '/printify';
      const data = await this.makeRequest(`${prefix}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants`);
      return data || [];
    } catch (error) {
      console.error('Error fetching variants:', error);
      throw new Error(`Failed to fetch variants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      const path = this.baseUrl.includes('api.printify.com') ? `${prefix}/products/${productId}/publishing_succeeded.json` : `${prefix}/products/${productId}/publish`;
      const data = await this.makeRequest(path, { method: 'POST' });
      return data;
    } catch (error) {
      console.error('Error publishing product:', error);
      throw new Error(`Failed to publish product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const printifyService = new PrintifyService();
