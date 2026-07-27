const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { blobs } = await list({ prefix: 'uploads/' });
    const photos = blobs
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map((b) => ({ url: b.url, uploadedAt: b.uploadedAt }));
    res.status(200).json({ photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not list photos', photos: [] });
  }
};
