// backend/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.get('/__test', (req, res) => {
  res.send('AUTH ROUTES AKTIV');
});

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');

// ===============================
// Multer Konfiguration (Profilbild)
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${req.user.userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});


// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email und password sind erforderlich.' });
    }

    const uname = String(username).trim();
    const mail = String(email).trim().toLowerCase();

    if (uname.length < 3) {
      return res.status(400).json({ message: 'Username zu kurz (min. 3 Zeichen).' });
    }

    if (!mail.includes('@') || mail.length < 5) {
      return res.status(400).json({ message: 'Ungültige E-Mail.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Passwort zu kurz (min. 6 Zeichen).' });
    }

    const existing = await User.findOne({ $or: [{ username: uname }, { email: mail }] });
    if (existing) {
      return res.status(409).json({ message: 'User existiert bereits.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // address/zip sind optional (können fehlen)
    const created = await User.create({ username: uname, email: mail, passwordHash });

    res.status(201).json({
      id: created._id,
      username: created.username,
      email: created.email
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: 'Registrierung fehlgeschlagen.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const uoe = String(usernameOrEmail).trim();
    const uoeLower = uoe.toLowerCase();

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'usernameOrEmail und password sind erforderlich.' });
    }

    const user = await User.findOne({
      $or: [{ username: uoe }, { email: uoeLower }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Login fehlgeschlagen.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Login fehlgeschlagen.' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: '2h',
        issuer: 'tauschBar'
      }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Login fehlgeschlagen.' });
  }
});

// PATCH /auth/profile (requires JWT)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { address, zip } = req.body;

    if (address === undefined && zip === undefined) {
      return res.status(400).json({ message: 'address oder zip muss angegeben werden.' });
    }

    const updates = {};
    if (address !== undefined) updates.address = address;
    if (zip !== undefined) updates.zip = zip;

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('username email address zip');

    if (!updated) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('PROFILE PATCH ERROR:', err);
    res.status(500).json({ message: 'Profil-Update fehlgeschlagen.' });
  }
});

// GET /auth/me
// Liefert die Profildaten des aktuell eingeloggten Users
// Wird z. B. für die Profilanzeige verwendet
router.get('/me', requireAuth, async (req, res) => {
  try {
    // User anhand der ID aus dem JWT laden
    const user = await User.findById(req.user.userId)
      // sensible Felder bewusst ausschließen
      .select('username email address zip profilePicture warnings isBanned');

    // Falls User nicht existiert (sollte eigentlich nicht passieren)
    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    // User-Daten an das Frontend zurückgeben
    res.json(user);
  } catch (err) {
    console.error('GET /auth/me ERROR:', err);
    res.status(500).json({ message: 'Profil konnte nicht geladen werden.' });
  }
});

// POST /auth/profile/picture
router.post(
  '/profile/picture',
  requireAuth,
  upload.single('profilePicture'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Kein Bild hochgeladen.' });
      }

      const imagePath = `/uploads/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { profilePicture: imagePath },
        { new: true }
      ).select('profilePicture');

      res.json({ profilePicture: user.profilePicture });
    } catch (err) {
      console.error('UPLOAD PROFILE PICTURE ERROR:', err);
      res.status(500).json({ message: 'Profilbild-Upload fehlgeschlagen.' });
    }
  }
);

// DELETE /auth/profile/picture
router.delete('/profile/picture', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      profilePicture: null
    });

    res.json({ message: 'Profilbild gelöscht.' });
  } catch (err) {
    console.error('DELETE PROFILE PICTURE ERROR:', err);
    res.status(500).json({ message: 'Profilbild konnte nicht gelöscht werden.' });
  }
});

module.exports = router;
