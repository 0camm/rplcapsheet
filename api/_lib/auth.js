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

function getAdminSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verify(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload; // { role, name, exp }
}

function isAdminRequest(req) {
  return !!getAdminSession(req);
}

function isHttps(req) {
  // Vercel terminates TLS upstream, so check the forwarded proto header;
  // fall back to req.secure-ish checks for local `vercel dev` over http.
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || '';
  return proto.split(',')[0].trim() === 'https';
}

function setSessionCookie(res, name, req) {
  const token = sign({
    role: 'admin',
    name: String(name || '').trim().slice(0, 60) || 'Unknown',
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000
  });
  const maxAge = SESSION_HOURS * 60 * 60;
  const secureFlag = !req || isHttps(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=${maxAge}`);
}

function clearSessionCookie(res, req) {
  const secureFlag = !req || isHttps(req) ? ' Secure;' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`);
}

module.exports = { isAdminRequest, getAdminSession, setSessionCookie, clearSessionCookie };
