export interface SavedProduct {
  id: string;
  productId: string;
  productType: string;
  title: string;
  previewUrl?: string;
  designUrl?: string;
  adfusionMockups?: string[];
  blueprint_id: number;
  print_provider_id: number;
  variant_ids?: number[];
  created_at: string;
}

const BASE = (() => {
  try {
    const fromEnv = (import.meta as any).env?.VITE_API_BASE;
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim().replace(/\/$/, '');
  } catch {}
  // Default to local proxy base
  return '/api';
})();

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

export async function updateProduct(id: string, data: Partial<SavedProduct>): Promise<SavedProduct> {
  const url = `${BASE}/history/products/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.ok) return res.json();
  // If the record is missing (404), create it instead
  if (res.status === 404) {
    const merged: any = { id, ...(data || {}) };
    return saveProduct(merged);
  }
  throw new Error(`Failed to update item: ${res.status}`);
}
