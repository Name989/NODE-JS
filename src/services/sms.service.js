const twilio = require('twilio');
const env = require('../config/env');

const client = twilio(env.twilio.accountSid, env.twilio.authToken);

async function sendOtpSms(toPhone, otp) {
  await client.messages.create({
    body: `Your OTP is: ${otp}. This code expires in 30 seconds.`,
    from: env.twilio.fromNumber,
    to: toPhone,
  });
}

module.exports = { sendOtpSms };
