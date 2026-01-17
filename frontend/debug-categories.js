// Debug-Script für Kategorien
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== CATEGORIES DEBUG ===');
  console.log('1. window.CATEGORIES existiert:', typeof window.CATEGORIES !== 'undefined');
  console.log('2. window.CATEGORIES Inhalt:', window.CATEGORIES);
  console.log('3. Anzahl:', window.CATEGORIES ? window.CATEGORIES.length : 0);
  
  if (window.CATEGORIES && window.CATEGORIES.length > 0) {
    console.log('✅ Kategorien erfolgreich geladen!');
    window.CATEGORIES.forEach((cat, i) => {
      console.log(`   ${i+1}. ${cat.icon} ${cat.name}`);
    });
  } else {
    console.error('❌ FEHLER: Kategorien nicht geladen!');
  }
});
