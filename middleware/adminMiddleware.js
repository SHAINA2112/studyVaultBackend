/**
 * Must run after `protect`. Rejects anyone whose role in the database is not
 * 'admin' — this is enforced server-side regardless of what the frontend hides
 * or what the client sends. `req.user` is always loaded fresh from the DB in
 * `protect`, so this check cannot be bypassed by a forged JWT payload.
 */
export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
}

export default adminOnly;
