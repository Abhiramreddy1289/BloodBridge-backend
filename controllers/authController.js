const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
// const sendSMS = require('../utils/sendSMS'); // SMS removed
const { isValidEmail, isValidPhone, isValidName } = require('../utils/validation');
const { uploadImage } = require('../utils/cloudinary');
const { queueNotification, templates } = require('../utils/notifications');

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, bloodGroup, phone, age, gender, city, state, coordinates } = req.body;

  // Validate required fields
  if (!name || !email || !password || !bloodGroup || !phone) {
    res.status(400);
    throw new Error('Name, email, password, blood group, and phone are required');
  }

  // Validate field formats
  if (!isValidEmail(email)) {
    res.status(400);
    throw new Error('Invalid email address');
  }
  if (!isValidPhone(phone)) {
    res.status(400);
    throw new Error('Invalid phone number');
  }
  if (!isValidName(name)) {
    res.status(400);
    throw new Error('Invalid name format');
  }

// redundant required fields check removed

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const validCoordinates = Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value) => Number.isFinite(Number(value)));

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    bloodGroup,
    phone,
    age,
    gender,
    city,
    state,
    location: validCoordinates ? { type: 'Point', coordinates: coordinates.map(Number) } : undefined,
  });

  if (user) {
    queueNotification({
      to: user.email,
      subject: 'Welcome to BloodBridge',
      template: templates.welcomeEmail(user),
    });

//     // Send Welcome SMS (Placeholder)
//     // sendSMS({
//     //   phone: user.phone,
//     //   message: `Hi ${user.name}, welcome to BloodBridge! You're now a verified ${user.bloodGroup} donor in ${user.city}. Stay alert for SOS requests.`,
//     // }).catch(err => console.error('Failed to send welcome SMS:', err.message));

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bloodGroup: user.bloodGroup,
      city: user.city,
      state: user.state,
      availabilityStatus: user.availabilityStatus,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // --- Admin login using env variables ---
  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Use findOneAndUpdate to atomically find-or-create the admin user.
    // This avoids duplicate key errors if the admin was partially created before.
    let adminUser = await User.findOne({ email });

    if (!adminUser) {
      // Hash the password manually since pre-save hooks don't run on findOneAndUpdate
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      adminUser = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            name: 'Admin',
            email,
            passwordHash: hashedPassword,
            role: 'admin',
            bloodGroup: 'A+',
            phone: '0000000000',
            isVerified: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    if (adminUser.location && (!Array.isArray(adminUser.location.coordinates) || adminUser.location.coordinates.length !== 2)) {
      await User.collection.updateOne({ _id: adminUser._id }, { $unset: { location: '' } });
      adminUser.location = undefined;
    }

    // Ensure role is admin (in case an old record exists with a different role)
    if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      await adminUser.save();
    }

    return res.json({
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      avatar: adminUser.avatar,
      token: generateToken(adminUser._id),
    });
  }

  // --- Regular user login ---
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    queueNotification({
      to: user.email,
      subject: 'New Login to Your BloodBridge Account',
      template: templates.loginEmail(user),
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bloodGroup: user.bloodGroup,
      city: user.city,
      state: user.state,
      availabilityStatus: user.availabilityStatus,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const getMe = asyncHandler(async (req, res) => {
  const user = req.user;

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    bloodGroup: user.bloodGroup,
    phone: user.phone,
    age: user.age,
    gender: user.gender,
    city: user.city,
    state: user.state,
    location: user.location,
    availabilityStatus: user.availabilityStatus,
    lastDonationDate: user.lastDonationDate,
    avatar: user.avatar,
    createdAt: user.createdAt,
  });
});

const updateAvatar = asyncHandler(async (req, res) => {
  const { image } = req.body;

  if (!image) {
    res.status(400);
    throw new Error('Image is required');
  }

  const upload = await uploadImage(image, 'bloodbridge/avatars');
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.avatar = upload.url;
  await user.save();

  queueNotification({
    to: user.email,
    subject: 'BloodBridge profile photo updated',
    template: templates.profileUpdateEmail(user),
  });

  res.json({
    _id: user._id,
    avatar: user.avatar,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = { registerUser, loginUser, getMe, updateAvatar, logoutUser };
