/* ===========================================================
   Mein Tagebuch — App-Logik (Phase 1)
   =========================================================== */

// -------- Service Worker registrieren --------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('SW registriert:', reg.scope))
      .catch((err) => console.warn('SW-Fehler:', err));
  });
}

// =====================================================
// IndexedDB — lokaler Speicher für Einträge
// =====================================================
const DB_NAME = 'tagebuch';
const DB_VERSION = 1;
const STORE = 'entries';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txStore(db, mode = 'readonly') {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function addEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, 'readwrite').add(entry);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updateEntry(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, 'readwrite').put(entry);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllEntries() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteEntry(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = txStore(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// =====================================================
// Helfer
// =====================================================
function formatDateLong(date) {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function formatDateTime(date) {
  return (
    date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ' · ' +
    date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =====================================================
// Navigation zwischen Ansichten
// =====================================================
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

// =====================================================
// Editor — neuen Eintrag schreiben oder bestehenden bearbeiten
// =====================================================
let currentEntryId = null;
let saveTimer = null;
let initialOpenDate = null;

const editorView = document.getElementById('view-editor');
const editorTextarea = document.getElementById('editor-textarea');
const editorDateEl = document.getElementById('editor-date');
const saveStatusEl = document.getElementById('save-status');

async function openEditor(entryId = null) {
  if (entryId) {
    const entry = await getEntry(entryId);
    if (!entry) return;
    currentEntryId = entryId;
    editorTextarea.value = entry.content || '';
    editorDateEl.textContent = formatDateTime(new Date(entry.createdAt));
    initialOpenDate = new Date(entry.createdAt);
  } else {
    currentEntryId = null; // wird beim ersten Speichern erzeugt
    editorTextarea.value = '';
    initialOpenDate = new Date();
    editorDateEl.textContent = formatDateTime(initialOpenDate);
  }

  saveStatusEl.textContent = '';
  editorView.classList.add('active');
  document.body.classList.add('editing');

  // Tastatur direkt öffnen
  setTimeout(() => editorTextarea.focus(), 50);

  // System-Zurück-Taste soll den Editor schließen
  history.pushState({ editor: true }, '');
}

async function performSave() {
  const content = editorTextarea.value;
  saveStatusEl.textContent = 'Speichere…';

  if (!currentEntryId) {
    // Erster Save → Eintrag erzeugen
    if (content.trim() === '') {
      // Noch nichts geschrieben — nichts speichern
      saveStatusEl.textContent = '';
      return;
    }
    const nowIso = initialOpenDate.toISOString();
    currentEntryId = await addEntry({
      createdAt: nowIso,
      updatedAt: new Date().toISOString(),
      content,
      photos: [],
    });
  } else {
    const entry = await getEntry(currentEntryId);
    if (!entry) return;
    entry.content = content;
    entry.updatedAt = new Date().toISOString();
    await updateEntry(entry);
  }
  saveStatusEl.textContent = 'Gespeichert';
}

function scheduleSave() {
  saveStatusEl.textContent = 'Speichere…';
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    performSave();
  }, 800);
}

editorTextarea.addEventListener('input', scheduleSave);

async function performCloseEditor() {
  // Offen gebliebene Änderungen sichern
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    await performSave();
  }

  // Leeren Eintrag verwerfen
  if (currentEntryId) {
    const entry = await getEntry(currentEntryId);
    if (entry && (!entry.content || entry.content.trim() === '')) {
      await deleteEntry(currentEntryId);
    }
  }

  currentEntryId = null;
  initialOpenDate = null;
  editorView.classList.remove('active');
  document.body.classList.remove('editing');
  await renderEntriesList();
}

document.getElementById('editor-back').addEventListener('click', () => {
  // history.back() löst popstate aus → schließt den Editor sauber
  history.back();
});

window.addEventListener('popstate', () => {
  if (document.body.classList.contains('editing')) {
    performCloseEditor();
  }
});

document.getElementById('fab-new').addEventListener('click', () => openEditor());

// Vor dem Schließen/Reload nochmal sichern (Auto-Save bei Unterbrechung)
window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    // synchron geht hier nichts — wir versuchen es trotzdem
    performSave();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    performSave();
  }
});

// =====================================================
// Liste der Einträge rendern
// =====================================================
const entriesContainer = document.getElementById('entries-container');
const entriesPlaceholder = document.getElementById('entries-placeholder');

async function renderEntriesList() {
  const entries = await getAllEntries();
  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (entries.length === 0) {
    entriesPlaceholder.style.display = 'block';
    entriesContainer.style.display = 'none';
    entriesContainer.innerHTML = '';
    return;
  }

  entriesPlaceholder.style.display = 'none';
  entriesContainer.style.display = 'block';
  entriesContainer.innerHTML = '';

  for (const entry of entries) {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const date = new Date(entry.createdAt);
    const preview = (entry.content || '').slice(0, 200);

    card.innerHTML = `
      <div class="entry-date">${escapeHtml(formatDateTime(date))}</div>
      <div class="entry-preview">${
        preview ? escapeHtml(preview) : '<em>Leerer Eintrag</em>'
      }</div>
    `;
    card.addEventListener('click', () => openEditor(entry.id));
    entriesContainer.appendChild(card);
  }
}

// =====================================================
// Initialisierung
// =====================================================
document.getElementById('today-date').textContent = formatDateLong(new Date());
switchView('list');
renderEntriesList();
