const { put } = require('@vercel/blob');

function sanitizeName(raw){
  let name = 'Guest';
  try { name = decodeURIComponent(raw || 'Guest'); } catch(e) { name = raw || 'Guest'; }
  name = name.trim().slice(0, 40);
  if(!name) name = 'Guest';
  // encode safely for use inside a filename segment
  return Buffer.from(name, 'utf8').toString('base64url');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Uploader-Name');

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

    const contentType = req.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('heic')) ext = 'heic';
    else if (contentType.includes('mp4')) ext = 'mp4';
    else if (contentType.includes('quicktime') || contentType.includes('mov')) ext = 'mov';
    else if (contentType.includes('webm')) ext = 'webm';
    else if (contentType.startsWith('video/')) ext = 'mp4';

    const MAX_BYTES = 4 * 1024 * 1024; // ~4MB safety cap for serverless body size
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: 'File too large — please use a shorter video or smaller photo (max ~4MB).' });
      return;
    }

    const nameTag = sanitizeName(req.headers['x-uploader-name']);
    const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}--${nameTag}.${ext}`;

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
