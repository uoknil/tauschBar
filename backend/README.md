# tauschBar Backend

## 📋 Übersicht

Das Backend von tauschBar ist eine Node.js/Express REST API mit MongoDB als Datenbank. 
Es verwaltet Benutzer, Einträge, Nachrichten und bietet eine intelligente Matching-Funktion.

## 🏗️ Architektur

```
backend/
├── server.js              # Hauptserver-Datei (Entry Point)
├── db.js                  # Datenbankverbindung
├── package.json           # NPM Dependencies & Scripts
├── package-lock.json      # Exakte Versions-Lock
│
├── models/                # Mongoose Schemas (Datenmodelle)
│   ├── User.js           # Benutzer-Schema
│   ├── Entry.js          # Eintrag-Schema (Angebote/Gesuche)
│   ├── Message.js        # Chat-Nachrichten-Schema
│   └── Report.js         # Meldungen-Schema (Moderation)
│
├── routes/               # API-Endpunkte (Controller)
│   ├── auth.routes.js   # Authentifizierung (Login/Register)
│   ├── entry.routes.js  # Einträge CRUD + Matching
│   ├── message.routes.js # Chat-Funktionalität
│   └── report.routes.js  # Meldungen erstellen/verwalten
│
├── middleware/           # Express Middleware
│   └── auth.js          # JWT-Token Verifizierung
│
└── uploads/             # Hochgeladene Dateien
    └── profile-pictures/ # Profilbilder
```

---

## 📁 Datei-Erklärungen

### 🔧 Core Dateien

#### `server.js`
**Zweck**: Hauptserver-Datei - der Entry Point der Anwendung

**Was macht sie:**
- Initialisiert Express-App
- Verbindet sich mit MongoDB (via `db.js`)
- Lädt alle Routes ein
- Konfiguriert Middleware:
  - `cors()` - Cross-Origin Resource Sharing (für Frontend)
  - `express.json()` - JSON Body Parser
  - `express.static()` - Statische Dateien (Frontend, Uploads)
- Startet Server auf Port 3000

**Wichtige Konfigurationen:**
```javascript
app.use(cors());                          // Erlaubt Frontend-Zugriff
app.use(express.json());                  // Parsed JSON-Requests
app.use('/frontend', express.static(...)) // Serviert Frontend
app.use('/uploads', express.static(...))  // Serviert Uploads
```

**Routes:**
- `/auth` → `auth.routes.js`
- `/entries` → `entry.routes.js`
- `/messages` → `message.routes.js`
- `/reports` → `report.routes.js`

---

#### `db.js`
**Zweck**: MongoDB Datenbankverbindung

**Was macht sie:**
- Verbindet mit MongoDB Atlas (Cloud) oder lokalem MongoDB
- Verwendet Environment-Variable `MONGO_URI`
- Error-Handling bei Verbindungsproblemen
- Exportiert `connectDB()` Funktion

**Umgebungsvariable:**
```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/tauschbar
```

---

#### `package.json`
**Zweck**: NPM Projekt-Konfiguration

**Dependencies:**
- `express` - Web-Framework
- `mongoose` - MongoDB ODM (Object Data Modeling)
- `bcryptjs` - Passwort-Hashing
- `jsonwebtoken` - JWT-Token Generierung/Verifizierung
- `cors` - Cross-Origin Resource Sharing
- `multer` - File Upload Handling
- `dotenv` - Environment Variables

**Scripts:**
```bash
npm start        # Startet Server (production)
npm run dev      # Startet mit nodemon (development)
```

---

### 📊 Models (Datenmodelle)

#### `models/User.js`
**Zweck**: Benutzer-Schema

**Felder:**
- `username` (String, unique, required) - Benutzername
- `email` (String, unique, required) - E-Mail
- `passwordHash` (String, required) - Gehashtes Passwort (bcrypt)
- `profilePicture` (String) - Pfad zum Profilbild
- `role` (String) - Rolle: 'user', 'moderator', 'admin'
- `createdAt` (Date) - Registrierungsdatum
- `isBanned` (Boolean) - Gesperrt?
- `bio` (String) - Profilbeschreibung

