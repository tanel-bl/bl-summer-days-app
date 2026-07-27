const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
