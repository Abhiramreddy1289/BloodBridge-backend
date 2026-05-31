const sendEmail = require('./sendEmail');
const templates = require('./emailTemplates');

const sendNotification = async ({ to, subject, template }) => {
  if (!to || !template) return null;

  return sendEmail({
    to,
    subject,
    text: template.text,
    html: template.html,
  }).catch((error) => {
    console.log('Notification email failed:', error.message);
    return null;
  });
};

const notifyMany = async (users, buildMessage) => {
  const recipients = users.filter((user) => user.email && !user.isBlocked);
  await Promise.allSettled(recipients.map((user) => sendNotification(buildMessage(user))));
};

module.exports = { sendNotification, notifyMany, templates };
