require('../setup');
const bcrypt = require('bcryptjs');

const mockUser = {
  id: 'user-uuid-1234',
  email: 'test@example.com',
  phone: '+911234567890',
  totp_secret: null,
  password_hash: null,
};

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue([0, []]),
}));
jest.mock('../../src/services/email.service', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/services/sms.service', () => ({
  sendOtpSms: jest.fn().mockResolvedValue(),
}));

const User = require('../../src/models/User');
const authService = require('../../src/services/auth.service');
const totpService = require('../../src/services/totp.service');

beforeAll(async () => {
  mockUser.password_hash = await bcrypt.hash('correct-password', 12);
  mockUser.totp_secret = totpService.generateSecret();
});

describe('auth.service — register', () => {
  beforeEach(() => {
    User.findOne.mockReset();
    User.create.mockReset();
  });

  // U10
  test('returns { message: "User registered successfully" } for new email', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({});
    const result = await authService.register('new@example.com', '+911234567890', 'Test@1234');
    expect(result).toEqual({ message: 'User registered successfully' });
    expect(User.create).toHaveBeenCalledTimes(1);
  });

  // U11
  test('throws "Email already registered" with status 409 for duplicate email', async () => {
    User.findOne.mockResolvedValue(mockUser);
    await expect(authService.register(mockUser.email, '+911234567890', 'Test@1234'))
      .rejects.toMatchObject({ message: 'Email already registered', status: 409 });
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('auth.service — login', () => {
  // U8
  test('throws "Invalid credentials" for wrong password', async () => {
    User.findOne.mockResolvedValue(mockUser);
    await expect(authService.login(mockUser.email, 'wrong-password'))
      .rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });

  // U9
  test('throws "Invalid credentials" for unknown email (same message — no leak)', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.login('nobody@example.com', 'any-password'))
      .rejects.toMatchObject({ message: 'Invalid credentials', status: 401 });
  });

  test('returns { message: "OTP sent" } for valid credentials', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const result = await authService.login(mockUser.email, 'correct-password');
    expect(result).toEqual({ message: 'OTP sent' });
  });
});
