# tauschBar Frontend

## 📋 Übersicht

Das Frontend von tauschBar ist eine moderne Single-Page-Application (SPA) mit Vanilla JavaScript, CSS3 und HTML5. Es bietet eine intuitive Benutzeroberfläche für Tauschgeschäfte mit intelligentem Matching.

## 🏗️ Architektur

```
frontend/
├── index.html              # Landing Page (Entry Point)
│
├── pages/                  # 📁 Alle App-Seiten
│   ├── login.html          # Login-Seite
│   ├── register.html       # Registrierung
│   ├── dashboard.html      # Hauptseite (Einträge + Matches)
│   ├── create-entry.html   # Eintrag erstellen
│   ├── chat.html           # Chat-System
│   ├── profile.html        # Benutzerprofil
│   └── moderation.html     # Moderations-Dashboard
│
├── css/                    # 🎨 Stylesheets
│   ├── main.css            # Haupt-Styles (App + Auth)
│   └── landing.css         # Landing Page Styles
│
├── js/                     # 📜 JavaScript-Module
│   └── categories.js       # Kategorien-Definitionen
│
├── assets/                 # 🖼️ Media-Dateien
│   └── images/             # Bilder & Icons
│
└── README.md              # Diese Datei
```

---

## 📄 Datei-Erklärungen

### 🌐 HTML-Seiten

#### `index.html`
**Zweck**: Landing Page - Erste Seite die Besucher sehen

**Funktionen:**
- ✅ Hero-Section mit Suchfeld
- ✅ Kategorien-Übersicht (dynamisch geladen)
- ✅ Statistiken (animierte Counter)
- ✅ Call-to-Action Buttons
- ✅ **Dynamische Navigation** (eingeloggt/ausgeloggt)

**Navigation-Logik:**
```javascript
// Nicht eingeloggt:
[Registriere dich] [Einloggen]

// Eingeloggt:
[Hallo, username] [Dashboard] [Profil] [Logout]
```

**Suchfeld:**
- Eingabe + Enter → `pages/dashboard.html?q=...`
- Funktioniert ohne Login (öffentliche Suche)

**Kategorie-Klicks:**
- Klick auf Kategorie → `pages/dashboard.html?category=...`
- Filtert Einträge nach Kategorie

**JavaScript-Funktionen:**
- `updateNavigation()` - Prüft Login-Status, passt Navigation an
- `initLandingSearch()` - Suchfeld-Funktionalität
- `loadCategories()` - Lädt Kategorien aus `categories.js`
- `animateCounters()` - Animiert Statistik-Zahlen
- `initScrollAnimations()` - Scroll-Animationen

**CSS-Dateien:**
- `css/main.css` - Basis-Styles
- `css/landing.css` - Landing-spezifische Styles

---

#### `pages/login.html`
**Zweck**: Login-Formular

**Funktionen:**
- Email/Username + Passwort Login
- JWT-Token wird in `localStorage` gespeichert
- **Return-URL Support** (für Kontakt-Redirect)
- Fehlerbehandlung & Validierung
- Link zu Registrierung

**Login-Flow:**
1. User gibt Credentials ein
2. POST Request zu `/auth/login`
3. Bei Erfolg: Token + Username in `localStorage`
4. Prüft ob `returnUrl` in `localStorage` vorhanden
5. Redirect zu `returnUrl` ODER `dashboard.html`

**Return-URL Feature:**
```javascript
// Gespeichert bei Kontakt-Klick ohne Login
localStorage.setItem('returnUrl', './chat.html?entry=...&partner=...');

// Nach Login: Automatische Weiterleitung
const returnUrl = localStorage.getItem('returnUrl');
if (returnUrl) {
  localStorage.removeItem('returnUrl');
  window.location.href = returnUrl;
}
```

**API-Endpoint:**
```javascript
POST /auth/login
Body: { usernameOrEmail, password }
Response: { token, userId, username }
```

---

#### `pages/register.html`
**Zweck**: Registrierungs-Formular

**Funktionen:**
- Username, Email, Passwort Eingabe
- Passwort-Bestätigung
- Client-Side Validierung
- Automatischer Login nach Registrierung
- Link zu Login

**Validierung:**
- Username: Min. 3 Zeichen
- Email: Gültige Email-Adresse
- Passwort: Min. 6 Zeichen
- Passwort-Match prüfen

**Register-Flow:**
1. Validiere Eingaben
2. POST Request zu `/auth/register`
3. Bei Erfolg: Token automatisch gespeichert
4. Redirect zu `dashboard.html`

