const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'ctf-infinity-secret';

/**
 * Require logged-in user — checks session first, then JWT cookie as fallback
 */
function requireAuth(req, res, next) {
  // Check session
  if (req.session && req.session.user) return next();

  // Check JWT cookie fallback
  const token = req.cookies && req.cookies['ctf_user'];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      req.session.user = decoded;
      return next();
    } catch (e) {}
  }

  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

/**
 * Require admin — checks session + JWT admin cookie
 */
function requireAdmin(req, res, next) {
  // Check session
  if (req.session && req.session.isAdmin) return next();

  // Check JWT admin cookie
  const token = req.cookies && req.cookies['ctf_admin'];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      if (decoded.isAdmin) {
        req.session.isAdmin = true;
        return next();
      }
    } catch (e) {}
  }

  res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You must be an admin to access this page.',
    code: 403,
  });
}

module.exports = { requireAuth, requireAdmin };
