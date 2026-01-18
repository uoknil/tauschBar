const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  
  // Typ: "offer" (Hilfe anbieten) oder "request" (Hilfe suchen)
  entryType: {
    type: String,
    required: true,
    enum: ['offer', 'request']
  },
  
  // Beschreibung - je nach entryType wird entweder offerDescription oder requestDescription verwendet
  offerDescription: {
    type: String,
    required: false  // nur required wenn entryType === 'offer'
  },
  requestDescription: {
    type: String,
    required: false  // nur required wenn entryType === 'request'
  },
  
  category: {
    type: String,
    required: true
  },

  // Standort (MR02 / MR03 / MR04)
  zip: {
    type: String,
    required: true,
    trim: true
  },
  
  // H3 Geolocation Index (für geografisches Matching)
  // Wird aus PLZ berechnet - für jetzt optional, später required
  h3Index: {
    type: String,
    required: false
  },
  
  // Koordinaten für H3-Berechnung (optional)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableTo: {
    type: Date,
    default: function() {
      // Standard: 30 Tage ab jetzt
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
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

// ============================================================================
// INDIZES für Performance und Funktionalität
// ============================================================================

// 1. Text-Search Index für Volltext-Suche (Stufe 4 des Trichters)
// Erlaubt Suche nach Keywords in Titel und Beschreibungen
EntrySchema.index({ 
  title: 'text', 
  offerDescription: 'text', 
  requestDescription: 'text' 
});

// 2. Compound Index für schnelles Geo + Kategorie + Typ Matching (Stufen 1-3)
EntrySchema.index({ h3Index: 1, category: 1, entryType: 1 });

// 3. Index für PLZ-basiertes Matching (Fallback wenn kein H3)
EntrySchema.index({ zip: 1, category: 1, entryType: 1 });

// 4. Index für Zeitraum-Queries
EntrySchema.index({ availableFrom: 1, availableTo: 1 });

// 5. Index für User-spezifische Queries
EntrySchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Entry', EntrySchema);