**API-Endpoint:**
```javascript
POST /auth/register
Body: { username, email, password }
Response: { token, userId, username }
```

---

#### `pages/dashboard.html`
**Zweck**: Hauptseite - Einträge anzeigen & filtern

**Funktionen:**
- ✅ Einträge auflisten (alle oder nur eigene)
- ✅ Suche & Filter (Kategorie, PLZ, Typ)
- ✅ **URL-Parameter Support** (Deep-Linking)
- ✅ Matches anzeigen (nur für eingeloggte User)
- ✅ Dynamische Navigation (Gäste vs. Eingeloggt)
- ✅ Kontakt-Button mit Login-Check
- ✅ Eintrag löschen (nur eigene)

**URL-Parameter:**
```
?q=Mathe                           # Suche nach "Mathe"
?category=Bildung & Nachhilfe      # Filter nach Kategorie
?zip=1010                          # Filter nach PLZ
?q=Nachhilfe&category=Bildung      # Kombinierte Filter
```

**Filter-Timing:**
```javascript
// 1. loadCategoryOptions() - Kategorien laden
// 2. URL-Parameter auslesen und setzen (50ms delay)
// 3. loadEntries() aufrufen (100ms delay)
// → Alle Filter sind gesetzt bevor Einträge geladen werden
```

**Tabs:**
- **Nur von yukalila** - Zeigt nur eigene Einträge
- **Einträge von anderen** - Zeigt andere Einträge
- **Matches** - Zeigt nur Matches (benötigt Login)

**Kontakt-Button Logik:**
```javascript
if (!token) {
  // Nicht eingeloggt
  localStorage.setItem('returnUrl', `./chat.html?entry=${entryId}&partner=${ownerId}`);
  alert('Bitte melde dich an...');
  window.location.href = './login.html';
} else {
  // Eingeloggt - direkt zum Chat
  window.location.href = `./chat.html?entry=${entryId}&partner=${ownerId}`;
}
```

**Navigation für Gäste:**
```javascript
// Versteckt:
- "Nur meine Einträge" Button
- "Matches" Tab
- "+ Eintrag erstellen"
- Chat, Profil

// Zeigt:
- [Login] [Registrieren] Buttons
```

**API-Endpoints:**
```javascript
GET /entries?q=...&category=...&zip=...  # Einträge laden
GET /entries/:id/matches                  # Matches abrufen
DELETE /entries/:id                       # Eintrag löschen
```

**JavaScript-Funktionen:**
- `loadEntries()` - Lädt und filtert Einträge
- `loadMatchesInMainList()` - Lädt Matches
- `refreshMatchBadge()` - Update Match-Counter
- `handleDelete()` - Löscht Eintrag

---

#### `pages/create-entry.html`
**Zweck**: Neuen Eintrag erstellen

**Funktionen:**
- Formular für Angebot ODER Gesuch
- Dynamische Felder (je nach Typ)
- Kategorie-Dropdown (aus `categories.js`)
- PLZ-Eingabe
- Zeitraum wählen (Optional)
- Validierung

**Felder:**
- **Titel** (required)
- **Typ** (offer/request, required)
- **Kategorie** (Dropdown, required)
- **Beschreibung** (Textarea, required)
- **PLZ** (String, required)
- **Verfügbar von/bis** (Dates, optional)

**Dynamische Felder:**
```javascript
// Bei Typ "offer":
<textarea name="offerDescription">

// Bei Typ "request":
<textarea name="requestDescription">
```

**Create-Flow:**
1. User füllt Formular aus
2. Client-Side Validierung
3. POST Request zu `/entries`
4. Bei Erfolg: Redirect zu `dashboard.html`

**API-Endpoint:**
```javascript
POST /entries
Headers: { Authorization: Bearer <token> }
Body: { title, entryType, category, ...Description, zip }
Response: Erstellter Entry
```

---

#### `pages/chat.html`
**Zweck**: Chat-System zwischen Usern

**Funktionen:**
- Konversations-Liste (Sidebar)
- Nachrichten-Anzeige (Chronologisch)
- Neue Nachricht senden
- Echtzeit-Updates (Polling)
- Entry-Kontext (welcher Eintrag wird diskutiert)

**URL-Parameter:**
```
?entry=ENTRY_ID&partner=USER_ID
```

**Chat-Flow:**
1. URL-Parameter auslesen
2. Konversation laden (`GET /messages/:partnerId`)
3. Nachrichten anzeigen
4. Polling: Neue Nachrichten alle 3 Sekunden
5. Senden: POST zu `/messages`

