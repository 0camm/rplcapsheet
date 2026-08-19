const { clearSessionCookie, isAdminRequest } = require('./_lib/auth');
const { appendAudit } = require('./_lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let wasAuthed = false;
  try { wasAuthed = isAdminRequest(req); } catch (e) {}
  clearSessionCookie(res);
  if (wasAuthed) await appendAudit('Admin logged out', req);
  return res.status(200).json({ ok: true });
};
