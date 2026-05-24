/* ===========================================================
   Mein Tagebuch — App-Logik (Phase 1, Grundgerüst)
   =========================================================== */

// Service Worker registrieren (nur über HTTPS oder localhost)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('SW registriert:', reg.scope))
      .catch((err) => console.warn('SW-Fehler:', err));
  });
}

// ---------- Navigation zwischen Ansichten ----------
const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('nav.bottom button');

function switchView(target) {
  views.forEach((v) => v.classList.toggle('active', v.id === 'view-' + target));
  navButtons.forEach((b) =>
    b.classList.toggle('active', b.dataset.target === target)
  );
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.target));
});

// FAB → Neuer Eintrag (vorerst nur Hinweis)
document.getElementById('fab-new').addEventListener('click', () => {
  alert('Eintrags-Erstellung folgt im nächsten Schritt.\n\n(Funktion wird gleich gebaut.)');
});

// Tagesdatum in der Kopfzeile
const today = new Date();
const dateLong = today.toLocaleDateString('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
document.getElementById('today-date').textContent = dateLong;

// Start-Ansicht: Liste
switchView('list');
