import React from 'react';
import { listProducts, updateProduct, type SavedProduct } from '../services/historyService';
import { generateAdfusionBatch } from '../services/adfusionService';
import { generateVideosFromStills } from '../services/videoAdService';

export const MockupPage: React.FC = () => {
  const [items, setItems] = React.useState<SavedProduct[]>([]);
  const [selected, setSelected] = React.useState<SavedProduct | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [genLoading, setGenLoading] = React.useState<boolean>(false);
  const [autoRefreshing, setAutoRefreshing] = React.useState<boolean>(false);
  const initialAuto = React.useMemo(() => {
    try {
      const v = (import.meta as any).env?.VITE_AUTO_REFRESH_VIDEOS;
      if (v === '1' || String(v).toLowerCase() === 'true') return true;
    } catch {}
    try {
      const v2 = (import.meta as any).env?.VITE_ENABLE_VIDEO_ADS;
      if (v2 === '1' || String(v2).toLowerCase() === 'true') return true;
    } catch {}
    return false;
  }, []);
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(initialAuto);

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
      let finalMocks = mocks;
      // Optionally append two video ads from the first two stills
      const enableVideos = (() => {
        try { const v = (import.meta as any).env?.VITE_ENABLE_VIDEO_ADS; return v === '1' || String(v).toLowerCase() === 'true'; } catch { return false; }
      })();
      if (enableVideos && mocks.length >= 2) {
        try {
          const vids = await generateVideosFromStills(mocks[0], mocks[1]);
          finalMocks = [...mocks, ...vids];
        } catch {}
      }
      const updated = await updateProduct(selected.id, { adfusionMockups: finalMocks });
      setSelected(updated);
      setItems((prev) => prev.map(i => i.id === updated.id ? updated : i));

      // Optional auto-refresh: poll for appended videos for a short period
      if (autoRefresh) {
        try {
          await pollForVideos(updated.id, 12000, 1500);
        } catch {}
      }
    } finally {
      setGenLoading(false);
    }
  };

  const pollForVideos = async (id: string, timeoutMs = 12000, intervalMs = 1500) => {
    if (!id) return;
    setAutoRefreshing(true);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const data = await listProducts();
        setItems(data);
        const match = data.find((p) => p.id === id);
        if (match) {
          setSelected(match);
          const count = Array.isArray(match.adfusionMockups) ? match.adfusionMockups.length : 0;
          if (count >= 6) break; // videos appended
        }
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    setAutoRefreshing(false);
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
                  <label className="flex items-center gap-2 text-sm opacity-90">
                    <input type="checkbox" checked={autoRefresh} onChange={(e)=>setAutoRefresh(e.target.checked)} />
                    Auto-refresh for videos (10–12s)
                    {autoRefreshing && <span className="ml-2 text-xs opacity-70">refreshing…</span>}
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selected.previewUrl && (
                    <div className="col-span-1 md:col-span-3">
                      <img src={selected.previewUrl} className="w-full object-contain rounded-lg" />
                    </div>
                  )}
                  {(selected.adfusionMockups||[]).map((m,idx)=>{
                    const isVideo = typeof m === 'string' && (m.startsWith('data:video') || /\.(webm|mp4)(\?.*)?$/i.test(m));
                    return isVideo ? (
                      <video key={idx} src={m} className="w-full rounded-lg" controls autoPlay muted loop playsInline />
                    ) : (
                      <img key={idx} src={m} className="w-full object-cover rounded-lg" />
                    );
                  })}
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
