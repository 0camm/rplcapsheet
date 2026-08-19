const { getAdminSession } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  let session = null;
  try {
    session = getAdminSession(req);
  } catch (e) {
    session = null;
  }
  return res.status(200).json({ authed: !!session, name: session ? session.name : null });
};
