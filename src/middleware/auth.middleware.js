const jwt = require('jsonwebtoken');
const { TokenExpiredError, JsonWebTokenError } = require('jsonwebtoken');
const tokenService = require('../services/token.service');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    next(err);
  }
}

module.exports = authMiddleware;
