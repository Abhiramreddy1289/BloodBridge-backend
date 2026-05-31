const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['donor', 'hospital', 'admin'], default: 'donor' },
    bloodGroup: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: pointSchema, default: undefined },
    age: { type: Number },
    gender: { type: String },
    city: { type: String },
    state: { type: String },
    availabilityStatus: { type: Boolean, default: true },
    lastDonationDate: { type: Date },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    reliabilityScore: { type: Number, default: 80, min: 0, max: 100 },
    inventory: {
      'A+': { type: Number, default: 0 },
      'A-': { type: Number, default: 0 },
      'B+': { type: Number, default: 0 },
      'B-': { type: Number, default: 0 },
      'AB+': { type: Number, default: 0 },
      'AB-': { type: Number, default: 0 },
      'O+': { type: Number, default: 0 },
      'O-': { type: Number, default: 0 },
    },
    avatar: { type: String },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });

userSchema.pre('validate', function (next) {
  if (!this.location || !this.location.coordinates || this.location.coordinates.length === 0) {
    this.location = undefined;
  }

  if (this.role === 'hospital') {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const hasAnyStock = bloodGroups.some(g => this.inventory?.[g] > 0);
    if (!hasAnyStock) {
      if (!this.inventory) this.inventory = {};
      this.inventory['A+'] = Math.floor(Math.random() * 35) + 5;
      this.inventory['A-'] = Math.floor(Math.random() * 10) + 1;
      this.inventory['B+'] = Math.floor(Math.random() * 40) + 5;
      this.inventory['B-'] = Math.floor(Math.random() * 10) + 1;
      this.inventory['AB+'] = Math.floor(Math.random() * 15) + 2;
      this.inventory['AB-'] = Math.floor(Math.random() * 5) + 1;
      this.inventory['O+'] = Math.floor(Math.random() * 50) + 5;
      this.inventory['O-'] = Math.floor(Math.random() * 15) + 2;
    }
  }

  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