**Nachrichten-Struktur:**
```javascript
{
  sender: userId,
  receiver: partnerId,
  entryId: entryId,
  content: "Nachrichtentext",
  timestamp: Date,
  isRead: false
}
```

**Features:**
- Auto-Scroll zu neuester Nachricht
- Gelesen-Status
- Entry-Info Sidebar
- Real-Time Updates

**API-Endpoints:**
```javascript
GET /messages                     # Alle Konversationen
GET /messages/:partnerId          # Nachrichten mit Partner
POST /messages                    # Neue Nachricht senden
PUT /messages/:id/read            # Als gelesen markieren
```

---

#### `pages/profile.html`
**Zweck**: Benutzerprofil bearbeiten

**Funktionen:**
- Profilbild hochladen
- Bio bearbeiten
- Email ändern
- Passwort ändern
- Account löschen

**Profilbild-Upload:**
```javascript
<input type="file" accept="image/*">
// Upload zu /users/:id/profile-picture
// Multipart/form-data mit multer
```

**API-Endpoints:**
```javascript
GET /users/:id                          # Profil laden
PUT /users/:id                          # Profil aktualisieren
POST /users/:id/profile-picture         # Bild hochladen
PUT /users/:id/password                 # Passwort ändern
DELETE /users/:id                       # Account löschen
```

---

#### `pages/moderation.html`
**Zweck**: Moderations-Dashboard (nur Moderatoren/Admins)

**Funktionen:**
- Alle Meldungen anzeigen
- Nach Status filtern (pending/reviewed/resolved)
- Meldungen bearbeiten
- Einträge sperren/entsperren
- User bannen

**Meldungs-Status:**
- `pending` - Neu, unbearbeitet
- `reviewed` - In Bearbeitung
- `resolved` - Abgeschlossen

**Rollen-Check:**
```javascript
if (userRole !== 'moderator' && userRole !== 'admin') {
  window.location.href = './dashboard.html';
}
```

**API-Endpoints:**
```javascript
GET /reports?status=pending         # Meldungen abrufen
PUT /reports/:id                    # Status aktualisieren
PUT /entries/:id/block              # Eintrag sperren
PUT /users/:id/ban                  # User bannen
```

---

### 🎨 CSS-Dateien

#### `css/main.css`
**Zweck**: Haupt-Stylesheet für alle App-Seiten

**Bereiche:**
- **Reset & Base** - Basis-Styles, Variablen
- **Navigation** - App-Nav, Brand, Links
- **Forms** - Input, Textarea, Select, Button
- **Cards** - Entry-Cards, User-Cards
- **Modals** - Auth-Modals (kombiniert)
- **Layout** - Grid, Flexbox, Container
- **Utilities** - Helper-Klassen

**CSS-Variablen:**
```css
:root {
  --primary-color: #4A90E2;
  --secondary-color: #50C878;
  --danger-color: #E74C3C;
  --background: #F5F7FA;
  --text-color: #2C3E50;
  --border-radius: 12px;
  --box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

**Responsive:**
```css
@media (max-width: 768px) {
  /* Mobile Styles */
}

@media (max-width: 480px) {
  /* Small Mobile */
}
```

**Komponenten:**
- `.btn` - Buttons (primary, secondary, danger)
- `.card` - Karten-Layout
- `.form-group` - Formular-Gruppen
- `.alert` - Benachrichtigungen
- `.badge` - Badges (z.B. Match-Counter)

---

#### `css/landing.css`
**Zweck**: Styles für Landing Page (index.html)

**Bereiche:**
- **Hero-Section** - Großer Header mit Suchfeld
- **Categories-Grid** - Kategorie-Karten
- **Stats-Section** - Animierte Statistiken
- **Features** - Feature-Liste
- **CTA** - Call-to-Action Sections

**Animationen:**
```css
.counter {
  animation: countUp 2s ease-out;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}
```

**Grid-Layout:**
```css
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}
```

---

### 📜 JavaScript-Module

#### `js/categories.js`
**Zweck**: Kategorien-Definitionen (zentrale Datei)

**Struktur:**
```javascript
window.CATEGORIES = [
  {
    name: 'Bildung & Nachhilfe',
    icon: '📚',
    description: 'Wissen teilen, gemeinsam lernen'
  },
  {
    name: 'Haushalt & Alltag',
    icon: '🏠',
    description: 'Nachbarschaftshilfe für den Alltag'
  },
  // ... weitere Kategorien
];
```

**Verwendung:**
```javascript
// In HTML laden:
<script src="./js/categories.js"></script>

