// emailService.js
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const { v4: uuid } = require('uuid');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = {
  generateToken() {
    return uuid();
  },
  async sendVerificationEmail(toEmail, token) {
  const url = `${process.env.FRONTEND_BASE_URL}/verify-email?token=${token}&email=${encodeURIComponent(toEmail)}`;

  const msg = {
    to: toEmail,
    from: process.env.FROM_EMAIL,
    subject: 'Verify your email',
    html: `<p>Click <a href="${url}">here</a> to verify.</p>`
  };

  try {
    console.log("Sending from:", msg.from);
    console.log("To:", msg.to);
    await sgMail.send(msg);
    console.log(`✔️ Email sent to ${toEmail}`);
  } catch (err) {
    console.error("SendGrid Error:", err.response?.body?.errors || err.message);
    throw new Error("Email send failed");
  }
}
};