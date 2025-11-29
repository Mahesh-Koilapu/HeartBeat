const { validationResult } = require('express-validator');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const UserProfile = require('../models/UserProfile');
const { User } = require('../models/User');

const listDoctors = async (req, res) => {
  try {
    const { specialty, experience, date } = req.query;

    const query = {};
    if (specialty) {
      query.specialization = specialty;
    }
    if (experience) {
      query.experience = { $gte: Number(experience) };
    }

    if (date) {
      query['availability.date'] = { $eq: new Date(date) };
    }

    const doctorProfiles = await DoctorProfile.find(query).populate('user', 'name email role isActive');

    const result = doctorProfiles
      .filter((profile) => profile.user?.isActive)
      .map((profile) => ({
        id: profile.user._id,
        name: profile.user.name,
        email: profile.user.email,
        specialization: profile.specialization,
        experience: profile.experience,
        education: profile.education,
        description: profile.description,
        consultationFee: profile.consultationFee,
        availability: profile.availability,
        ratings: profile.ratings,
        photoUrl: profile.photoUrl,
      }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load doctors', error: error.message });
  }
};

const createAppointment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      diseaseCategory,
      symptoms,
      details,
      preferredDate,
      preferredStart,
      preferredEnd,
      documents,
    } = req.body;

    const appointment = await Appointment.create({
      user: req.user._id,
      diseaseCategory,
      symptoms,
      details,
      preferredDate,
      preferredStart,
      preferredEnd,
      status: 'pending',
      documents,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Appointment booked successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create appointment', error: error.message });
  }
};

const listAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate('doctor', 'name email role')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load appointments', error: error.message });
  }
};

const updateAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { action, reason, newDate, newStart, newEnd } = req.body;

  try {
    const appointment = await Appointment.findOne({ _id: appointmentId, user: req.user._id });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (action === 'cancel') {
      appointment.status = 'cancelled';
      appointment.cancellationReason = reason || 'Cancelled by user';
    }

    if (action === 'reschedule') {
      appointment.rescheduleHistory.push({
        previousDate: appointment.scheduledDate || appointment.preferredDate,
        newDate,
        reason,
        requestedBy: 'user',
      });
      appointment.status = 'rescheduled';
      appointment.scheduledDate = newDate;
      appointment.scheduledStart = newStart;
      appointment.scheduledEnd = newEnd;
    }

    appointment.updatedBy = req.user._id;
    await appointment.save();

    res.json({ message: 'Appointment updated', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appointment', error: error.message });
  }
};

const getDashboardOverview = async (req, res) => {
  try {
    const [upcoming, history] = await Promise.all([
      Appointment.find({ user: req.user._id, status: { $in: ['pending', 'confirmed', 'rescheduled'] } })
        .populate('doctor', 'name email')
        .sort({ scheduledDate: 1 })
        .limit(10),
      Appointment.find({ user: req.user._id, status: 'completed' })
        .populate('doctor', 'name email')
        .sort({ updatedAt: -1 })
        .limit(10),
    ]);

    res.json({
      upcoming,
      history,
      stats: {
        total: upcoming.length + history.length,
        completed: history.length,
        pending: upcoming.filter((appt) => appt.status === 'pending').length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
};

const getDoctorProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const profile = await DoctorProfile.findOne({ user: doctorId }).populate('user', 'name email role isActive');

    if (!profile || !profile.user?.isActive) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load doctor profile', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const profile = await UserProfile.findOne({ user: req.user._id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load profile', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      diseaseType,
      symptoms,
      medicalHistory,
      emergencyContact,
    } = req.body;

    const updates = {};
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (diseaseType !== undefined) updates.diseaseType = diseaseType;
    if (symptoms !== undefined) updates.symptoms = symptoms;
    if (medicalHistory !== undefined) updates.medicalHistory = medicalHistory;
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;

    const [user, profile] = await Promise.all([
      name ? User.findByIdAndUpdate(req.user._id, { name }, { new: true }) : User.findById(req.user._id),
      UserProfile.findOneAndUpdate(
        { user: req.user._id },
        { $set: updates },
        { new: true, upsert: true }
      ),
    ]);

    res.json({ message: 'Profile updated successfully', user, profile });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

module.exports = {
  listDoctors,
  createAppointment,
  listAppointments,
  updateAppointment,
  getDashboardOverview,
  getDoctorProfile,
  getProfile,
  updateProfile,
};
