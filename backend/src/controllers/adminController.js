const { validationResult } = require('express-validator');
const { User } = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const UserProfile = require('../models/UserProfile');
const Appointment = require('../models/Appointment');

const listDoctors = async (_req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password');
    const doctorProfiles = await DoctorProfile.find({ user: { $in: doctors.map((d) => d._id) } });

    const doctorMap = doctorProfiles.reduce((acc, profile) => {
      acc[profile.user.toString()] = profile;
      return acc;
    }, {});

    const result = doctors.map((doctor) => ({
      ...doctor.toObject(),
      profile: doctorMap[doctor._id.toString()] || null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch doctors', error: error.message });
  }
};

const createDoctor = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, specialization, experience, education, description } = req.body;

  try {
    const normalizedEmail = email.toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const doctorUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'doctor',
    });

    const profile = await DoctorProfile.create({
      user: doctorUser._id,
      specialization,
      experience,
      education,
      description,
    });

    const doctorPlain = doctorUser.toObject();
    delete doctorPlain.password;

    return res.status(201).json({
      message: 'Doctor added successfully',
      doctor: {
        ...doctorPlain,
        profile,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create doctor', error: error.message });
  }
};

const updateDoctorStatus = async (req, res) => {
  const { doctorId } = req.params;
  const { isActive } = req.body;

  try {
    const doctor = await User.findByIdAndUpdate(
      doctorId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor status updated', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update doctor status', error: error.message });
  }
};

const deleteDoctor = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    await DoctorProfile.deleteOne({ user: doctor._id });
    await User.deleteOne({ _id: doctor._id });

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete doctor', error: error.message });
  }
};

const listUsers = async (_req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    const userIds = users.map((p) => p._id);
    const profiles = await UserProfile.find({ user: { $in: userIds } });

    const latestAppointments = await Appointment.aggregate([
      {
        $match: {
          user: { $in: userIds },
        },
      },
      { $sort: { preferredDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          appointment: { $first: '$$ROOT' },
        },
      },
    ]);

    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.user.toString()] = profile;
      return acc;
    }, {});

    const appointmentMap = latestAppointments.reduce((acc, item) => {
      acc[item._id.toString()] = item.appointment;
      return acc;
    }, {});

    const result = users.map((user) => ({
      ...user.toObject(),
      profile: profileMap[user._id.toString()] || null,
      latestAppointment: appointmentMap[user._id.toString()]
        ? {
            diseaseCategory: appointmentMap[user._id.toString()].diseaseCategory,
            preferredDate: appointmentMap[user._id.toString()].preferredDate,
            status: appointmentMap[user._id.toString()].status,
          }
        : null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

const getAppointments = async (req, res) => {
  const { date, doctor, status } = req.query;

  const query = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.preferredDate = { $gte: start, $lte: end };
  }
  if (doctor) {
    query.doctor = doctor;
  }
  if (status) {
    query.status = status;
  }

  try {
    const appointments = await Appointment.find(query)
      .populate('user', 'name email role')
      .populate('doctor', 'name email role')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: error.message });
  }
};

const assignDoctor = async (req, res) => {
  const { appointmentId } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { doctorId, scheduledDate, scheduledStart, scheduledEnd, adminNotes } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctor && appointment.status !== 'pending' && appointment.status !== 'rescheduled') {
      return res.status(409).json({ message: 'Only pending or rescheduled appointments can be assigned' });
    }

    const doctor = await User.findById(doctorId).select('name email role isActive');
    if (!doctor || doctor.role !== 'doctor' || !doctor.isActive) {
      return res.status(404).json({ message: 'Doctor not available' });
    }

    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile) {
      return res.status(400).json({ message: 'Doctor profile not configured' });
    }

    const scheduleDate = scheduledDate ? new Date(scheduledDate) : appointment.preferredDate;
    if (!scheduleDate || Number.isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ message: 'Valid scheduled date is required' });
    }

    const finalScheduledStart = scheduledStart || appointment.preferredStart || '09:00';
    const finalScheduledEnd = scheduledEnd || appointment.preferredEnd || '09:30';

    if (!finalScheduledStart || !finalScheduledEnd) {
      return res.status(400).json({ message: 'Scheduled start and end times are required' });
    }

    let availabilityWarning = false;
    const hasAvailability = Array.isArray(profile.availability) && profile.availability.length > 0;
    if (hasAvailability) {
      const availabilityMatch = profile.availability.find((slot) => {
        if (!slot || slot.isClosed) {
          return false;
        }
        const slotDate = slot.date instanceof Date ? slot.date : new Date(slot.date);
        if (Number.isNaN(slotDate.getTime())) {
          return false;
        }
        const sameDay = slotDate.toISOString().slice(0, 10) === scheduleDate.toISOString().slice(0, 10);
        if (!sameDay) {
          return false;
        }
        return slot.startTime <= finalScheduledStart && slot.endTime >= finalScheduledEnd;
      });

      if (!availabilityMatch) {
        availabilityWarning = true;
      }
    }

    const conflict = await Appointment.findOne({
      doctor: doctorId,
      scheduledDate: scheduleDate,
      scheduledStart: finalScheduledStart,
      status: { $in: ['pending', 'confirmed', 'rescheduled'] },
      _id: { $ne: appointmentId },
    });

    if (conflict) {
      return res.status(409).json({ message: 'Doctor already has an appointment in this slot' });
    }

    appointment.doctor = doctorId;
    appointment.status = 'confirmed';
    appointment.scheduledDate = scheduleDate;
    appointment.scheduledStart = finalScheduledStart;
    appointment.scheduledEnd = finalScheduledEnd;
    appointment.assignedBy = req.user._id;
    appointment.updatedBy = req.user._id;
    appointment.confirmationMessage = `Your appointment with Dr. ${doctor.name} is confirmed for ${scheduleDate.toLocaleDateString()} at ${finalScheduledStart}.`;
    appointment.confirmationSentAt = new Date();

    if (adminNotes) {
      appointment.notes.push({
        author: req.user._id,
        role: 'admin',
        content: adminNotes,
      });
    }

    await appointment.save();

    res.json({
      message: availabilityWarning
        ? 'Doctor assigned with custom schedule (outside configured availability).'
        : 'Doctor assigned successfully',
      appointment,
      availabilityWarning,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign doctor', error: error.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status, scheduledDate, scheduledStart, scheduledEnd, reason, adminNotes } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (status) {
      appointment.status = status;
    }

    if (scheduledDate) {
      appointment.scheduledDate = scheduledDate;
      appointment.scheduledStart = scheduledStart;
      appointment.scheduledEnd = scheduledEnd;
    }

    if (reason) {
      appointment.cancellationReason = reason;
    }

    if (adminNotes) {
      appointment.notes.push({
        author: req.user._id,
        role: 'admin',
        content: adminNotes,
      });
    }

    appointment.updatedBy = req.user._id;
    await appointment.save();

    res.json({ message: 'Appointment updated successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appointment', error: error.message });
  }
};

module.exports = {
  listDoctors,
  createDoctor,
  updateDoctorStatus,
  deleteDoctor,
  listUsers,
  getAppointments,
  assignDoctor,
  updateAppointmentStatus,
};