**Methoden:**
- `comparePassword(candidatePassword)` - Passwort-Vergleich

**Verwendung:**
```javascript
const user = new User({ username, email, passwordHash });
await user.save();
```

---

#### `models/Entry.js`
**Zweck**: Eintrag-Schema (Angebote & Gesuche)

**Felder:**
- `title` (String, required) - Titel des Eintrags
- `entryType` (String, enum: ['offer', 'request']) - Typ
- `category` (String, required) - Kategorie
- `offerDescription` (String) - Beschreibung für Angebote
- `requestDescription` (String) - Beschreibung für Gesuche
- `zip` (String, required) - Postleitzahl
- `h3Index` (String) - H3 Geo-Index (für geografisches Matching)
- `availableFrom` (Date) - Verfügbar ab
- `availableTo` (Date) - Verfügbar bis (Default: +30 Tage)
- `createdBy` (ObjectId → User) - Ersteller (Reference)
- `createdAt` (Date) - Erstellungsdatum
- `isBlocked` (Boolean) - Gesperrt? (Moderation)

**Indexes:**
- `category` - Schnelle Kategorie-Suche
- `zip` - Schnelle PLZ-Suche
- `h3Index` - Geografisches Matching

**Besonderheiten:**
- `availableTo` hat intelligent Default: `Date.now() + 30 Tage`
- Verwendet für Matching-Algorithmus

---

#### `models/Message.js`
**Zweck**: Chat-Nachrichten-Schema

**Felder:**
- `sender` (ObjectId → User) - Absender
- `receiver` (ObjectId → User) - Empfänger
- `entryId` (ObjectId → Entry) - Bezug zum Eintrag
- `content` (String, required) - Nachrichteninhalt
- `timestamp` (Date) - Sendezeitpunkt
- `isRead` (Boolean) - Gelesen?

**Indexes:**
- `{ sender: 1, receiver: 1 }` - Konversationen finden
- `{ timestamp: -1 }` - Chronologische Sortierung

---

#### `models/Report.js`
**Zweck**: Meldungen-Schema (Moderation)

**Felder:**
- `reportedEntry` (ObjectId → Entry) - Gemeldeter Eintrag
- `reportedBy` (ObjectId → User) - Melder
- `reason` (String, required) - Grund der Meldung
- `status` (String, enum: ['pending', 'reviewed', 'resolved']) - Status
- `createdAt` (Date) - Meldungsdatum
- `reviewedBy` (ObjectId → User) - Moderator
- `reviewNote` (String) - Notiz des Moderators

**Status-Flow:**
1. `pending` - Neu eingegangen
2. `reviewed` - In Bearbeitung
3. `resolved` - Abgeschlossen

---

### 🛣️ Routes (API-Endpunkte)

#### `routes/auth.routes.js`
**Zweck**: Authentifizierungs-Endpunkte

**Endpunkte:**

**POST /auth/register**
- Registriert neuen Benutzer
- Validiert: Username, Email, Passwort
- Hasht Passwort mit bcrypt
- Generiert JWT-Token
- Response: `{ token, userId, username }`

**POST /auth/login**
- Login mit Username/Email + Passwort
- Vergleicht Passwort mit Hash
- Generiert JWT-Token
- Response: `{ token, userId, username }`

**GET /auth/me** (protected)
- Gibt aktuellen User zurück
- Benötigt: JWT-Token in Header
- Response: User-Objekt (ohne passwordHash)

**Sicherheit:**
- Passwörter werden NIEMALS im Klartext gespeichert
- JWT-Token mit Secret signiert
- Token-Expiration: 7 Tage

---

#### `routes/entry.routes.js`
**Zweck**: Einträge-CRUD + Matching-Algorithmus

**Endpunkte:**

