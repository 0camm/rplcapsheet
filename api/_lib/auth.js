const crypto = require('crypto');

const COOKIE_NAME = 'rpl_admin';
const SESSION_HOURS = 8;

function secret() {
  // Prefer a dedicated signing secret; fall back to the admin password if one
  // hasn't been set. Both live only in Vercel's env vars, never in the client.
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('Server not configured: set ADMIN_PASSWORD (and ideally SESSION_SECRET) in Vercel env vars.');
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  const data = b64url(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, hmac] = token.split('.');
  if (!data || !hmac) return null;
  let expected;
  try {
    expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  } catch (e) {
    return null;
  }
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAdminRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verify(token);
  return !!(payload && payload.role === 'admin');
}

function setSessionCookie(res) {
  const token = sign({ role: 'admin', exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 });
  const maxAge = SESSION_HOURS * 60 * 60;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

module.exports = { isAdminRequest, setSessionCookie, clearSessionCookie };
