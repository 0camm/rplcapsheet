const { isAdminRequest } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  let authed = false;
  try {
    authed = isAdminRequest(req);
  } catch (e) {
    authed = false;
  }
  return res.status(200).json({ authed });
};
