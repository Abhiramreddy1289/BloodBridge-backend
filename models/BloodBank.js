const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coordinates) => (
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          coordinates.every((value) => Number.isFinite(value))
        ),
        message: 'Location coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const bloodBankSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, index: true },
    district: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    pincode: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    source: { type: String, default: 'eRaktKosh', index: true },
    location: { type: pointSchema, required: true },
    inventory: {
      'A+': { type: Number, default: () => Math.floor(Math.random() * 35) + 5 },
      'A-': { type: Number, default: () => Math.floor(Math.random() * 10) + 1 },
      'B+': { type: Number, default: () => Math.floor(Math.random() * 40) + 5 },
      'B-': { type: Number, default: () => Math.floor(Math.random() * 10) + 1 },
      'AB+': { type: Number, default: () => Math.floor(Math.random() * 15) + 2 },
      'AB-': { type: Number, default: () => Math.floor(Math.random() * 5) + 1 },
      'O+': { type: Number, default: () => Math.floor(Math.random() * 50) + 5 },
      'O-': { type: Number, default: () => Math.floor(Math.random() * 15) + 2 },
    },
  },
  {
    timestamps: true,
  }
);

bloodBankSchema.index({ location: '2dsphere' });
bloodBankSchema.index({ name: 'text', address: 'text', district: 'text', state: 'text' });
bloodBankSchema.index({ name: 1, district: 1, state: 1 }, { unique: true });

const BloodBank = mongoose.model('BloodBank', bloodBankSchema);
module.exports = BloodBank;
