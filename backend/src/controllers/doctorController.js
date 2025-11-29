const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const UserProfile = require('../models/UserProfile');
const { User } = require('../models/User');

const getDashboardOverview = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const [profile, appointments] = await Promise.all([
      DoctorProfile.findOne({ user: doctorId }),
      Appointment.find({ doctor: doctorId }).populate('user', 'name email role').sort({ scheduledDate: 1 }),
    ]);

    const pending = appointments.filter((appt) => appt.status === 'pending').length;
    const confirmed = appointments.filter((appt) => appt.status === 'confirmed').length;
    const completed = appointments.filter((appt) => appt.status === 'completed').length;

    res.json({
      profile,
      stats: {
        totalAppointments: appointments.length,
        pending,
        confirmed,
        completed,
      },
      upcomingAppointments: appointments.filter((appt) => ['pending', 'confirmed', 'rescheduled'].includes(appt.status)).slice(0, 10),
      recentActivities: appointments.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load doctor dashboard', error: error.message });
  }
};

const listAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { status } = req.query;

    const query = { doctor: doctorId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('user', 'name email role')
      .sort({ scheduledDate: 1, createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load appointments', error: error.message });
  }
};

const listUsers = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    const uniqueUsers = [];
    const seen = new Set();

    appointments.forEach((appointment) => {
      const appointmentUser = appointment.user;
      if (appointmentUser && !seen.has(String(appointmentUser._id))) {
        seen.add(String(appointmentUser._id));
        uniqueUsers.push({
          user: appointmentUser,
          lastAppointment: appointment,
        });
      }
    });

    res.json(uniqueUsers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load users', error: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { availability, emergencyHolidays } = req.body;

    const profile = await DoctorProfile.findOneAndUpdate(
      { user: doctorId },
      { availability, emergencyHolidays },
      { new: true }
    );

    res.json({ message: 'Availability updated', profile });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update availability', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { name, specialization, experience, education, description, consultationFee } = req.body;

    const userUpdates = {};
    if (name) {
      userUpdates.name = name;
    }

    const profileUpdates = {};
    if (specialization !== undefined) profileUpdates.specialization = specialization;
    if (experience !== undefined) profileUpdates.experience = experience;
    if (education !== undefined) profileUpdates.education = education;
    if (description !== undefined) profileUpdates.description = description;
    if (consultationFee !== undefined) profileUpdates.consultationFee = consultationFee;

    const [updatedUser, updatedProfile] = await Promise.all([
      Object.keys(userUpdates).length
        ? User.findByIdAndUpdate(doctorId, userUpdates, { new: true })
        : User.findById(doctorId),
      Object.keys(profileUpdates).length
        ? DoctorProfile.findOneAndUpdate({ user: doctorId }, profileUpdates, { new: true, upsert: true })
        : DoctorProfile.findOne({ user: doctorId }),
    ]);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      profile: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { appointmentId } = req.params;
    const { status, notes, prescription } = req.body;

    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (status) {
      appointment.status = status;
    }

    if (notes) {
      appointment.notes.push({
        author: doctorId,
        role: 'doctor',
        content: notes,
      });
    }

    if (prescription) {
      appointment.prescriptions.push(prescription);
    }

    if (status === 'completed') {
      appointment.completedAt = new Date();
    }

    await appointment.save();

    res.json({ message: 'Appointment updated', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appointment', error: error.message });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await UserProfile.findOne({ user: userId }).populate('user', 'name email role');
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const appointments = await Appointment.find({ user: userId, doctor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ profile, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load user details', error: error.message });
  }
};

module.exports = {
  getDashboardOverview,
  updateAvailability,
  updateProfile,
  listAppointments,
  listUsers,
  updateAppointmentStatus,
  getUserDetails,
};
