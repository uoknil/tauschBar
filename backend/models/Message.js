const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // Konversation zwischen zwei Usern (bezogen auf einen Entry)
  conversationKey: {
    type: String,
    required: true,
    index: true
  },

  // Bezug zum Entry (optional, aber empfohlen für Kontext)
  entryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entry',
    required: true
  },

  // Sender der Nachricht
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Empfänger der Nachricht
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Nachrichteninhalt
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },

  // Gelesen-Status
  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// Hilfsmethode: Erstellt einen eindeutigen Key für eine Konversation
// Sortiert User-IDs alphabetisch + Entry-ID für Eindeutigkeit
MessageSchema.statics.createConversationKey = function(userId1, userId2, entryId) {
  const sorted = [String(userId1), String(userId2)].sort();
  return `${sorted[0]}_${sorted[1]}_${entryId}`;
};

module.exports = mongoose.model('Message', MessageSchema);
