const { list } = require('@vercel/blob');

function decodeTag(tag){
  try{
    return Buffer.from(tag, 'base64url').toString('utf8') || '';
  }catch(e){
    return '';
  }
}

function parseProofFile(pathname){
  try{
    const file = pathname.split('/').pop();
    const base = file.replace(/\.[a-z0-9]+$/i, '');
    const parts = base.split('--');
    if(parts.length < 3) return null;
    const ts = parseInt(parts[0].split('-')[0], 10) || 0;
    const player = decodeTag(parts[1]);
    const challengeId = decodeTag(parts[2]);
    return { ts, player, challengeId };
  }catch(e){
    return null;
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
    const { blobs } = await list({ prefix: 'proofs/', storeId: process.env.CHALLENGES_STORE_ID });

    // Keep only the latest upload per player+challengeId (in case of "Replace")
    const latestByKey = {};
    blobs.forEach((b) => {
      const meta = parseProofFile(b.pathname);
      if (!meta || !meta.player || !meta.challengeId) return;
      const key = meta.player + ':' + meta.challengeId;
      if (!latestByKey[key] || meta.ts > latestByKey[key].ts) {
        latestByKey[key] = { ts: meta.ts, player: meta.player, challengeId: meta.challengeId, url: b.url };
      }
    });

    const proofs = Object.values(latestByKey).map(({ ts, ...rest }) => rest);
    res.status(200).json({ proofs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not list proofs', proofs: [] });
  }
};
