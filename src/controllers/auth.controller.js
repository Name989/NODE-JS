const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'email is required' });
    if (!password) return res.status(400).json({ success: false, message: 'password is required' });

    const result = await authService.login(email, password);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'email is required' });
    if (!otp) return res.status(400).json({ success: false, message: 'otp is required' });

    const tokens = await authService.verifyOtp(email, otp);
    return res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }

    const tokens = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({ success: true, ...tokens });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }

    await authService.logout(refreshToken);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    let { email, phone, password } = req.body;

    if (!email || !email.trim()) return res.status(400).json({ success: false, message: 'email is required' });
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    if (!password || !password.trim()) return res.status(400).json({ success: false, message: 'password is required' });
    if (!/\S+@\S+\.\S+/.test(email.trim())) return res.status(400).json({ success: false, message: 'email is invalid' });

    email = email.trim();

    const result = await authService.register(email, phone, password);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, verifyOtp, refresh, logout, register };
