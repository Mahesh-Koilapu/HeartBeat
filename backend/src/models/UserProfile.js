const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    relation: String,
  },
  { _id: false }
);

const userProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    diseaseType: { type: String, trim: true },
    symptoms: { type: String, trim: true },
    medicalHistory: { type: String, trim: true },
    emergencyContact: emergencyContactSchema,
    medicalReports: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProfile', userProfileSchema);
