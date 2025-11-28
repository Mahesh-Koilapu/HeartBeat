const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakSlots: [{ start: String, end: String }],
    maxPatients: { type: Number, default: 1 },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, required: true, trim: true },
    experience: { type: Number, default: 0 },
    education: { type: String, trim: true },
    description: { type: String, trim: true },
    photoUrl: { type: String },
    consultationFee: { type: Number },
    availability: [availabilitySchema],
    emergencyHolidays: [{ type: Date }],
    ratings: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
