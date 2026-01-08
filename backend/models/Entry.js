const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  offerDescription: {
    type: String,
    required: true
  },
  requestDescription: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },

  // Standort & Zeitraum (MR02 / MR03 / MR04)
  zip: {
    type: String,
    required: true,
    trim: true
  },
  availableFrom: {
    type: Date,
    required: true
  },
  availableTo: {
    type: Date,
    required: true
  },

  // Moderation
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String, default: '' },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Entry', EntrySchema);
