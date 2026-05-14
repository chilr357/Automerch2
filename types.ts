export interface Product {
  id: number;
  name: string;
  type: 'T-Shirt' | 'Hoodie' | 'Mug' | 'Phone Case' | 'Tote Bag' | 'Poster' | 'Canvas' | 'Blanket' | 'Pillow' | 'Sticker' | 'Journal';
  price: number;
  mockupUrl: string;
  blueprint_id: number;
  print_provider_id: number;
  printAreaPosition: 'front' | 'default' | 'large_center_embroidery';
}

export interface ProductScore {
  blueprintId: number;
  providerId: number;
  variantId?: number;
  category?: string;
  score: number;
  demandIndex: number;
  competitionIndex: number;
  profitEstimate?: number;
  trending?: boolean;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredProduct {
  blueprint: {
    id: number;
    title: string;
    brand?: string;
    model?: string;
    defaultImage?: string;
  };
  variant?: {
    id: number;
    title: string;
    price?: number;
    isDefault?: boolean;
    isAvailable?: boolean;
    isEnabled?: boolean;
  };
  providerId: number;
  category: string;
  score: ProductScore;
  lastUpdated: string;
}

export interface AdfusionResult {
  success: boolean;
  stills: string[];
  videos: string[];
  scenario?: string;
  error?: string;
}

export interface AdfusionIntegrationResult {
  success: boolean;
  uploadedImageId?: string;
  generatedVideos?: string[];
  error?: string;
}
