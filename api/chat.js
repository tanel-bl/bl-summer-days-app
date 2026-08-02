const { put, list } = require('@vercel/blob');

const MAX_MESSAGES = 500;

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
      const { blobs } = await list({ prefix: 'chat/', storeId });
      if (!blobs.length) {
        res.status(200).json({ messages: [] });
        return;
      }
      const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const r = await fetch(latest.url);
      const messages = await r.json();
      res.status(200).json({ messages });
    } catch (err) {
      res.status(200).json({ messages: [], warning: err.message });
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

      // read current messages
      let messages = [];
      const { blobs } = await list({ prefix: 'chat/', storeId });
      if (blobs.length) {
        const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
        try {
          const r = await fetch(latest.url);
          messages = await r.json();
          if (!Array.isArray(messages)) messages = [];
        } catch (e) { messages = []; }
      }

      messages.push({
        id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name,
        text,
        ts: new Date().toISOString(),
      });

      if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(messages.length - MAX_MESSAGES);
      }

      const filename = `chat/${Date.now()}.json`;
      await put(filename, JSON.stringify(messages), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        storeId,
      });

      res.status(200).json({ ok: true, messages });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Send failed' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
