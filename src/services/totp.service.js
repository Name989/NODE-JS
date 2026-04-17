const { authenticator } = require('otplib');
const env = require('../config/env');

authenticator.options = { window: 1 };

function generateSecret() {
  return authenticator.generateSecret();
}

function generateToken(secret) {
  return authenticator.generate(secret);
}

function verifyToken(secret, token) {
  return authenticator.verify({ secret, token });
}

function getKeyUri(email, secret) {
  return authenticator.keyuri(email, env.totp.issuer, secret);
}

module.exports = { generateSecret, generateToken, verifyToken, getKeyUri };
