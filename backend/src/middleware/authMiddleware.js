/**
 * Middleware to check whether the current session contains an authenticated user.
 * Attaches req.userId if authenticated, otherwise returns HTTP 401.
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

module.exports = {
  requireAuth
};