**GET /entries**
- Listet alle Einträge (öffentlich)
- Query-Parameter:
  - `?q=...` - Volltextsuche
  - `?category=...` - Kategorie-Filter
  - `?zip=...` - PLZ-Filter
  - `?type=...` - Typ-Filter (offer/request)
  - `?onlyMine=true` - Nur eigene Einträge (benötigt Auth)
- Response: Array von Einträgen

**GET /entries/:id**
- Gibt einzelnen Eintrag zurück
- Response: Entry-Objekt mit populated `createdBy`

**POST /entries** (protected)
- Erstellt neuen Eintrag
- Benötigt: JWT-Token
- Validierung: title, entryType, category, zip
- Response: Erstellter Eintrag

**PUT /entries/:id** (protected)
- Aktualisiert Eintrag
- Nur Besitzer kann bearbeiten
- Response: Aktualisierter Eintrag

**DELETE /entries/:id** (protected)
- Löscht Eintrag
- Nur Besitzer oder Moderator kann löschen
- Response: Success-Message

**GET /entries/:id/matches** (protected)
- **KERNFUNKTION**: Intelligentes Matching
- Findet passende Einträge für einen Eintrag
- Algorithmus: 4-Stufen-Trichter
- Response: `{ count, matches, algorithm }`

**Matching-Algorithmus:**

```
STUFE 1: Geographie (PLZ oder H3-Index)
  → Sind wir Nachbarn?

STUFE 2: Typ (Gegenteil)
  → offer sucht request, request sucht offer

STUFE 3: Kategorie (Der Anker!)
  → Gleiches Thema? (WICHTIGSTE STUFE)

STUFE 4: Volltext-Suche (Keywords)
  → Passt der Inhalt genau? (NUR RANKING)
```

**Stufe 4 Details:**
- Word Boundaries (`\b`) - nur ganze Wörter
- Stoppwörter gefiltert (keine, nicht, kein, etc.)
- Mindestlänge 4 Zeichen
- Titel-Matches zählen doppelt
- Sortierung nach Score

---

#### `routes/message.routes.js`
**Zweck**: Chat-Funktionalität

**Endpunkte:**

**GET /messages** (protected)
- Listet alle Konversationen des Users
- Response: Gruppiert nach Gesprächspartner

**GET /messages/:partnerId** (protected)
- Lädt Nachrichten mit spezifischem Partner
- Sortiert chronologisch
- Markiert als gelesen
- Response: Array von Messages

**POST /messages** (protected)
- Sendet neue Nachricht
- Body: `{ receiver, entryId, content }`
- Response: Gesendete Message

**PUT /messages/:id/read** (protected)
- Markiert Nachricht als gelesen
- Response: Success-Message

---

#### `routes/report.routes.js`
**Zweck**: Meldungen (Moderation)

**Endpunkte:**

**POST /reports** (protected)
- Meldet Eintrag
- Body: `{ entryId, reason }`
- Response: Report-Objekt

**GET /reports** (moderator/admin only)
- Listet alle Meldungen
- Filter: `?status=pending`
- Response: Array von Reports

**PUT /reports/:id** (moderator/admin only)
- Aktualisiert Meldungs-Status
- Body: `{ status, reviewNote }`
- Response: Aktualisierter Report

---

### 🔐 Middleware

#### `middleware/auth.js`
**Zweck**: JWT-Token Verifizierung

**Funktion: `authenticateToken`**

**Was macht sie:**
1. Extrahiert JWT-Token aus Header: `Authorization: Bearer <token>`
2. Verifiziert Token mit JWT_SECRET
3. Decoded User-ID und fügt zu `req.user` hinzu
4. Bei ungültigem Token: 401 Unauthorized

**Verwendung:**
```javascript
router.get('/protected', authenticateToken, (req, res) => {
  // req.user.userId ist verfügbar
});
```

**Funktion: `requireRole`**

**Was macht sie:**
- Prüft ob User bestimmte Rolle hat
- Verwendung: `requireRole('moderator')`
- Bei fehlender Rolle: 403 Forbidden

