const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['appointment', 'availability', 'system'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'in-app'],
      default: 'in-app',
    },
    triggerSource: { type: String, enum: ['admin', 'doctor', 'user', 'system'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
