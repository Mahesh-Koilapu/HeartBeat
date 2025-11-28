const { validationResult } = require('express-validator');
const { User } = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
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

  const { name, email, password, specialization, experience, education, description, availability } = req.body;

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'doctor',
    });

    const profile = await DoctorProfile.create({
      user: user._id,
      specialization,
      experience,
      education,
      description,
      availability,
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: { ...safeUser, profile },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create doctor', error: error.message });
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

const listPatients = async (_req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-password');
    const profiles = await PatientProfile.find({ user: { $in: patients.map((p) => p._id) } });

    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.user.toString()] = profile;
      return acc;
    }, {});

    const result = patients.map((patient) => ({
      ...patient.toObject(),
      profile: profileMap[patient._id.toString()] || null,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch patients', error: error.message });
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
      .populate('patient', 'name email role')
      .populate('doctor', 'name email role')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch appointments', error: error.message });
  }
};

const assignDoctor = async (req, res) => {
  const { appointmentId } = req.params;
  const { doctorId } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.doctor = doctorId;
    appointment.status = 'confirmed';
    appointment.updatedBy = req.user._id;
    await appointment.save();

    res.json({ message: 'Doctor assigned successfully', appointment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign doctor', error: error.message });
  }
};

const updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status, scheduledDate, scheduledStart, scheduledEnd, reason } = req.body;

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
  listPatients,
  getAppointments,
  assignDoctor,
  updateAppointmentStatus,
};
