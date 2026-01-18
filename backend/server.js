const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./db');


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security-Header
app.use(helmet({ contentSecurityPolicy: false }));

// DB
connectDB(process.env.MONGO_URI);

// JSON-Body lesen
app.use(express.json());

// CORS (Frontend läuft auf gleichem Origin)
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Test-Route
app.get('/api', (req, res) => {
  res.send('tauschBar API läuft');
});

// Routes
app.use('/entries', require('./routes/entry.routes'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/reports', require('./routes/report.routes'));
app.use('/messages', require('./routes/message.routes'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend ausliefern
app.use(express.static(path.join(__dirname, '../frontend')));

// Root-Route zur Landing Page weiterleiten
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
