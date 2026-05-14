import React from 'react';
import { listProducts, updateProduct, type SavedProduct } from '../services/historyService';
import { generateAdfusionBatch } from '../services/adfusionService';
import { generateVideosFromStills, generatePhoneCommercial } from '../services/videoAdService';

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

  const combinedMockups = React.useMemo(() => {
    const outputs: string[] = [];
    const seen = new Set<string>();
    const add = (value?: string) => {
      if (!value || typeof value !== 'string') return;
      const key = value.startsWith('data:') ? value.slice(0, 120) : value;
      if (seen.has(key)) return;
      seen.add(key);
      outputs.push(value);
    };
    if (selected?.designUrl) add(selected.designUrl);
    (selected?.adfusionMockups || []).forEach(add);
    return outputs;
  }, [selected?.designUrl, selected?.adfusionMockups]);

  const handlePreview = React.useCallback((asset: string) => {
    if (typeof window === 'undefined') return;
    try {
      const isVideo = asset.startsWith('data:video') || /\.(webm|mp4)(\?.*)?$/i.test(asset);
      const titleRaw = selected?.title ? `${selected.title} Mockup` : 'Mockup Preview';
      const titleEsc = titleRaw.replace(/"/g, '&quot;');
      const safeUrl = asset.replace(/"/g, '&quot;');
      const slugBase = (selected?.title || 'mockup').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mockup';
      const extension = (() => {
        if (isVideo) return asset.includes('.webm') ? 'webm' : 'mp4';
        const match = asset.match(/\.([a-z0-9]{3,4})(?:\?.*)?$/i);
        if (match) return match[1].toLowerCase();
        if (asset.startsWith('data:image/jpeg')) return 'jpg';
        if (asset.startsWith('data:image/webp')) return 'webp';
        if (asset.startsWith('data:image/gif')) return 'gif';
        return 'png';
      })();
      const filename = `${slugBase}.${extension}`;
      const media = isVideo
        ? `<video src="${safeUrl}" controls autoplay loop style="max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);"></video>`
        : `<img src="${safeUrl}" alt="${titleEsc}" style="max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);" />`;
      const html = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>${titleEsc}</title>
            <style>
              body { margin: 0; font-family: 'Inter', sans-serif; background: radial-gradient(circle at top, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%); color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 32px; }
              .wrap { max-width: min(90vw, 960px); width: 100%; text-align: center; }
              .title { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }
              .actions { margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
              .btn { padding: 12px 20px; border-radius: 999px; border: none; font-weight: 600; cursor: pointer; text-decoration: none; transition: transform 150ms ease, box-shadow 200ms ease; box-shadow: 0 12px 30px rgba(59, 130, 246, 0.18); background: linear-gradient(135deg, #6366f1, #ec4899); color: white; }
              .btn:hover { transform: translateY(-2px); box-shadow: 0 18px 36px rgba(99, 102, 241, 0.3); }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="title">${titleEsc}</div>
              <div>${media}</div>
              <div class="actions">
                <a href="${safeUrl}" download="${filename}" class="btn">⬇️ Download</a>
                <button class="btn" onclick="window.close()">✖️ Close</button>
              </div>
            </div>
          </body>
        </html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const previewUrl = URL.createObjectURL(blob);
      const win = window.open(previewUrl, '_blank', 'noopener,noreferrer,width=1200,height=900');
      if (!win) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      win.opener = null;
      setTimeout(() => URL.revokeObjectURL(previewUrl), 60_000);
    } catch (error) {
      console.error('Preview window failed', error);
    }
  }, [selected?.title]);

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
      const result = await generateAdfusionBatch(selected.previewUrl || selected.designUrl || '', selected.productType);
      const dedupe = (values: string[]): string[] => {
        const map = new Map<string, string>();
        values.forEach((value) => {
          if (!value) return;
          const key = value.startsWith('data:') ? value.slice(0, 120) : value;
          if (!map.has(key)) map.set(key, value);
        });
        return Array.from(map.values());
      };
      const baseAssets = dedupe([...(result?.stills || []), ...(result?.videos || [])]);
      let finalMocks = baseAssets;
      // Optionally append video ads (phone-only uses dedicated commercial)
      const enableVideos = (() => {
        try { const v = (import.meta as any).env?.VITE_ENABLE_VIDEO_ADS; return v === '1' || String(v).toLowerCase() === 'true'; } catch { return false; }
      })();
      const alreadyHasVideo = finalMocks.some((m) => typeof m === 'string' && (m.startsWith('data:video') || /\.(mp4|webm)(\?.*)?$/i.test(m)));
      if (enableVideos && !alreadyHasVideo) {
        try {
          let vids: string[] = [];
          if (selected.productType === 'Phone Case' && (selected.previewUrl || selected.designUrl)) {
            const src = selected.previewUrl || selected.designUrl || '';
            try { const v1 = await generatePhoneCommercial(src); if (v1) vids = [v1]; } catch {}
          } else {
            const imageAssets = finalMocks.filter((asset) => !(asset.startsWith('data:video') || /\.(mp4|webm)(\?.*)?$/i.test(asset)));
            if (imageAssets.length >= 2) {
              vids = await generateVideosFromStills(imageAssets[0], imageAssets[1]);
            }
          }
          if (vids.length) finalMocks = dedupe([...finalMocks, ...vids]);
        } catch {}
      }
      finalMocks = dedupe(finalMocks);
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
                  {combinedMockups.map((m,idx)=>{
                    const isVideo = typeof m === 'string' && (m.startsWith('data:video') || /\.(webm|mp4)(\?.*)?$/i.test(m));
                    const isOriginal = Boolean(selected?.designUrl) && idx === 0;
                    const badge = (
                      <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
                        <span className="rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-white">#{idx + 1}</span>
                        {isOriginal && (
                          <span className="rounded bg-black/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide">Original Design</span>
                        )}
                      </div>
                    );
                    return isVideo ? (
                      <button type="button" key={idx} onClick={() => handlePreview(m)} className="relative group focus:outline-none">
                        {badge}
                        <video src={m} className="w-full rounded-lg group-hover:ring-2 group-hover:ring-pink-400" controls autoPlay muted loop playsInline />
                      </button>
                    ) : (
                      <button type="button" key={idx} onClick={() => handlePreview(m)} className="relative group focus:outline-none">
                        {badge}
                        <img src={m} className="w-full object-cover rounded-lg group-hover:ring-2 group-hover:ring-pink-400" />
                      </button>
                    );
                  })}
                  {combinedMockups.length === 0 && (
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