---

## 🚀 Installation & Start

### Voraussetzungen
- Node.js (v14+)
- MongoDB (lokal oder Atlas)
- npm oder yarn

### Installation

```bash
# Dependencies installieren
cd backend
npm install

# Environment-Variablen setzen
# Erstelle .env Datei:
echo "MONGO_URI=mongodb://127.0.0.1:27017/tauschbar" > .env
echo "JWT_SECRET=dein-geheimer-schlüssel-hier" >> .env
echo "PORT=3000" >> .env
```

### Starten

```bash
# Production
npm start

# Development (mit Auto-Reload)
npm run dev
```

Server läuft auf: `http://localhost:3000`

---

## 🔌 API-Dokumentation

### Base URL
```
http://localhost:3000
```

### Authentifizierung

Für geschützte Endpunkte:
```
Authorization: Bearer <jwt-token>
```

### Beispiel-Requests

**Registrieren:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

**Einträge laden:**
```bash
curl http://localhost:3000/entries?category=Bildung%20%26%20Nachhilfe
```

**Matches finden:**
```bash
curl http://localhost:3000/entries/ENTRY_ID/matches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🗄️ Datenbank

### MongoDB Collections

- `users` - Benutzer
- `entries` - Einträge (Angebote/Gesuche)
- `messages` - Chat-Nachrichten
- `reports` - Meldungen

### Indexes

**Optimierte Abfragen für:**
- Kategorie-Suche
- PLZ-Filter
- Geografisches Matching (H3)
- Chat-Konversationen
- Chronologische Sortierung

---

## 🔧 Konfiguration

### Environment-Variablen (.env)

```env
# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/tauschbar

# JWT
JWT_SECRET=dein-sehr-geheimer-schlüssel-mindestens-32-zeichen

# Server
PORT=3000
NODE_ENV=production
```

---

## 🛡️ Sicherheit

### Implementierte Maßnahmen

✅ **Passwort-Hashing** (bcrypt, 10 Rounds)
✅ **JWT-Token** (7 Tage Expiration)
✅ **CORS** (Konfigurierbar)
✅ **Input-Validierung** (Required-Felder)
✅ **Rollen-System** (user, moderator, admin)
✅ **Protected Routes** (JWT-Middleware)

### Best Practices

- Passwörter NIEMALS im Klartext speichern
- JWT_SECRET in Environment-Variable
- HTTPS in Production (nicht HTTP!)
- Rate-Limiting implementieren (TODO)
- Input-Sanitization erweitern (TODO)

---

## 📈 Performance

### Optimierungen

- **MongoDB Indexes** auf häufig abgefragte Felder
- **Lean Queries** wo möglich (`.lean()`)
- **Pagination** für große Datenmengen (TODO)
- **Caching** mit Redis (TODO)

---

## 🐛 Debugging

### Logs aktivieren

```javascript
// In server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### MongoDB Queries debuggen

```javascript
mongoose.set('debug', true);
```

---

## 📝 TODO / Roadmap

- [ ] Rate-Limiting (express-rate-limit)
- [ ] Pagination für /entries
- [ ] WebSocket für Real-Time Chat
- [ ] Redis Caching
- [ ] Tests (Jest/Mocha)
- [ ] API-Dokumentation (Swagger)
- [ ] Email-Verifizierung
- [ ] Passwort-Reset
- [ ] 2FA (Two-Factor Authentication)

---

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle Feature-Branch: `git checkout -b feature/neue-funktion`
3. Commit: `git commit -m 'Füge neue Funktion hinzu'`
4. Push: `git push origin feature/neue-funktion`
5. Erstelle Pull Request

---

## 📄 Lizenz

MIT License - siehe LICENSE Datei

---

## 💡 Support

Bei Fragen oder Problemen:
- GitHub Issues öffnen
- Email: support@tauschbar.example
- Dokumentation lesen

---

**Version:** 1.0.0  
**Letztes Update:** Januar 2026
