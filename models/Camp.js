const mongoose = require('mongoose');

const campSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    organiser: { type: String, required: true },
    phone: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    announcementSentAt: { type: Date },
    todayReminderSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const Camp = mongoose.model('Camp', campSchema);
module.exports = Camp;
