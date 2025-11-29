const mongoose = require('mongoose');

const rescheduleSchema = new mongoose.Schema(
  {
    previousDate: Date,
    newDate: Date,
    reason: String,
    requestedBy: { type: String, enum: ['user', 'doctor', 'admin'] },
    actionedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['doctor', 'user', 'admin', 'system'] },
    content: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    diseaseCategory: { type: String, required: true, trim: true },
    symptoms: { type: String, trim: true },
    details: { type: String, trim: true },
    preferredDate: { type: Date, required: true },
    preferredStart: { type: String },
    preferredEnd: { type: String },
    scheduledDate: { type: Date },
    scheduledStart: { type: String },
    scheduledEnd: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'declined'],
      default: 'pending',
    },
    cancellationReason: String,
    rescheduleHistory: [rescheduleSchema],
    notes: [noteSchema],
    prescriptions: [prescriptionSchema],
    documents: [
      {
        label: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    followUpDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmationMessage: String,
    confirmationSentAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
