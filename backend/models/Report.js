const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entry',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  details: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    default: 'open' // open | reviewed | closed
  },

  // ➜ HIER einfügen (neu)
  moderationNote: {
    type: String,
    default: ''
  }

}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
