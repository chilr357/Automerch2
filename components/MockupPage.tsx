import React from 'react';
import { listProducts, updateProduct, type SavedProduct } from '../services/historyService';
import { generateAdfusionBatch } from '../services/adfusionService';

export const MockupPage: React.FC = () => {
  const [items, setItems] = React.useState<SavedProduct[]>([]);
  const [selected, setSelected] = React.useState<SavedProduct | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [genLoading, setGenLoading] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const data = await listProducts(); setItems(data); if (!selected && data.length) setSelected(data[0]); }
    finally { setLoading(false); }
  }, [selected]);

  React.useEffect(() => { load(); }, [load]);

  const regenerateMockups = async () => {
    if (!selected) return;
    setGenLoading(true);
    try {
      const mocks = await generateAdfusionBatch(selected.previewUrl || selected.designUrl || '', selected.productType);
      const updated = await updateProduct(selected.id, { adfusionMockups: mocks });
      setSelected(updated);
      setItems((prev) => prev.map(i => i.id === updated.id ? updated : i));
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Mockup Page</h1>
          <a href="/" className="underline">Back</a>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 rounded-2xl p-4">
            <h2 className="font-semibold mb-3">Recent Products</h2>
            {loading && <div className="text-sm opacity-80">Loading…</div>}
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-2">
              {items.map(it => (
                <button key={it.id} onClick={() => setSelected(it)} className={`w-full flex items-center gap-3 p-2 rounded-lg ${selected?.id===it.id?'bg-white/20':'bg-white/5 hover:bg-white/10'}`}>
                  {it.previewUrl && <img src={it.previewUrl} className="w-12 h-12 object-cover rounded" />}
                  <div className="text-left">
                    <div className="text-sm font-medium truncate">{it.title}</div>
                    <div className="text-xs opacity-70">{it.productType}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white/10 rounded-2xl p-4">
            {selected ? (
              <div>
                <h2 className="font-semibold mb-3">{selected.title}</h2>
                <div className="mb-4 flex items-center gap-3">
                  <button onClick={regenerateMockups} disabled={genLoading} className={`px-4 py-2 rounded-lg font-semibold ${genLoading? 'bg-white/20':'bg-green-500 hover:bg-green-600'} text-white`}>
                    {genLoading ? 'Generating…' : 'Generate mockups'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selected.previewUrl && (
                    <div className="col-span-1 md:col-span-3">
                      <img src={selected.previewUrl} className="w-full object-contain rounded-lg" />
                    </div>
                  )}
                  {(selected.adfusionMockups||[]).map((m,idx)=>(
                    <img key={idx} src={m} className="w-full object-cover rounded-lg" />
                  ))}
                  {(!selected.adfusionMockups||selected.adfusionMockups.length===0) && (
                    <div className="text-sm opacity-80">No adfusion mockups yet for this item.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="opacity-80">Select a product from the left.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


