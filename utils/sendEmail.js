const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const hasHostConfig = process.env.EMAIL_HOST && process.env.EMAIL_PORT;
  const config = hasHostConfig
    ? {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

  transporter = nodemailer.createTransport({
    ...config,
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 5000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 5000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 5000),
    tls: {
      rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED === 'true',
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email skipped: EMAIL_USER or EMAIL_PASS is not configured');
    return null;
  }

  try {
    const info = await getTransporter().sendMail({
      from: `"BloodBridge" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent:', info.messageId);

  } catch (error) {
    console.error('Email Error:', error.message);
    throw error;
  }
};

module.exports = sendEmail;
