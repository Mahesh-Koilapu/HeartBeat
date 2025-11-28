const { validationResult } = require('express-validator');
const { User } = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const { signToken } = require('../utils/generateToken');

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const sendAuthToken = (res, user) => {
  const token = signToken({ id: user._id, role: user.role });
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie('token', token, cookieOptions);
  return token;
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    email,
    password,
    role = 'patient',
    specialization,
    experience,
    education,
    description,
    consultationFee,
    diseaseType,
    symptoms,
    age,
    gender,
  } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role,
    });

    if (role === 'doctor') {
      await DoctorProfile.create({
        user: user._id,
        specialization,
        experience,
        education,
        description,
        consultationFee,
      });
    }

    if (role === 'patient') {
      await PatientProfile.create({
        user: user._id,
        diseaseType,
        symptoms,
        age,
        gender,
      });
    }

    const token = sendAuthToken(res, user);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = sendAuthToken(res, user);

    return res.json({
      message: 'Login successful',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profileDetails = null;
    if (user.role === 'doctor') {
      profileDetails = await DoctorProfile.findOne({ user: user._id });
    }
    if (user.role === 'patient') {
      profileDetails = await PatientProfile.findOne({ user: user._id });
    }

    return res.json({
      user: buildUserResponse(user),
      profile: profileDetails,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load profile', error: error.message });
  }
};

const logout = async (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
};
