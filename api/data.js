const { getRedis } = require('./_lib/redis');
const { getAdminSession } = require('./_lib/auth');
const { DEFAULT_DATA } = require('./_lib/default-data');
const { appendAudit } = require('./_lib/audit');

const KEY = 'rpl_capsheet_data';
const MAX_TIERS = 40;
const MAX_PLAYERS_PER_TIER = 300;
const MAX_LABEL_LEN = 24;
const MAX_NAME_LEN = 48;

function validateData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.tiers)) {
    return 'Malformed payload: expected { tiers: [...] }';
  }
  if (data.tiers.length > MAX_TIERS) return `Too many tiers (max ${MAX_TIERS})`;
  for (const tier of data.tiers) {
    if (!tier || typeof tier !== 'object') return 'Malformed tier';
    if (typeof tier.id !== 'string' || !tier.id) return 'Tier missing id';
    if (typeof tier.label !== 'string' || !tier.label.trim() || tier.label.length > MAX_LABEL_LEN) {
      return `Tier label invalid (max ${MAX_LABEL_LEN} chars)`;
    }
    if (!Array.isArray(tier.players)) return 'Tier players must be an array';
    if (tier.players.length > MAX_PLAYERS_PER_TIER) return `Too many players in "${tier.label}" (max ${MAX_PLAYERS_PER_TIER})`;
    for (const p of tier.players) {
      if (typeof p !== 'string' || !p.trim() || p.length > MAX_NAME_LEN) {
        return `Invalid player name (max ${MAX_NAME_LEN} chars)`;
      }
    }
  }
  return null;
}

function sanitize(data) {
  return {
    tiers: data.tiers.map(t => ({
      id: String(t.id),
      label: String(t.label).trim(),
      players: t.players.map(p => String(p).trim())
    }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const redis = getRedis();
      let data = await redis.get(KEY);
      if (!data) {
        data = DEFAULT_DATA;
        await redis.set(KEY, data);
      }
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let session = null;
    try {
      session = getAdminSession(req);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated. Log in to the admin panel first.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    const err = validateData(body);
    if (err) return res.status(400).json({ error: err });

    const action = (body && typeof body.action === 'string' && body.action.trim())
      ? body.action.trim().slice(0, 200)
      : 'Capsheet updated';

    try {
      const redis = getRedis();
      const clean = sanitize(body);
      await redis.set(KEY, clean);
      await appendAudit(action, session.name);
      return res.status(200).json(clean);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};
