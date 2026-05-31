const sendEmail = require('./sendEmail');
const { verifyEmailTransport } = require('./sendEmail');
const templates = require('./emailTemplates');

const NOTIFICATION_TIMEOUT_MS = Number(process.env.NOTIFICATION_TIMEOUT_MS || 3000);

const withTimeout = (promise, timeoutMs) => (
  Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Notification email timed out after ${timeoutMs}ms`);
        resolve(null);
      }, timeoutMs);
    }),
  ])
);

const sendNotification = async ({ to, subject, template }) => {
  if (!to || !template) return null;

  return withTimeout(sendEmail({
    to,
    subject,
    text: template.text,
    html: template.html,
  }), NOTIFICATION_TIMEOUT_MS).catch((error) => {
    console.log('Notification email failed:', error.message);
    return null;
  });
};

const queueNotification = (message) => {
  if (!message || !message.to || !message.template) return;

  setImmediate(() => {
    sendNotification(message).catch((error) => {
      console.log('Queued notification failed:', error.message);
    });
  });
};

const notifyMany = async (users, buildMessage) => {
  const recipients = users.filter((user) => user.email && !user.isBlocked);
  await Promise.allSettled(recipients.map((user) => sendNotification(buildMessage(user))));
};

const queueMany = (users, buildMessage) => {
  const recipients = users.filter((user) => user.email && !user.isBlocked);
  recipients.forEach((user) => queueNotification(buildMessage(user)));
};

module.exports = {
  sendNotification,
  queueNotification,
  notifyMany,
  queueMany,
  verifyEmailTransport,
  templates,
};
