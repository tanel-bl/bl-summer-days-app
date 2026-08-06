const { list } = require('@vercel/blob');

function extractName(pathname){
  try{
    const file = pathname.split('/').pop(); // e.g. 172839-ab12cd--bmFtZQ.jpg
    const base = file.replace(/\.[a-z0-9]+$/i, '');
    const parts = base.split('--');
    if(parts.length < 2) return null;
    const tag = parts[parts.length - 1];
    const decoded = Buffer.from(tag, 'base64url').toString('utf8');
    if(!decoded || decoded.length > 60) return null;
    return decoded;
  }catch(e){
    return null;
  }
}

function extractKind(pathname){
  const ext = (pathname.split('.').pop() || '').toLowerCase();
  return ['mp4','mov','webm'].includes(ext) ? 'video' : 'image';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { blobs } = await list({ prefix: 'uploads/', storeId: process.env.PHOTOS_STORE_ID });
    const photos = blobs
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map((b) => ({ url: b.url, uploadedAt: b.uploadedAt, name: extractName(b.pathname), kind: extractKind(b.pathname) }));
    res.status(200).json({ photos, count: photos.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not list photos', photos: [] });
  }
};
