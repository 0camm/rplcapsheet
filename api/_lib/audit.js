const { getRedis } = require('./redis');

const AUDIT_KEY = 'rpl_capsheet_audit';
const MAX_ENTRIES = 200;

async function appendAudit(action, adminName) {
  try {
    const redis = getRedis();
    const entry = {
      action: String(action).slice(0, 200),
      ts: Date.now(),
      admin: (adminName && String(adminName).trim().slice(0, 60)) || 'Unknown'
    };
    await redis.lpush(AUDIT_KEY, JSON.stringify(entry));
    await redis.ltrim(AUDIT_KEY, 0, MAX_ENTRIES - 1);
  } catch (e) {
    // Never let audit logging failures break the actual admin action.
    console.error('audit log write failed', e);
  }
}

async function getAuditLog(limit) {
  const redis = getRedis();
  const n = Math.max(1, Math.min(limit || 100, MAX_ENTRIES));
  const raw = await redis.lrange(AUDIT_KEY, 0, n - 1);
  return raw
    .map(r => {
      if (r && typeof r === 'object') return r; // some clients auto-parse JSON
      try { return JSON.parse(r); } catch (e) { return null; }
    })
    .filter(Boolean);
}

module.exports = { appendAudit, getAuditLog };
