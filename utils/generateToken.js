import jwt from 'jsonwebtoken';

/**
 * Signs a JWT carrying the user's id and role.
 * The role is included for token context, but authorization is
 * always verified against the current database user by protect/adminOnly.
 */
export function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
