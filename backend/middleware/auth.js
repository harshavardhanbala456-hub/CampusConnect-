// backend/middleware/auth.js — JWT verification middleware
const jwt = require('jsonwebtoken');

/**
 * Attach the decoded user to req.user if a valid Bearer token is provided.
 * Does NOT short-circuit the request — use requireAuth for protected routes.
 */
function attachUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Invalid or expired token — treat as unauthenticated
      req.user = null;
    }
  }
  next();
}

/** Requires a valid JWT — 401 if missing/invalid */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

/** Requires role === 'admin' — 403 if not an admin */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
