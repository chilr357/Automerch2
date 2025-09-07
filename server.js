/* Simple proxy API server for Printify to avoid CORS and hide keys */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
// Simple request logger
app.use((req, _res, next) => {
  try { console.log(`[API] ${req.method} ${req.url}`); } catch {}
  next();
});
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PRINTIFY_API_KEY = process.env.VITE_PRINTIFY_API_KEY || process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.VITE_PRINTIFY_SHOP_ID || process.env.PRINTIFY_SHOP_ID;
const PRINTIFY_ETSY_SHOP_ID = process.env.PRINTIFY_ETSY_SHOP_ID || process.env.VITE_PRINTIFY_ETSY_SHOP_ID;
const BASE = 'https://api.printify.com/v1';

if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
  console.warn('Missing Printify credentials. Set VITE_PRINTIFY_API_KEY and VITE_PRINTIFY_SHOP_ID in .env.local');
}

const authHeaders = () => ({
  Authorization: `Bearer ${PRINTIFY_API_KEY}`,
  'Content-Type': 'application/json',
});

app.post('/api/printify/upload', async (req, res) => {
  try {
    const r = await fetch(`${BASE}/uploads/images.json`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/printify/products', async (req, res) => {
  try {
    const r = await fetch(`${BASE}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/printify/products/:id', async (req, res) => {
  try {
    const r = await fetch(`${BASE}/shops/${PRINTIFY_SHOP_ID}/products/${req.params.id}.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Catalog endpoints (blueprints/providers/variants)
app.get('/api/printify/catalog/blueprints', async (_req, res) => {
  try {
    const r = await fetch(`${BASE}/catalog/blueprints.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.get('/api/printify/catalog/blueprints/:id', async (req, res) => {
  try {
    const r = await fetch(`${BASE}/catalog/blueprints/${req.params.id}.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.get('/api/printify/catalog/blueprints/:id/print_providers', async (req, res) => {
  try {
    const r = await fetch(`${BASE}/catalog/blueprints/${req.params.id}/print_providers.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Etsy shop-specific product routes
app.post('/api/printify/etsy/products', async (req, res) => {
  try {
    const shopId = PRINTIFY_ETSY_SHOP_ID || PRINTIFY_SHOP_ID;
    const r = await fetch(`${BASE}/shops/${shopId}/products.json`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/printify/etsy/products/:id', async (req, res) => {
  try {
    const shopId = PRINTIFY_ETSY_SHOP_ID || PRINTIFY_SHOP_ID;
    const r = await fetch(`${BASE}/shops/${shopId}/products/${req.params.id}.json`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/printify/etsy/products/:id', async (req, res) => {
  try {
    const shopId = PRINTIFY_ETSY_SHOP_ID || PRINTIFY_SHOP_ID;
    const r = await fetch(`${BASE}/shops/${shopId}/products/${req.params.id}.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/printify/etsy/products', async (_req, res) => {
  try {
    const shopId = PRINTIFY_ETSY_SHOP_ID || PRINTIFY_SHOP_ID;
    const r = await fetch(`${BASE}/shops/${shopId}/products.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.post('/api/printify/etsy/products/:id/publish', async (req, res) => {
  try {
    const shopId = PRINTIFY_ETSY_SHOP_ID || PRINTIFY_SHOP_ID;
    const r = await fetch(`${BASE}/shops/${shopId}/products/${req.params.id}/publish.json`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: true,
        description: true,
        images: true,
        variants: true,
        tags: true,
        keyFeatures: true,
        shipping_template: true,
        retail_prices: true,
      }),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.get('/api/printify/catalog/blueprints/:id/print_providers/:providerId/variants', async (req, res) => {
  try {
    const { id, providerId } = req.params;
    const r = await fetch(`${BASE}/catalog/blueprints/${id}/print_providers/${providerId}/variants.json`, {
      headers: authHeaders(),
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type('json').send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- Simple file-backed history store for previously applied products ---
const DATA_DIR = path.resolve(process.cwd(), '.tmp');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}
function readHistory() {
  try {
    ensureDataDir();
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeHistory(items) {
  try {
    ensureDataDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

app.get('/api/history/products', (_req, res) => {
  try {
    res.json(readHistory());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/history/products', async (req, res) => {
  try {
    const items = readHistory();
    const incoming = req.body || {};
    const now = new Date().toISOString();
    const id = incoming.id || `${Date.now()}`;
    const item = { ...incoming, id, created_at: incoming.created_at || now };
    items.unshift(item);
    writeHistory(items.slice(0, 500));
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/history/products/:id', (req, res) => {
  try {
    const items = readHistory();
    const filtered = items.filter((p) => String(p.id) !== String(req.params.id));
    writeHistory(filtered);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// CORS-friendly image fetcher (for mockup hosts like i.ibb.co)
// Support both /api/proxy-image and /proxy-image
app.get(['/api/proxy-image','/proxy-image'], async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') return res.status(400).send('url query required');
  try {
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).send('failed to fetch image');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/png');
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});


