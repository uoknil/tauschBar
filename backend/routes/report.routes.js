const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Report = require('../models/Report');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// --- Mini-"Moderation": für Demo reicht ein Shared Secret in .env ---
// In .env: MOD_TOKEN=irgendein_geheimwort
function requireModeration(req, res, next) {
  const token = req.headers['x-mod-token'];
  if (!process.env.MOD_TOKEN) {
    return res.status(500).json({ message: 'MOD_TOKEN fehlt in .env' });
  }
  if (token !== process.env.MOD_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: Moderation token fehlt/ist falsch.' });
  }
  next();
}

// 1) Nutzer meldet Eintrag
router.post('/', requireAuth, async (req, res) => {
  try {
    const { entryId, reason, details } = req.body;

    if (!entryId || !reason) {
      return res.status(400).json({ message: 'entryId und reason sind erforderlich.' });
    }
    if (!mongoose.isValidObjectId(entryId)) {
      return res.status(400).json({ message: 'Ungültige entryId.' });
    }

    const report = await Report.create({
      entryId,
      reportedBy: req.user.userId,
      reason: String(reason).trim(),
      details: (details || '').toString().trim(),
      status: 'open'
    });

    return res.status(201).json({ message: 'Meldung erfolgreich übermittelt ✅', report });
  } catch (err) {
    console.error('Report POST Fehler:', err);
    return res.status(500).json({ message: 'Meldung konnte nicht gespeichert werden.', error: err.message });
  }
});

// 2) Moderation: Meldungen einsehen
router.get('/', requireModeration, async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'username email warnings isBanned')
      .populate('entryId'); // Entry komplett (für Demo ok)

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Reports konnten nicht geladen werden.', error: err.message });
  }
});

// 3) Moderation: Maßnahmen setzen
// PATCH /reports/:id/action  body: { action: "blockEntry"|"warnUser"|"close", note?: "...", blockReason?: "..." }
router.patch('/:id/action', requireModeration, async (req, res) => {
  try {
    const { action, note, blockReason } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Ungültige reportId.' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report nicht gefunden.' });

    // Entry laden (für block)
    const entry = await Entry.findById(report.entryId);

    if (action === 'blockEntry') {
      if (!entry) return res.status(404).json({ message: 'Entry nicht gefunden.' });

      entry.isBlocked = true;
      entry.blockedReason = blockReason || 'Durch Moderation gesperrt';
      await entry.save();

      report.status = 'reviewed';
      report.moderationNote = note || 'Entry gesperrt';
      await report.save();

      return res.json({ message: 'Entry wurde gesperrt.', report, entry });
    }

    if (action === 'warnUser') {
      if (!entry) return res.status(404).json({ message: 'Entry nicht gefunden.' });

      // Owner eines Entries ist createdBy (ObjectId)
      if (!entry.createdBy) return res.status(400).json({ message: 'Entry hat keinen Owner (createdBy).' });

      const owner = await User.findById(entry.createdBy);
      if (!owner) return res.status(404).json({ message: 'User nicht gefunden.' });

      owner.warnings = (owner.warnings || 0) + 1;
      await owner.save();

      report.status = 'reviewed';
      report.moderationNote = note || 'User verwarnt';
      await report.save();

      return res.json({ message: 'User wurde verwarnt.', report, owner });
    }

    if (action === 'close') {
      report.status = 'closed';
      report.moderationNote = note || 'Report geschlossen';
      await report.save();
      return res.json({ message: 'Report geschlossen.', report });
    }

    return res.status(400).json({ message: 'Unbekannte action.' });
  } catch (err) {
    res.status(500).json({ message: 'Aktion fehlgeschlagen.', error: err.message });
  }
});

module.exports = router;
