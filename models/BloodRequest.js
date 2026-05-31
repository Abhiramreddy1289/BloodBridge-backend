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

const bloodRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientName: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    unitsRequired: { type: Number, required: true },
    hospitalName: { type: String, required: true },
    hospitalAddress: { type: String, required: true },
    city: { type: String, required: true },
    urgencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    location: { type: pointSchema, default: undefined },
    contactNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'on_the_way', 'arrived', 'completed', 'cancelled'],
      default: 'pending',
    },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number }, // in minutes
    donorETA: { type: Number }, // in minutes
    escalationLevel: { type: Number, default: 0 }, // 0: 20km, 1: 50km, 2: City-wide
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ location: '2dsphere' });

bloodRequestSchema.pre('validate', function (next) {
  if (!this.location || !this.location.coordinates || this.location.coordinates.length === 0) {
    this.location = undefined;
  }

  next();
});

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);
module.exports = BloodRequest;
