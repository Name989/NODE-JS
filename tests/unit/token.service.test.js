require('../setup');

jest.mock('../../src/models/RefreshToken', () => ({
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue([0, []]),
}));

const tokenService = require('../../src/services/token.service');

const mockUser = { id: 'user-uuid-1234', email: 'test@example.com' };

describe('token.service', () => {
  // U4
  test('signAccessToken returns a signed JWT', () => {
    const token = tokenService.signAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  // U5
  test('verifyAccessToken returns decoded payload for a valid JWT', () => {
    const token = tokenService.signAccessToken(mockUser);
    const payload = tokenService.verifyAccessToken(token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
  });

  // U6
  test('verifyAccessToken throws for an expired JWT', () => {
    const jwt = require('jsonwebtoken');
    const expired = jwt.sign(
      { sub: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
    expect(() => tokenService.verifyAccessToken(expired)).toThrow();
  });

  // U7
  test('hashToken returns a consistent 64-char hex SHA-256 hash', () => {
    const hash1 = tokenService.hashToken('my-raw-token');
    const hash2 = tokenService.hashToken('my-raw-token');
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
  });
});