// Im Code verwenden:
const categorySelect = document.getElementById('category');
window.CATEGORIES.forEach(cat => {
  const option = document.createElement('option');
  option.value = cat.name;
  option.textContent = `${cat.icon} ${cat.name}`;
  categorySelect.appendChild(option);
});
```

**Kategorien:**
1. 📚 Bildung & Nachhilfe
2. 🏠 Haushalt & Alltag
3. 🔧 Handwerk & Reparaturen
4. 🎨 Kreatives & Hobbys
5. 💼 Beruf & Karriere
6. 🚗 Mobilität & Transport
7. 👶 Familie & Kinder
8. 🌱 Garten & Natur
9. 💻 Digital & Technik
10. 🎯 Sonstiges

---

## 🔄 User-Flows

### Flow 1: Registrierung & Erster Eintrag

```
1. Besuche index.html
2. Klicke [Registriere dich]
3. Fülle Formular aus → register.html
4. Erfolg → Auto-Redirect zu dashboard.html
5. Klicke [+ Eintrag erstellen]
6. Erstelle Angebot/Gesuch → create-entry.html
7. Erfolg → Zurück zu dashboard.html
8. Sehe eigenen Eintrag + potenzielle Matches
```

### Flow 2: Suche ohne Login

```
1. Besuche index.html
2. Gib "Mathe" ins Suchfeld ein
3. Enter → dashboard.html?q=Mathe
4. Sehe gefilterte Einträge (öffentlich)
5. Navigation zeigt [Login] [Registrieren]
6. Klicke auf Eintrag → Details sichtbar
7. Klicke [💬 Kontakt] → Alert + Redirect zu login.html
8. Nach Login → Automatisch zum Chat weitergeleitet
```

### Flow 3: Kategorie-Filter

```
1. Besuche index.html
2. Klicke auf "Bildung & Nachhilfe" Karte
3. → dashboard.html?category=Bildung & Nachhilfe
4. Sehe nur Einträge dieser Kategorie
5. Kategorie-Dropdown zeigt "Bildung & Nachhilfe"
6. Weitere Filter kombinierbar
```

### Flow 4: Matching & Chat

```
1. Eingeloggt auf dashboard.html
2. Klicke Tab [Matches]
3. Sehe passende Einträge (4-Stufen-Matching)
4. Klicke [💬 Kontakt] bei Match
5. → chat.html?entry=...&partner=...
6. Sende Nachricht
7. Echtzeit-Updates alle 3 Sekunden
8. Partner antwortet → Nachricht erscheint
```

---

## 🎯 Features & Besonderheiten

### Dynamische Navigation

**Problem**: Navigation soll sich je nach Login-Status ändern

**Lösung**:
```javascript
function updateNavigation() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  
  if (token && username) {
    // Eingeloggt: Zeige Dashboard, Profil, Logout
  } else {
    // Nicht eingeloggt: Zeige Login, Registrieren
  }
}
```

**Implementiert in**:
- `index.html` - Landing Page Navigation
- `dashboard.html` - Dashboard Navigation

---

### URL-Parameter & Deep-Linking

**Problem**: User soll direkt zu gefilterten Einträgen kommen

**Lösung**:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get('q');
const categoryParam = urlParams.get('category');

// Setze Filter-Felder
searchInput.value = searchParam || '';
categorySelect.value = categoryParam || '';

// Warte kurz, dann lade Einträge
setTimeout(() => loadEntries(), 100);
```

**URLs**:
- `?q=Mathe` - Suche nach "Mathe"
- `?category=Bildung` - Filter nach Kategorie
- `?q=Nachhilfe&category=Bildung` - Kombiniert

---

### Return-URL nach Login

**Problem**: User klickt "Kontakt" ohne Login → soll nach Login direkt zum Chat

**Lösung**:
```javascript
// Bei Kontakt-Klick (nicht eingeloggt):
localStorage.setItem('returnUrl', './chat.html?entry=...&partner=...');
window.location.href = './login.html';

// Nach erfolgreichem Login:
const returnUrl = localStorage.getItem('returnUrl');
if (returnUrl) {
  localStorage.removeItem('returnUrl');
  window.location.href = returnUrl;
}
```

---

### Matches nur für eingeloggte User

**Problem**: Matches sollten nicht öffentlich sein

**Lösung**:
```javascript
if (!token) {
  // Verstecke Matches-Button
  document.getElementById('showMatchesBtn').style.display = 'none';
}
```

---

## 🚀 Installation & Start

