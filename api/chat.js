const { put, list } = require('@vercel/blob');

function parseTimestamp(pathname){
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
      const url = new URL(req.url, 'http://internal');
      const since = parseInt(url.searchParams.get('since'), 10) || 0;
      const { blobs } = await list({ prefix: 'chat/', storeId });

      const relevant = blobs
        .map(b => ({ ...b, ts: parseTimestamp(b.pathname) }))
        .filter(b => b.ts > since)
        .sort((a, b) => a.ts - b.ts);

      const messages = await Promise.all(
        relevant.map(async (b) => {
          try {
            const r = await fetch(b.url, { cache: 'no-store' });
            return await r.json();
          } catch (e) {
            return null;
          }
        })
      );

      const clean = messages.filter(Boolean);
      const latestTs = relevant.length ? relevant[relevant.length - 1].ts : since;

      res.status(200).json({ messages: clean, latestTs });
    } catch (err) {
      res.status(200).json({ messages: [], latestTs: 0, warning: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const body = JSON.parse(buffer.toString('utf8') || '{}');

      const name = String(body.name || 'Guest').trim().slice(0, 40) || 'Guest';
      const text = String(body.text || '').trim().slice(0, 500);

      if (!text) {
        res.status(400).json({ error: 'Empty message' });
        return;
      }

      const ts = Date.now();
      const message = {
        id: 'm-' + ts + '-' + Math.random().toString(36).slice(2, 7),
        name,
        text,
        ts: new Date(ts).toISOString(),
      };

      const filename = `chat/${ts}-${Math.random().toString(36).slice(2, 8)}.json`;
      await put(filename, JSON.stringify(message), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        storeId,
      });

      res.status(200).json({ ok: true, message, ts });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Send failed' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
