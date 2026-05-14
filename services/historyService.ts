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
    const explicit = (import.meta as any).env?.VITE_HISTORY_API_BASE;
    if (explicit && String(explicit).trim()) return String(explicit).trim().replace(/\/$/, '');
  } catch {}
  try {
    const fromEnv = (import.meta as any).env?.VITE_API_BASE;
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim().replace(/\/$/, '');
  } catch {}
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }
  return '/api';
})();

const LOCAL_STORAGE_KEY = 'automerch.history.products.v1';
const MAX_HISTORY_ITEMS = 500;

const canUseLocalStorage = () => {
  try { return typeof window !== 'undefined' && !!window.localStorage; } catch { return false; }
};

const readLocalHistory = (): SavedProduct[] => {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalHistory = (items: SavedProduct[]) => {
  if (!canUseLocalStorage()) return;
  try { window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS))); } catch {}
};

const upsertLocalHistory = (item: SavedProduct) => {
  const items = readLocalHistory();
  const filtered = items.filter((p) => String(p.id) !== String(item.id));
  writeLocalHistory([item, ...filtered]);
};

const removeLocalHistory = (id: string) => {
  const items = readLocalHistory().filter((p) => String(p.id) !== String(id));
  writeLocalHistory(items);
};

const buildLocalItem = (
  entry: Omit<SavedProduct, 'id' | 'created_at'> & Partial<Pick<SavedProduct, 'id' | 'created_at'>>,
): SavedProduct => {
  const now = entry.created_at || new Date().toISOString();
  const id = entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { ...(entry as SavedProduct), id, created_at: now };
};

export async function saveProduct(entry: Omit<SavedProduct, 'id' | 'created_at'> & Partial<Pick<SavedProduct,'id'|'created_at'>>): Promise<SavedProduct> {
  try {
    const res = await fetch(`${BASE}/history/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`Failed to save product: ${res.status}`);
    const saved: SavedProduct = await res.json();
    upsertLocalHistory(saved);
    return saved;
  } catch (error) {
    if (canUseLocalStorage()) {
      const localItem = buildLocalItem(entry);
      upsertLocalHistory(localItem);
      return localItem;
    }
    throw error instanceof Error ? error : new Error('Failed to save product');
  }
}

export async function listProducts(): Promise<SavedProduct[]> {
  try {
    const res = await fetch(`${BASE}/history/products`);
    if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
    const items: SavedProduct[] = await res.json();
    if (Array.isArray(items)) writeLocalHistory(items);
    return items;
  } catch (error) {
    if (canUseLocalStorage()) {
      return readLocalHistory();
    }
    throw error instanceof Error ? error : new Error('Failed to load history');
  }
}

export async function removeProduct(id: string): Promise<void> {
  try {
    const res = await fetch(`${BASE}/history/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete item: ${res.status}`);
    removeLocalHistory(id);
  } catch (error) {
    if (canUseLocalStorage()) {
      removeLocalHistory(id);
      return;
    }
    throw error instanceof Error ? error : new Error('Failed to delete item');
  }
}

export async function updateProduct(id: string, data: Partial<SavedProduct>): Promise<SavedProduct> {
  const url = `${BASE}/history/products/${id}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated: SavedProduct = await res.json();
      upsertLocalHistory(updated);
      return updated;
    }
    if (res.status === 404) {
      const merged: any = { id, ...(data || {}) };
      return saveProduct(merged);
    }
    throw new Error(`Failed to update item: ${res.status}`);
  } catch (error) {
    if (canUseLocalStorage()) {
      const localItems = readLocalHistory();
      const idx = localItems.findIndex((p) => String(p.id) === String(id));
      if (idx >= 0) {
        const updated = { ...localItems[idx], ...(data || {}), id: localItems[idx].id } as SavedProduct;
        upsertLocalHistory(updated);
        return updated;
      }
      const created = buildLocalItem({ id, ...(data || {}) } as any);
      upsertLocalHistory(created);
      return created;
    }
    throw error instanceof Error ? error : new Error('Failed to update item');
  }
}
