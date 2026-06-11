const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'admin@abmgroups.org',
    pass: process.env.EMAIL_PASS || '1kpX16DKeKTf',
  },
});

async function sendOAuthEmail(clientName, clientEmail, clientId) {
  if (!clientEmail) {
    console.warn('Skipping email send: No client email provided');
    return;
  }

  // Get the base API URL (e.g. https://leados-api.abmgroups.org or localhost:3500)
  const baseUrl = process.env.API_BASE_URL || 'https://leados-api.abmgroups.org';
  const oauthLink = `${baseUrl}/api/auth/google?client_id=${clientId}`;

  const mailOptions = {
    from: `"LeadOS Admin" <${process.env.EMAIL_USER || 'admin@abmgroups.org'}>`,
    to: clientEmail,
    subject: 'Connect Your Google Business Profile - LeadOS',
    text: `Hi ${clientName},

Please connect your Google Business Profile using the link below:

${oauthLink}

After signing in with your Google account, click Allow to authorize access.

Thank you.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('Failed to send OAuth email:', err);
    throw err;
  }
}

module.exports = {
  sendOAuthEmail,
};
