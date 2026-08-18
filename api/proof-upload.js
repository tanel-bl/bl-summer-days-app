const { put } = require('@vercel/blob');

function encodeTag(raw, fallback, maxLen){
  let s = fallback;
  try { s = decodeURIComponent(raw || fallback); } catch(e) { s = raw || fallback; }
  s = (s || fallback).trim().slice(0, maxLen);
  if(!s) s = fallback;
  return Buffer.from(s, 'utf8').toString('base64url');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Player, X-Challenge-Id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    if (!buffer.length) {
      res.status(400).json({ error: 'No image data received' });
      return;
    }

    const MAX_BYTES = 4 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: 'File too large (max ~4MB).' });
      return;
    }

    const contentType = req.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const playerTag = encodeTag(req.headers['x-player'], 'Guest', 40);
    const challengeTag = encodeTag(req.headers['x-challenge-id'], 'unknown', 40);

    const filename = `proofs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}--${playerTag}--${challengeTag}.${ext}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      storeId: process.env.CHALLENGES_STORE_ID,
    });

    res.status(200).json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};
