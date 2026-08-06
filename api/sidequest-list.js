const { list } = require('@vercel/blob');

function decodeTag(tag){
  try{
    const decoded = Buffer.from(tag, 'base64url').toString('utf8');
    return decoded || '';
  }catch(e){
    return '';
  }
}

function parseSideQuestFile(pathname){
  try{
    const file = pathname.split('/').pop();
    const base = file.replace(/\.[a-z0-9]+$/i, '');
    const parts = base.split('--');
    if(parts.length < 4) return { name: null, caption: '', kind: 'image' };
    const name = decodeTag(parts[1]) || null;
    const caption = decodeTag(parts[2]) || '';
    const kind = parts[3] === 'video' ? 'video' : 'image';
    return { name, caption, kind };
  }catch(e){
    return { name: null, caption: '', kind: 'image' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { blobs } = await list({ prefix: 'sidequests/', storeId: process.env.PHOTOS_STORE_ID });
    const items = blobs
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map((b) => {
        const meta = parseSideQuestFile(b.pathname);
        return { url: b.url, uploadedAt: b.uploadedAt, name: meta.name, caption: meta.caption, kind: meta.kind };
      });
    res.status(200).json({ items, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not list side quests', items: [] });
  }
};
