import React from 'react';
import { listProducts, type SavedProduct, removeProduct } from '../services/historyService';

export const PreviousProducts: React.FC<{ onSelect?: (url: string) => void }> = ({ onSelect }) => {
  const [items, setItems] = React.useState<SavedProduct[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const onRemove = async (id: string) => {
    try { await removeProduct(id); await load(); } catch {}
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Previous Products</h2>
        <button className="text-sm underline" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {error && <div className="text-red-300 text-sm mb-3">{error}</div>}
      {items.length === 0 && !loading && (
        <p className="text-white/70">No products yet. Apply a design to see it here.</p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map(item => (
          <div key={item.id} className="relative group shrink-0 cursor-pointer" onClick={() => item.previewUrl && onSelect?.(item.previewUrl)}>
            {item.previewUrl && (
              <img
                src={item.previewUrl}
                alt={item.title}
                className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shadow-md"
              />
            )}
            <button
              onClick={() => onRemove(item.id)}
              className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="Remove"
            >
              ×
            </button>
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition p-2 flex items-end">
              <div className="w-full text-[10px] leading-tight">
                <div className="font-semibold line-clamp-2">{item.title}</div>
                <div className="opacity-80 mt-0.5">{item.productType}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


