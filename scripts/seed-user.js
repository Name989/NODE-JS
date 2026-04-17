/**
 * Usage: node scripts/seed-user.js [email] [phone] [password]
 * Defaults: test@example.com / +911234567890 / Test@1234
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');
const totpService = require('../src/services/totp.service');

const email    = process.argv[2] || 'test@example.com';
const phone    = process.argv[3] || '+911234567890';
const password = process.argv[4] || 'Test@1234';

async function seed() {
  await sequelize.authenticate();

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log(`User already exists: ${email}`);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 12);
  const totp_secret   = totpService.generateSecret();

  await User.create({ email, phone, password_hash, totp_secret, is_verified: true });

  console.log('✓ User seeded successfully');
  console.log(`  Email   : ${email}`);
  console.log(`  Phone   : ${phone}`);
  console.log(`  Password: ${password}`);
  console.log(`  TOTP secret (save this for Google Authenticator): ${totp_secret}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
