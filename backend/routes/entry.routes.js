const express = require('express');
const router = express.Router();
const Entry = require('../models/Entry');
const { requireAuth } = require('../middleware/auth');
const h3 = require('h3-js');

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
    const { title, entryType, offerDescription, requestDescription, category, zip } = req.body;
    
    // Validierung der Pflichtfelder
    if (!title || !entryType || !category || !zip) {
      return res.status(400).json({ message: 'Pflichtfelder fehlen (title, entryType, category, zip).' });
    }

    // Validierung des entryType
    if (entryType !== 'offer' && entryType !== 'request') {
      return res.status(400).json({ message: 'entryType muss "offer" oder "request" sein.' });
    }

    // Validierung: je nach entryType muss die entsprechende Description vorhanden sein
    if (entryType === 'offer' && (!offerDescription || String(offerDescription).trim().length < 10)) {
      return res.status(400).json({ message: 'Bei "Hilfe anbieten" muss eine Angebotsbeschreibung (min. 10 Zeichen) angegeben werden.' });
    }

    if (entryType === 'request' && (!requestDescription || String(requestDescription).trim().length < 10)) {
      return res.status(400).json({ message: 'Bei "Hilfe suchen" muss eine Gesuchsbeschreibung (min. 10 Zeichen) angegeben werden.' });
    }

    const z = String(zip).trim();
    if (z.length < 3) {
      return res.status(400).json({ message: 'PLZ ungültig.' });
    }

    // createdAt wird automatisch gesetzt
    // availableFrom und availableTo werden vom Model-Default gesetzt (jetzt + 30 Tage)
    const entryData = {
      title: String(title).trim(),
      entryType: entryType,
      category: String(category).trim(),
      zip: z,
      // availableFrom und availableTo NICHT setzen - Model-Defaults verwenden!
      createdBy: req.user.userId
    };

    // Nur die relevante Description hinzufügen
    if (entryType === 'offer') {
      entryData.offerDescription = String(offerDescription).trim();
    } else {
      entryData.requestDescription = String(requestDescription).trim();
    }

    const created = await Entry.create(entryData);

    res.status(201).json(created);
  } catch (err) {
    console.error('ENTRY CREATE ERROR:', err);
    res.status(400).json({ message: 'Eintrag konnte nicht gespeichert werden.' });
  }
});

