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
    await sgMail.send({
      to: toEmail,
      from: process.env.FROM_EMAIL,
      subject: 'Verify your email',
      html: `<p>Click <a href="${url}">here</a> to verify.</p>`
    });
  }
};