### Voraussetzungen
- Node.js Backend läuft auf Port 3000
- Moderner Browser (Chrome, Firefox, Safari, Edge)

### Starten

```bash
# Backend starten (in anderem Terminal)
cd backend
npm start

# Frontend öffnen
# Option 1: Über Backend (empfohlen)
http://localhost:3000/frontend/index.html

# Option 2: Direkt im Browser (wenn Backend läuft)
open frontend/index.html
```

---

## 🔌 API-Integration

### localStorage

**Gespeicherte Daten:**
```javascript
localStorage.setItem('token', jwt_token);        // JWT-Token
localStorage.setItem('username', username);       // Benutzername
localStorage.setItem('returnUrl', url);          // Return-URL (temporär)
```

### API-Requests

**Beispiel: Einträge laden**
```javascript
const response = await fetch('http://localhost:3000/entries?q=Mathe');
const entries = await response.json();
```

**Beispiel: Geschützter Endpoint**
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:3000/entries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(entryData)
});
```

---

## 🎨 Styling-Richtlinien

### Farben

```css
Primary:    #4A90E2  (Blau)
Secondary:  #50C878  (Grün)
Danger:     #E74C3C  (Rot)
Warning:    #F39C12  (Orange)
Background: #F5F7FA  (Hellgrau)
Text:       #2C3E50  (Dunkelgrau)
```

### Spacing

```css
Small:  8px
Medium: 16px
Large:  24px
XLarge: 32px
```

### Typography

```css
Heading 1: 32px, bold
Heading 2: 24px, semibold
Heading 3: 20px, semibold
Body:      16px, regular
Small:     14px, regular
```

---

## 📱 Responsive Design

### Breakpoints

```css
Mobile:       max-width: 480px
Tablet:       max-width: 768px
Desktop:      min-width: 769px
```

### Mobile-First Approach

```css
/* Base Styles (Mobile) */
.container {
  padding: 16px;
}

/* Tablet & Desktop */
@media (min-width: 768px) {
  .container {
    padding: 32px;
  }
}
```

---

## 🐛 Debugging

### Browser Console

```javascript
// Aktiviere Logs
console.log('🔍 Suchbegriff aus URL:', searchParam);
console.log('📂 Kategorie aus URL:', categoryParam);
```

### localStorage prüfen

```javascript
// In Browser Console:
console.log(localStorage.getItem('token'));
console.log(localStorage.getItem('username'));

// Leeren:
localStorage.clear();
```

---

## ✅ Checkliste für neue Seiten

Wenn du eine neue HTML-Seite hinzufügst:

- [ ] Speichere in `pages/` Ordner
- [ ] Verwende `../css/main.css` für Styles
- [ ] Verwende `../js/categories.js` wenn Kategorien benötigt
- [ ] Logo-Link: `href="../index.html"`
- [ ] Interne Links: `href="./andere-seite.html"`
- [ ] Prüfe Login-Status in JavaScript
- [ ] Implementiere Error-Handling
- [ ] Teste auf Mobile (Responsive)
- [ ] Dokumentiere in README

---

## 📝 TODO / Roadmap

- [ ] WebSocket für Echtzeit-Chat
- [ ] Service Worker (PWA)
- [ ] Lazy Loading für Bilder
- [ ] Infinite Scroll für Einträge
- [ ] Darkmode Toggle
- [ ] Mehrsprachigkeit (i18n)
- [ ] Push-Benachrichtigungen
- [ ] Offline-Support
- [ ] Bildkompression vor Upload
- [ ] Autocomplete für PLZ

---

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle Feature-Branch
3. Folge Style-Guidelines
4. Teste auf verschiedenen Browsern
5. Erstelle Pull Request

---

## 💡 Best Practices

### JavaScript

✅ **Verwende `const` und `let`, nie `var`**
✅ **Async/Await statt Promises**
✅ **Error-Handling mit try/catch**
✅ **Keine globalen Variablen** (außer `window.CATEGORIES`)

### CSS

✅ **Mobile-First Approach**
✅ **BEM-Notation** für Klassen
✅ **CSS-Variablen** für Farben/Spacing
✅ **Flexbox/Grid** statt Float

### HTML

✅ **Semantisches HTML** (header, nav, main, footer)
✅ **Accessibility** (alt-text, aria-labels)
✅ **Meta-Tags** (viewport, description)

---

## 📄 Lizenz

MIT License

---

**Version:** 1.0.0  
**Letztes Update:** Januar 2026  
**Maintainer:** tauschBar Team
