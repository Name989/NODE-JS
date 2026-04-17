const bcrypt = require('bcryptjs');
const User = require('../models/User');
const totpService = require('./totp.service');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const tokenService = require('./token.service');

async function login(email, password) {
  const user = await User.findOne({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const otp = totpService.generateToken(user.totp_secret);

  await Promise.all([
    emailService.sendOtpEmail(user.email, otp),
    smsService.sendOtpSms(user.phone, otp),
  ]);

  return { message: 'OTP sent' };
}

async function verifyOtp(email, otp) {
  const user = await User.findOne({ where: { email } });

  if (!user || !totpService.verifyToken(user.totp_secret, otp)) {
    const err = new Error('Invalid or expired OTP');
    err.status = 401;
    throw err;
  }

  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.storeRefreshToken(user.id);

  return { accessToken, refreshToken };
}

async function refreshAccessToken(rawRefreshToken) {
  const userId = await tokenService.rotateRefreshToken(rawRefreshToken);

  if (!userId) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }

  const accessToken = tokenService.signAccessToken(user);
  const newRefreshToken = await tokenService.storeRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(rawRefreshToken) {
  await tokenService.revokeRefreshToken(rawRefreshToken);
}

async function register(email, phone, password) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const totp_secret = totpService.generateSecret();

  await User.create({ email, phone, password_hash, totp_secret });

  return { message: 'User registered successfully' };
}

module.exports = { login, verifyOtp, refreshAccessToken, logout, register };
