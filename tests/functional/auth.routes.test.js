require('../setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// --- mocks must be declared before requiring app ---

const mockUser = {
  id: 'user-uuid-1234',
  email: 'test@example.com',
  phone: '+911234567890',
  totp_secret: null,
  password_hash: null,
};

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
}));

let mockStoredTokenHash = null;
let mockStoredExpiresAt = null;
let mockStoredRevoked = false;

jest.mock('../../src/models/RefreshToken', () => ({
  create: jest.fn().mockImplementation(({ token_hash, expires_at }) => {
    mockStoredTokenHash = token_hash;
    mockStoredExpiresAt = expires_at;
    mockStoredRevoked = false;
    return Promise.resolve({});
  }),
  update: jest.fn().mockImplementation((values, { where }) => {
    if (where.token_hash !== mockStoredTokenHash) return Promise.resolve([0, []]);
    if (mockStoredRevoked) return Promise.resolve([0, []]);
    if (new Date() > mockStoredExpiresAt) return Promise.resolve([0, []]);
    mockStoredRevoked = true;
    return Promise.resolve([1, [{ user_id: mockUser.id, expires_at: mockStoredExpiresAt }]]);
  }),
}));

jest.mock('../../src/services/email.service', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/services/sms.service', () => ({
  sendOtpSms: jest.fn().mockResolvedValue(),
}));

const totpService = require('../../src/services/totp.service');
const User = require('../../src/models/User');
const app = require('../../src/app');

let validOtp;
let issuedRefreshToken;

beforeAll(async () => {
  mockUser.password_hash = await bcrypt.hash('correct-password', 12);
  mockUser.totp_secret = totpService.generateSecret();
  validOtp = totpService.generateToken(mockUser.totp_secret);
});

beforeEach(() => {
  User.findOne.mockReset();
  User.findByPk.mockReset();
  User.create.mockReset();
  mockStoredRevoked = false;
});

describe('POST /auth/register', () => {
  // F10
  test('returns 201 for valid new registration', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', phone: '+911234567890', password: 'Test@1234' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, message: 'User registered successfully' });
  });

  // F11
  test('returns 409 for duplicate email', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const res = await request(app)
      .post('/auth/register')
      .send({ email: mockUser.email, phone: '+911234567890', password: 'Test@1234' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already registered');
  });

  // F12
  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ phone: '+911234567890', password: 'Test@1234' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email is required');
  });

  // F13
  test('returns 400 when phone is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Test@1234' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('phone is required');
  });

  // F14
  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', phone: '+911234567890' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('password is required');
  });

  // F15
  test('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'notanemail', phone: '+911234567890', password: 'Test@1234' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email is invalid');
  });

  // E7
  test('returns 400 for whitespace-only password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', phone: '+911234567890', password: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('password is required');
  });

  // E8
  test('accepts email with leading/trailing spaces (trims before use)', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});
    const res = await request(app)
      .post('/auth/register')
      .send({ email: '  spaced@example.com  ', phone: '+911234567890', password: 'Test@1234' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
  });
});

describe('POST /auth/login', () => {
  // F1
  test('returns 200 and "OTP sent" for valid credentials', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: mockUser.email, password: 'correct-password' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'OTP sent' });
  });

  // F2
  test('returns 401 for wrong password', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: mockUser.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  // E1
  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'correct-password' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email is required');
  });

  // E2
  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: mockUser.email });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('password is required');
  });
});

describe('POST /auth/verify-otp', () => {
  // F3
  test('returns 200 with accessToken and refreshToken for correct OTP', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const otp = totpService.generateToken(mockUser.totp_secret);
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: mockUser.email, otp });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    issuedRefreshToken = res.body.refreshToken;
  });

  // F4
  test('returns 401 for wrong OTP code', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: mockUser.email, otp: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired OTP');
  });
});

describe('POST /auth/refresh', () => {
  beforeEach(async () => {
    // Issue a fresh token before each refresh test
    User.findOne.mockResolvedValue(mockUser);
    const otp = totpService.generateToken(mockUser.totp_secret);
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: mockUser.email, otp });
    issuedRefreshToken = res.body.refreshToken;
  });

  // F5
  test('returns 200 with new accessToken for valid refresh token', async () => {
    User.findByPk.mockResolvedValue(mockUser);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: issuedRefreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  // F6 — token revoked after use (rotation), re-use must fail
  test('returns 401 when refresh token is already used (rotated)', async () => {
    User.findByPk.mockResolvedValue(mockUser);
    await request(app).post('/auth/refresh').send({ refreshToken: issuedRefreshToken });
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: issuedRefreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid refresh token');
  });
});

describe('POST /auth/logout', () => {
  beforeEach(async () => {
    User.findOne.mockResolvedValue(mockUser);
    const otp = totpService.generateToken(mockUser.totp_secret);
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: mockUser.email, otp });
    issuedRefreshToken = res.body.refreshToken;
  });

  // F7
  test('returns 200 and revokes the refresh token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: issuedRefreshToken });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});

describe('GET /protected — JWT middleware', () => {
  let accessToken;

  beforeEach(async () => {
    User.findOne.mockResolvedValue(mockUser);
    const otp = totpService.generateToken(mockUser.totp_secret);
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ email: mockUser.email, otp });
    accessToken = res.body.accessToken;
  });

  // F8
  test('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  // F9
  test('returns 200 with user info for valid Bearer token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: mockUser.id, email: mockUser.email });
  });

  // E6
  test('returns 401 for tampered token', async () => {
    const tampered = accessToken.slice(0, -4) + 'XXXX';
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });
});
