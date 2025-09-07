export interface Product {
  id: number;
  name: string;
  type: 'T-Shirt' | 'Hoodie' | 'Mug' | 'Phone Case' | 'Tote Bag';
  price: number;
  mockupUrl: string;
  blueprint_id: number;
  print_provider_id: number;
  printAreaPosition: 'front' | 'default';
}
