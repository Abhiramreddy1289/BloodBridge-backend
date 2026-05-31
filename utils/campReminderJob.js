const Camp = require('../models/Camp');
const User = require('../models/User');
const { notifyMany, templates } = require('./notifications');

const notifyTodayCamps = async () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const camps = await Camp.find({
    isApproved: true,
    date: { $gte: start, $lte: end },
    todayReminderSentAt: { $exists: false },
  });

  if (!camps.length) return;

  const users = await User.find({ isBlocked: false }).select('name email isBlocked');

  for (const camp of camps) {
    await notifyMany(users, (user) => ({
      to: user.email,
      subject: `Today: ${camp.title}`,
      template: templates.campEmail(camp, 'today'),
    }));

    camp.todayReminderSentAt = new Date();
    await camp.save();
  }
};

const startCampReminderJob = () => {
  if (process.env.ENABLE_CAMP_REMINDERS === 'false') return;

  const run = () => notifyTodayCamps().catch((error) => {
    console.log('Camp reminder job failed:', error.message);
  });

  setTimeout(run, 5000);
  setInterval(run, 60 * 60 * 1000);
};

module.exports = { notifyTodayCamps, startCampReminderJob };
