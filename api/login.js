const { setSessionCookie } = require('./_lib/auth');
const { appendAudit } = require('./_lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Server not configured. Set ADMIN_PASSWORD in your Vercel project env vars.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const password = body && typeof body.password === 'string' ? body.password : '';
  const name = body && typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';

  if (!name) {
    return res.status(400).json({ error: 'Enter your name.' });
  }

  // Simple constant-time-ish check via string compare is fine here since this
  // is a low-stakes single-password gate; the real protection is the signed
  // HttpOnly cookie and the fact ADMIN_PASSWORD only ever lives server-side.
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    // Small delay to make brute forcing slightly less trivial.
    await new Promise(r => setTimeout(r, 400));
    await appendAudit('Failed admin login attempt', name);
    return res.status(401).json({ error: 'Incorrect password' });
  }

  try {
    setSessionCookie(res, name, req);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  await appendAudit('Admin logged in', name);
  return res.status(200).json({ ok: true, name });
};
