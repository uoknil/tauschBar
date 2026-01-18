// Zentrale Kategorien-Definition für tauschBar
// Diese Kategorien werden überall verwendet: Landing Page, Create Entry, Dashboard

const CATEGORIES = [
  {
    id: 'haushalt',
    icon: '🏠',
    name: 'Haushalt & Alltag',
    description: 'Putzen, Einkaufen, Haustiere',
  },
  {
    id: 'handwerk',
    icon: '🔧',
    name: 'Handwerk & Reparaturen',
    description: 'Möbel, Elektrik, Maler',
  },
  {
    id: 'garten',
    icon: '🌱',
    name: 'Garten & Pflanzen',
    description: 'Rasenmähen, Pflanzenpflege',
  },
  {
    id: 'kinderbetreuung',
    icon: '👶',
    name: 'Kinderbetreuung',
    description: 'Babysitting, Hausaufgaben',
  },
  {
    id: 'bildung',
    icon: '📚',
    name: 'Bildung & Nachhilfe',
    description: 'Sprachen, Mathe, Musik',
  },
  {
    id: 'it',
    icon: '💻',
    name: 'IT & Technik',
    description: 'Computer, Smartphone',
  },
  {
    id: 'mobilitaet',
    icon: '🚗',
    name: 'Mobilität & Transport',
    description: 'Fahrdienste, Umzugshilfe',
  },
  {
    id: 'kochen',
    icon: '🍳',
    name: 'Kochen & Backen',
    description: 'Rezepte, Backkurse',
  },
  {
    id: 'kreatives',
    icon: '🎨',
    name: 'Kreatives & Handarbeit',
    description: 'Nähen, Basteln, Fotografie',
  },
  {
    id: 'sport',
    icon: '💪',
    name: 'Sport & Fitness',
    description: 'Training, Yoga, Sportgeräte',
  },
  {
    id: 'gesundheit',
    icon: '🏥',
    name: 'Gesundheit & Pflege',
    description: 'Seniorenbetreuung, Massage',
  },
  {
    id: 'buero',
    icon: '📝',
    name: 'Büro & Verwaltung',
    description: 'Übersetzungen, Formulare',
  },
  {
    id: 'werkzeuge',
    icon: '🛠️',
    name: 'Werkzeuge & Geräte',
    description: 'Bohrmaschine, Leiter',
  },
  {
    id: 'freizeit',
    icon: '🎭',
    name: 'Freizeit & Kultur',
    description: 'Events, Hobbypartner',
  },
  {
    id: 'sprachen',
    icon: '🌍',
    name: 'Sprachen & Kultur',
    description: 'Sprachaustausch, Reisen',
  },
];

// Helper-Funktionen
function getCategoryByName(name) {
  return CATEGORIES.find((cat) => cat.name === name);
}

function getCategoryById(id) {
  return CATEGORIES.find((cat) => cat.id === id);
}

function getCategoryIcon(name) {
  const cat = getCategoryByName(name);
  return cat ? cat.icon : '📦';
}

// Export für Browser (window-Objekt)
if (typeof window !== 'undefined') {
  window.CATEGORIES = CATEGORIES;
  window.getCategoryByName = getCategoryByName;
  window.getCategoryById = getCategoryById;
  window.getCategoryIcon = getCategoryIcon;
}

// Export für Node.js (falls benötigt)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES,
    getCategoryByName,
    getCategoryById,
    getCategoryIcon,
  };
}
