const nodemailer = require('nodemailer');

const transporterCache = new Map();

const timeoutOptions = () => ({
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 5000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 5000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 5000),
  requireTLS: process.env.EMAIL_REQUIRE_TLS === 'true',
  tls: {
    rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED === 'true',
  },
});

const authConfig = () => ({
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
});

const buildTransportConfigs = () => {
  const configs = [];
  const emailUser = process.env.EMAIL_USER || '';
  const service = process.env.EMAIL_SERVICE || (emailUser.includes('@gmail.') ? 'gmail' : '');

  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    configs.push({
      name: `smtp:${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`,
      options: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE
          ? process.env.EMAIL_SECURE === 'true'
          : Number(process.env.EMAIL_PORT) === 465,
        auth: authConfig(),
      },
    });
  }

  if (service) {
    configs.push({
      name: `service:${service}`,
      options: {
        service,
        auth: authConfig(),
      },
    });
  }

  if (emailUser.includes('@gmail.')) {
    configs.push(
      {
        name: 'gmail:smtp-465',
        options: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: authConfig(),
        },
      },
      {
        name: 'gmail:smtp-587',
        options: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: authConfig(),
        },
      }
    );
  }

  const seen = new Set();
  return configs.filter((config) => {
    const key = JSON.stringify(config.options);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getTransporter = (config) => {
  const key = JSON.stringify(config.options);
  if (!transporterCache.has(key)) {
    transporterCache.set(key, nodemailer.createTransport({
      ...config.options,
      ...timeoutOptions(),
    }));
  }
  return transporterCache.get(key);
};

const assertConfigured = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return 'EMAIL_USER or EMAIL_PASS is not configured';
  }

  if (!buildTransportConfigs().length) {
    return 'No email transport is configured';
  }

  return null;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const configError = assertConfigured();
  if (configError) {
    console.log(`Email skipped: ${configError}`);
    return null;
  }

  const failures = [];

  for (const config of buildTransportConfigs()) {
    try {
      const info = await getTransporter(config).sendMail({
        from: process.env.EMAIL_FROM || `"BloodBridge" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`Email sent via ${config.name}:`, info.messageId);
      return info;
    } catch (error) {
      failures.push(`${config.name}: ${error.message}`);
      console.error(`Email Error via ${config.name}:`, error.message);
    }
  }

  throw new Error(failures.join(' | '));
};

const verifyEmailTransport = async () => {
  const configError = assertConfigured();
  if (configError) {
    return { configured: false, ready: false, message: configError, attempts: [] };
  }

  const attempts = [];

  for (const config of buildTransportConfigs()) {
    try {
      await getTransporter(config).verify();
      attempts.push({ name: config.name, ready: true });
      return {
        configured: true,
        ready: true,
        message: `Email transport is ready via ${config.name}`,
        attempts,
      };
    } catch (error) {
      attempts.push({ name: config.name, ready: false, message: error.message });
    }
  }

  return {
    configured: true,
    ready: false,
    message: attempts.map((attempt) => `${attempt.name}: ${attempt.message}`).join(' | '),
    attempts,
  };
};

module.exports = sendEmail;
module.exports.verifyEmailTransport = verifyEmailTransport;
