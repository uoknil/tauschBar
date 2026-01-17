const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Message = require('../models/Message');
const Entry = require('../models/Entry');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// ============================================================
// 1) Konversation starten / Nachricht senden
// POST /messages
// Body: { entryId, receiverId, content }
// ============================================================
router.post('/', requireAuth, async (req, res) => {
  try {
    const { entryId, receiverId, content } = req.body;
    const senderId = req.user.userId;

    // Validierung
    if (!entryId || !receiverId || !content) {
      return res.status(400).json({ message: 'entryId, receiverId und content sind erforderlich.' });
    }

    if (!mongoose.isValidObjectId(entryId) || !mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: 'Ungültige entryId oder receiverId.' });
    }

    const trimmedContent = String(content).trim();
    if (!trimmedContent || trimmedContent.length > 2000) {
      return res.status(400).json({ message: 'Nachricht leer oder zu lang (max. 2000 Zeichen).' });
    }

    // Entry existiert?
    const entry = await Entry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry nicht gefunden.' });
    }

    // Receiver existiert?
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Empfänger nicht gefunden.' });
    }

    // Nicht an sich selbst senden
    if (String(senderId) === String(receiverId)) {
      return res.status(400).json({ message: 'Du kannst dir nicht selbst schreiben.' });
    }

    // Konversations-Key erstellen
    const conversationKey = Message.createConversationKey(senderId, receiverId, entryId);

    // Nachricht speichern
    const message = await Message.create({
      conversationKey,
      entryId,
      sender: senderId,
      receiver: receiverId,
      content: trimmedContent
    });

    // Populieren für Response
    const populated = await Message.findById(message._id)
      .populate('sender', 'username')
      .populate('receiver', 'username');

    res.status(201).json(populated);
  } catch (err) {
    console.error('MESSAGE POST ERROR:', err);
    res.status(500).json({ message: 'Nachricht konnte nicht gesendet werden.', error: err.message });
  }
});

// ============================================================
// 2) Alle Konversationen des Users abrufen
// GET /messages/conversations
// ============================================================
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Alle Nachrichten finden, an denen User beteiligt ist
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .populate('entryId', 'title category')
      .sort({ createdAt: -1 });

    // Gruppieren nach conversationKey
    const conversationsMap = new Map();

    for (const msg of messages) {
      const key = msg.conversationKey;

      if (!conversationsMap.has(key)) {
        // Partner ermitteln (der andere User)
        const partner = String(msg.sender._id) === String(userId)
          ? msg.receiver
          : msg.sender;

        // Ungelesene Nachrichten zählen (nur die, die AN mich gingen und ungelesen sind)
        const unreadCount = await Message.countDocuments({
          conversationKey: key,
          receiver: userId,
          isRead: false
        });

        conversationsMap.set(key, {
          conversationKey: key,
          partner: {
            _id: partner._id,
            username: partner.username
          },
          entry: msg.entryId ? {
            _id: msg.entryId._id,
            title: msg.entryId.title,
            category: msg.entryId.category
          } : null,
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.sender._id
          },
          unreadCount
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (err) {
    console.error('CONVERSATIONS GET ERROR:', err);
    res.status(500).json({ message: 'Konversationen konnten nicht geladen werden.', error: err.message });
  }
});

// ============================================================
// 3) Nachrichten einer Konversation abrufen
// GET /messages/conversation/:visavisId/:entryId
// ============================================================
router.get('/conversation/:visavisId/:entryId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { visavisId, entryId } = req.params;

    if (!mongoose.isValidObjectId(visavisId) || !mongoose.isValidObjectId(entryId)) {
      return res.status(400).json({ message: 'Ungültige visavisId oder entryId.' });
    }

    const conversationKey = Message.createConversationKey(userId, visavisId, entryId);

    const messages = await Message.find({ conversationKey })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ createdAt: 1 }); // Älteste zuerst

    // Als gelesen markieren (Nachrichten, die AN mich gingen)
    await Message.updateMany(
      { conversationKey, receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error('CONVERSATION GET ERROR:', err);
    res.status(500).json({ message: 'Nachrichten konnten nicht geladen werden.', error: err.message });
  }
});

// ============================================================
// 4) Ungelesene Nachrichten zählen
// GET /messages/unread-count
// ============================================================
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const count = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('UNREAD COUNT ERROR:', err);
    res.status(500).json({ message: 'Fehler beim Zählen.', error: err.message });
  }
});

// ============================================================
// 5) Chat von Entry aus starten (Info über Entry-Owner holen)
// GET /messages/entry-info/:entryId
// ============================================================
router.get('/entry-info/:entryId', requireAuth, async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!mongoose.isValidObjectId(entryId)) {
      return res.status(400).json({ message: 'Ungültige entryId.' });
    }

    const entry = await Entry.findById(entryId)
      .populate('createdBy', 'username');

    if (!entry) {
      return res.status(404).json({ message: 'Entry nicht gefunden.' });
    }

    res.json({
      entryId: entry._id,
      title: entry.title,
      category: entry.category,
      owner: {
        _id: entry.createdBy._id,
        username: entry.createdBy.username
      }
    });
  } catch (err) {
    console.error('ENTRY INFO ERROR:', err);
    res.status(500).json({ message: 'Entry-Info konnte nicht geladen werden.', error: err.message });
  }
});

module.exports = router;
