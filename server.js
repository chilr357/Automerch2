/* Simple proxy API server for Printify to avoid CORS and hide keys */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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


