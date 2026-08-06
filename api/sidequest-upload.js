const { put } = require('@vercel/blob');

function encodeTag(raw, fallback, maxLen){
  let s = 'Guest';
  try { s = decodeURIComponent(raw || fallback); } catch(e) { s = raw || fallback; }
  s = (s || fallback).trim().slice(0, maxLen);
  if(!s) s = fallback;
  return Buffer.from(s, 'utf8').toString('base64url');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Uploader-Name, X-Caption');

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
      res.status(400).json({ error: 'No file data received' });
      return;
    }

    const MAX_BYTES = 4 * 1024 * 1024; // ~4MB safety cap for serverless body size
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: 'File too large — please use a shorter video or smaller photo (max ~4MB).' });
      return;
    }

    const contentType = req.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    let kind = 'image';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('heic')) ext = 'heic';
    else if (contentType.includes('mp4')) { ext = 'mp4'; kind = 'video'; }
    else if (contentType.includes('quicktime') || contentType.includes('mov')) { ext = 'mov'; kind = 'video'; }
    else if (contentType.includes('webm')) { ext = 'webm'; kind = 'video'; }
    else if (contentType.startsWith('video/')) { ext = 'mp4'; kind = 'video'; }

    const nameTag = encodeTag(req.headers['x-uploader-name'], 'Guest', 40);
    const captionTag = encodeTag(req.headers['x-caption'], '', 200);

    const filename = `sidequests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}--${nameTag}--${captionTag}--${kind}.${ext}`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      storeId: process.env.PHOTOS_STORE_ID,
    });

    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};
