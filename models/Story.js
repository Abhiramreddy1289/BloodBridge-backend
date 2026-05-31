const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    quote: { type: String, required: true },
    location: { type: String },
    isApproved: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Story = mongoose.model('Story', storySchema);
module.exports = Story;
