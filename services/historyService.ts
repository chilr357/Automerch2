export interface SavedProduct {
  id: string;
  productId: string;
  productType: string;
  title: string;
  previewUrl?: string;
  designUrl?: string;
  blueprint_id: number;
  print_provider_id: number;
  variant_ids?: number[];
  created_at: string;
}

const BASE = (import.meta.env.VITE_API_BASE || '').toString().trim() || '';

export async function saveProduct(entry: Omit<SavedProduct, 'id' | 'created_at'> & Partial<Pick<SavedProduct,'id'|'created_at'>>): Promise<SavedProduct> {
  const res = await fetch(`${BASE}/history/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`Failed to save product: ${res.status}`);
  return res.json();
}

export async function listProducts(): Promise<SavedProduct[]> {
  const res = await fetch(`${BASE}/history/products`);
  if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
  return res.json();
}

export async function removeProduct(id: string): Promise<void> {
  const res = await fetch(`${BASE}/history/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
}


