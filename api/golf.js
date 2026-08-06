const { put, list } = require('@vercel/blob');

const DEFAULT_GOLF = require('./golf-seed.json');

function timestampFromPathname(pathname){
  const file = pathname.split('/').pop() || '';
  const n = parseInt(file.split('-')[0], 10);
  return Number.isFinite(n) ? n : 0;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const storeId = process.env.PHOTOS_STORE_ID;

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'golf/', storeId });
      if (!blobs.length) {
        res.status(200).json({ data: DEFAULT_GOLF, updatedAt: null });
        return;
      }
      const latest = blobs.sort((a, b) => timestampFromPathname(b.pathname) - timestampFromPathname(a.pathname))[0];
      const r = await fetch(latest.url, { cache: 'no-store' });
      const data = await r.json();
      res.status(200).json({ data, updatedAt: latest.uploadedAt });
    } catch (err) {
      res.status(200).json({ data: DEFAULT_GOLF, updatedAt: null, warning: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const body = JSON.parse(buffer.toString('utf8') || '{}');

      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid golf payload' });
        return;
      }

      const filename = `golf/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
      const blob = await put(filename, JSON.stringify(body), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        storeId,
      });

      res.status(200).json({ ok: true, url: blob.url });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Save failed' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
