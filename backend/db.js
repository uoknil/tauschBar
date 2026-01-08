const mongoose = require('mongoose');

async function connectDB(mongoUri) {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB verbunden');
  } catch (err) {
    console.error('MongoDB Verbindung fehlgeschlagen:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
