/**
 * Middleware: require a logged-in user session.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

/**
 * Middleware: require admin session (for /creator routes).
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.status(403).render('error', {
    title: 'Access Denied',
    message: 'You must be an admin to access this page.',
    code: 403,
  });
}

module.exports = { requireAuth, requireAdmin };
