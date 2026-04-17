const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function storeRefreshToken(userId) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshToken.expiresDays);

  await RefreshToken.create({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });

  return rawToken;
}

async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);

  const [updatedCount, updatedRows] = await RefreshToken.update(
    { revoked: true },
    {
      where: { token_hash: tokenHash, revoked: false },
      returning: true,
    }
  );

  if (updatedCount === 0) return null;

  const existing = updatedRows[0];
  if (new Date() > existing.expires_at) return null;

  return existing.user_id;
}

async function revokeRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.update({ revoked: true }, { where: { token_hash: tokenHash } });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
