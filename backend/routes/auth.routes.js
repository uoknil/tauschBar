// backend/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profile-pictures');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp.extension
    const uniqueName = `${req.user.userId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilddateien sind erlaubt (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
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

    // address/zip sind optional 
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

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'usernameOrEmail und password sind erforderlich.' });
    }

    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
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
      { expiresIn: '2h' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ message: 'Login fehlgeschlagen.' });
  }
});

// GET /auth/profile (requires JWT) - Retrieve user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username email address zip warnings isBanned createdAt profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    res.json(user);
  } catch (err) {
    console.error('PROFILE GET ERROR:', err);
    res.status(500).json({ message: 'Profil konnte nicht geladen werden.' });
  }
});

// PATCH /auth/profile (requires JWT) - Update user profile
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
    ).select('username email address zip profilePicture');

    if (!updated) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    res.json(updated);
  } catch (err) {
    console.error('PROFILE PATCH ERROR:', err);
    res.status(500).json({ message: 'Profil-Update fehlgeschlagen.' });
  }
});

// POST /auth/profile/picture (requires JWT) - Upload profile picture
router.post('/profile/picture', requireAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen.' });
    }

    // Get the old profile picture to delete it
    const user = await User.findById(req.user.userId);
    if (user.profilePicture) {
      const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    // Save relative path to database
    const relativePath = `/uploads/profile-pictures/${req.file.filename}`;
    
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { profilePicture: relativePath } },
      { new: true }
    ).select('username email profilePicture');

    if (!updated) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    res.json({
      message: 'Profilbild erfolgreich hochgeladen.',
      profilePicture: updated.profilePicture
    });
  } catch (err) {
    console.error('PROFILE PICTURE UPLOAD ERROR:', err);
    res.status(500).json({ message: 'Profilbild-Upload fehlgeschlagen.' });
  }
});

// DELETE /auth/profile/picture (requires JWT) - Delete profile picture
router.delete('/profile/picture', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden.' });
    }

    if (!user.profilePicture) {
      return res.status(400).json({ message: 'Kein Profilbild vorhanden.' });
    }

    // Delete file from filesystem
    const picturePath = path.join(__dirname, '..', user.profilePicture);
    if (fs.existsSync(picturePath)) {
      fs.unlinkSync(picturePath);
    }

    // Remove from database
    user.profilePicture = null;
    await user.save();

    res.json({ message: 'Profilbild erfolgreich gelöscht.' });
  } catch (err) {
    console.error('PROFILE PICTURE DELETE ERROR:', err);
    res.status(500).json({ message: 'Profilbild-Löschung fehlgeschlagen.' });
  }
});

module.exports = router;
