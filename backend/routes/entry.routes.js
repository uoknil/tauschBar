const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const { requireAuth } = require('../middleware/auth');

// GET /entries – alle NICHT gesperrten Einträge anzeigen (+ Suche/Filter via Query)
// Beispiele:
// /entries?category=Lernen
// /entries?zip=1010
// /entries?q=mathe
// /entries?from=2026-01-08&to=2026-01-10
// kombinierbar: /entries?zip=1010&category=Lernen&q=java&from=2026-01-08&to=2026-01-10
router.get('/', async (req, res) => {
  try {
    const { q, category, zip, from, to } = req.query;

    const filter = { isBlocked: false };

    // Kategorie (exakt)
    if (category) {
      filter.category = String(category).trim();
    }

    // PLZ (exakt)
    if (zip) {
      filter.zip = String(zip).trim();
    }

    // Suche (case-insensitive) über mehrere Felder
    if (q) {
      const s = String(q).trim();
      if (s) {
        const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
          { title: rx },
          { offerDescription: rx },
          { requestDescription: rx }
        ];
      }
    }

    // Zeitraum-Überlappung:
    // entry.availableFrom <= to  UND entry.availableTo >= from
    if (from || to) {
      const fromDate = from ? new Date(String(from)) : null;
      const toDate = to ? new Date(String(to)) : null;

      if (fromDate && !isNaN(fromDate)) {
        filter.availableTo = { ...(filter.availableTo || {}), $gte: fromDate };
      }
      if (toDate && !isNaN(toDate)) {
        filter.availableFrom = { ...(filter.availableFrom || {}), $lte: toDate };
      }
    }

    const all = await Entry.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(all);
  } catch (err) {
    console.error('GET /entries ERROR:', err);
    res.status(500).json({ message: 'Konnte Einträge nicht laden.' });
  }
});

// GET /entries/matches/:category
router.get('/matches/:category', async (req, res) => {
  try {
    const category = (req.params.category || '').trim();

    const matches = await Entry.find({
      category: { $regex: `^${category}$`, $options: 'i' }
    }).sort({ createdAt: -1 });

    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Konnte Matches nicht laden.' });
  }
});

// POST /entries
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, offerDescription, requestDescription, category, zip } = req.body;
    if (!title || !offerDescription || !requestDescription || !category || !zip) {
      return res.status(400).json({ message: 'Pflichtfelder fehlen (title, offerDescription, requestDescription, category, zip).' });
    }

    const z = String(zip).trim();
    if (z.length < 3) {
      return res.status(400).json({ message: 'PLZ ungültig.' });
    }

    // createdAt wird automatisch gesetzt, availableFrom und availableTo werden auf jetzt gesetzt
    const now = new Date();

    const created = await Entry.create({
      title: String(title).trim(),
      offerDescription: String(offerDescription).trim(),
      requestDescription: String(requestDescription).trim(),
      category: String(category).trim(),
      zip: z,
      availableFrom: now,
      availableTo: now,
      createdBy: req.user.userId
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('ENTRY CREATE ERROR:', err);
    res.status(400).json({ message: 'Eintrag konnte nicht gespeichert werden.' });
  }
});

// GET /entries/:id/matches
router.get('/:id/matches', requireAuth, async (req, res) => {
  try {
    const base = await Entry.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ message: 'Eintrag nicht gefunden.' });
    }

    if (String(base.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Nicht erlaubt: Nicht dein Eintrag.' });
    }

    const baseCategory = (base.category || '').trim();
    const baseZip = (base.zip || '').trim();

    const matches = await Entry.find({
      _id: { $ne: base._id },
      createdBy: { $ne: base.createdBy }, // ✅ NEU: eigene Einträge ausschließen
      isBlocked: false,
      category: { $regex: `^${baseCategory}$`, $options: 'i' },
      zip: baseZip,
      availableFrom: { $lte: base.availableTo },
      availableTo: { $gte: base.availableFrom }
    })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ baseEntryId: base._id, count: matches.length, matches });
  } catch (err) {
    console.error('MATCH ERROR:', err);
    res.status(500).json({ message: 'Konnte Matches nicht laden.' });
  }
});

// DELETE /entries/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ message: 'Eintrag nicht gefunden.' });
    }

    if (!entry.createdBy) {
      return res.status(403).json({ message: 'Dieser Eintrag hat keinen Owner und kann nicht gelöscht werden.' });
    }

    if (String(entry.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Nicht erlaubt: Du bist nicht der Ersteller.' });
    }

    await entry.deleteOne();
    res.json({ message: 'Eintrag gelöscht.' });
  } catch (err) {
    res.status(500).json({ message: 'Löschen fehlgeschlagen.' });
  }
});

module.exports = router;