// GET /entries/:id/matches
// Implementiert den 4-Stufen-Trichter Matching-Algorithmus:
// Stufe 1: Geographie (H3/PLZ) → Sind wir Nachbarn?
// Stufe 2: Typ (Gegenteil) → Suche trifft Biete?
// Stufe 3: Kategorie (Der Anker) → Gleiches Thema?
// Stufe 4: Volltext-Suche (Keywords) → Passt der Inhalt genau?
router.get('/:id/matches', requireAuth, async (req, res) => {
  try {
    const base = await Entry.findById(req.params.id);
    if (!base) {
      return res.status(404).json({ message: 'Eintrag nicht gefunden.' });
    }

    if (String(base.createdBy) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Nicht erlaubt: Nicht dein Eintrag.' });
    }

    // ========================================================================
    // 4-STUFEN-TRICHTER MATCHING
    // ========================================================================
    
    const baseCategory = (base.category || '').trim();
    const baseZip = (base.zip || '').trim();
    const baseType = base.entryType; // 'offer' oder 'request'
    
    // Das Gegenteil des eigenen Typs (Stufe 2)
    const oppositeType = baseType === 'offer' ? 'request' : 'offer';

    // Query Builder - Start mit Basis-Filter
    const query = {
      _id: { $ne: base._id },                    // Nicht sich selbst
      createdBy: { $ne: base.createdBy },        // Nicht eigene Einträge
      isBlocked: false                            // Nicht gesperrt
    };

    // ========================================================================
    // STUFE 1: GEOGRAPHIE (H3 oder PLZ-Fallback)
    // ========================================================================
    if (base.h3Index) {
      // Wenn H3 vorhanden: Suche in gleicher H3-Zelle + Nachbarn
      const neighbors = h3.gridDisk(base.h3Index, 1); // k=1 bedeutet direkte Nachbarn
      query.h3Index = { $in: neighbors };
    } else {
      // Fallback: PLZ-basiert (gleiche PLZ)
      query.zip = baseZip;
    }

    // ========================================================================
    // STUFE 2: TYP (Gegenteil) - Suche trifft Biete
    // ========================================================================
    // Wenn ich ein Angebot habe, suche ich Gesuche (und umgekehrt)
    query.entryType = oppositeType;

    // ========================================================================
    // STUFE 3: KATEGORIE (Der Anker) - Wichtigste Filter!
    // ========================================================================
    query.category = { $regex: `^${baseCategory}$`, $options: 'i' };

    // Zeitraum-Überlappung (optional, aber sinnvoll)
    query.availableFrom = { $lte: base.availableTo };
    query.availableTo = { $gte: base.availableFrom };

    console.log('🔍 Matching Query:', JSON.stringify(query, null, 2));

    // Basis-Matches finden
    let matches = await Entry.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    console.log(`✅ Stufe 1-3 abgeschlossen: ${matches.length} Matches gefunden`);

    // ========================================================================
    // STUFE 4: VOLLTEXT-SUCHE (Intelligentes Keyword-Ranking)
    // ========================================================================
    // WICHTIG: Stufe 1-3 sind HARTE Filter (müssen passen!)
    // Stufe 4 ist NUR für Ranking/Sortierung - KEIN zusätzlicher Filter!
    // 
    // Problem: Einfaches Keyword-Matching kann zu Missverständnissen führen
    // (z.B. "keine Hunde" würde mit "Hunde" matchen)
    // 
    // Lösung: Wir verwenden Stufe 4 NUR zum Sortieren, nicht zum Filtern.
    // Die Kategorie (Stufe 3) ist bereits der wichtigste Anker!
    
    if (matches.length > 0) {
      // Extrahiere relevante Keywords (mindestens 4 Zeichen, keine Stoppwörter)
      const stopWords = new Set(['und', 'oder', 'der', 'die', 'das', 'für', 'mit', 'bei', 'von', 'zum', 'zur', 'eine', 'einer', 'einen', 'einem', 'nicht', 'keine', 'kein']);
      
      const baseText = `${base.title} ${base.offerDescription || ''} ${base.requestDescription || ''}`.toLowerCase();
      const baseKeywords = baseText
        .split(/\s+/)
        .map(w => w.replace(/[.,!?;:()]/g, '')) // Entferne Satzzeichen
        .filter(w => w.length >= 4 && !stopWords.has(w)); // Min. 4 Zeichen, keine Stoppwörter
      
      matches = matches.map(m => {
        const matchText = `${m.title} ${m.offerDescription || ''} ${m.requestDescription || ''}`.toLowerCase();
        
        // Berechne Relevanz-Score basierend auf gemeinsamen Keywords
        let score = 0;
        let matchedKeywords = [];
        
        baseKeywords.forEach(keyword => {
          // Exakte Wort-Übereinstimmung (nicht nur Substring!)
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          if (regex.test(matchText)) {
            score++;
            matchedKeywords.push(keyword);
          }
        });
        
        // Bonus: Titel-Matches zählen doppelt (wichtiger als Beschreibung)
        const titleText = m.title.toLowerCase();
        baseKeywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          if (regex.test(titleText)) {
            score += 1; // Bonus-Punkt für Titel-Match
          }
        });
        
        return { 
          ...m.toObject(), 
          _matchScore: score,
          _matchedKeywords: matchedKeywords
        };
      });
      
      // Sortiere nach Score (höchster zuerst)
      // Bei gleichem Score: neuere Einträge zuerst
      matches.sort((a, b) => {
        if (b._matchScore !== a._matchScore) {
          return b._matchScore - a._matchScore;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      console.log(`✅ Stufe 4 abgeschlossen: ${matches.length} Matches nach Relevanz sortiert`);
      if (matches.length > 0) {
        console.log(`   Top Match: "${matches[0].title}" (Score: ${matches[0]._matchScore})`);
      }
    }

    res.json({ 
      baseEntryId: base._id, 
      count: matches.length, 
      matches,
      algorithm: '4-Stufen-Trichter (Geo → Typ → Kategorie → Keywords)'
    });
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
