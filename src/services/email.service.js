const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: env.email.from,
    to: toEmail,
    subject: 'Your One-Time Password',
    text: `Your OTP is: ${otp}\n\nThis code expires in 30 seconds.`,
    html: `<p>Your OTP is: <strong>${otp}</strong></p><p>This code expires in 30 seconds.</p>`,
  });
}

module.exports = { sendOtpEmail };
