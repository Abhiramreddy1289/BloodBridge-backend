const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const hasHostConfig = process.env.EMAIL_HOST && process.env.EMAIL_PORT;
  const config = hasHostConfig
    ? {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE
          ? process.env.EMAIL_SECURE === 'true'
          : Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }
    : {
        service: process.env.EMAIL_SERVICE || 'gmail',
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
    requireTLS: process.env.EMAIL_REQUIRE_TLS === 'true',
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
      from: process.env.EMAIL_FROM || `"BloodBridge" <${process.env.EMAIL_USER}>`,
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

const verifyEmailTransport = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { configured: false, ready: false, message: 'EMAIL_USER or EMAIL_PASS is not configured' };
  }

  try {
    await getTransporter().verify();
    return { configured: true, ready: true, message: 'Email transport is ready' };
  } catch (error) {
    return { configured: true, ready: false, message: error.message };
  }
};

module.exports = sendEmail;
module.exports.verifyEmailTransport = verifyEmailTransport;
