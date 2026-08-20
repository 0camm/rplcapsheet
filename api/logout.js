const { clearSessionCookie, getAdminSession } = require('./_lib/auth');
const { appendAudit } = require('./_lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let session = null;
  try { session = getAdminSession(req); } catch (e) {}
  clearSessionCookie(res, req);
  if (session) await appendAudit('Admin logged out', session.name);
  return res.status(200).json({ ok: true });
};
