require('../setup');
const totpService = require('../../src/services/totp.service');

describe('totp.service', () => {
  let secret;

  beforeAll(() => {
    secret = totpService.generateSecret();
  });

  // U1
  test('generateSecret returns a base32 string of length >= 16', () => {
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThanOrEqual(16);
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  });

  // U2
  test('verifyToken returns true for the current valid TOTP token', () => {
    const token = totpService.generateToken(secret);
    expect(totpService.verifyToken(secret, token)).toBe(true);
  });

  // U3
  test('verifyToken returns false for an invalid token', () => {
    expect(totpService.verifyToken(secret, '000000')).toBe(false);
  });
});
