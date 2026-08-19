const { isAdminRequest } = require('./_lib/auth');
const { getAuditLog } = require('./_lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let authed = false;
  try {
    authed = isAdminRequest(req);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (!authed) {
    return res.status(401).json({ error: 'Not authenticated. Log in to the admin panel first.' });
  }

  try {
    const limit = Math.min(parseInt(req.query && req.query.limit, 10) || 100, 200);
    const entries = await getAuditLog(limit);
    return res.status(200).json({ entries });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
