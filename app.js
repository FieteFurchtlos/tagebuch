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

// Kompakte Variante für den Editor-Header
function formatDateTimeCompact(date) {
  return (
    date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
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

// Wandelt ein Date-Objekt in den Wert, den <input type="datetime-local"> erwartet
function toLocalDatetimeInput(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes())
  );
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
const editorDateInput = document.getElementById('editor-date-input');
const editorDeleteBtn = document.getElementById('editor-delete');
const saveStatusEl = document.getElementById('save-status');

// Aktuelles "createdAt" des im Editor offenen Eintrags (auch vor erstem Save)
let editorCurrentDate = null;

function refreshEditorDateDisplay() {
  if (!editorCurrentDate) return;
  editorDateEl.textContent = formatDateTimeCompact(editorCurrentDate);
  editorDateInput.value = toLocalDatetimeInput(editorCurrentDate);
}

function refreshDeleteVisibility() {
  // Lösch-Knopf nur zeigen, wenn der Eintrag bereits in der DB existiert
  if (currentEntryId) {
    editorDeleteBtn.hidden = false;
  } else {
    editorDeleteBtn.hidden = true;
  }
}

async function openEditor(entryId = null) {
  if (entryId) {
    const entry = await getEntry(entryId);
    if (!entry) return;
    currentEntryId = entryId;
    editorTextarea.value = entry.content || '';
    editorCurrentDate = new Date(entry.createdAt);
    initialOpenDate = new Date(entry.createdAt);
  } else {
    currentEntryId = null; // wird beim ersten Speichern erzeugt
    editorTextarea.value = '';
    editorCurrentDate = new Date();
    initialOpenDate = editorCurrentDate;
  }

  refreshEditorDateDisplay();
  refreshDeleteVisibility();

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
    const createdIso = (editorCurrentDate || new Date()).toISOString();
    currentEntryId = await addEntry({
      createdAt: createdIso,
      updatedAt: new Date().toISOString(),
      content,
      photos: [],
    });
    refreshDeleteVisibility();
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

// =====================================================
// Datum eines Eintrags ändern (Tippen auf das Datum)
// =====================================================
editorDateEl.addEventListener('click', () => {
  if (!editorCurrentDate) return;
  editorDateInput.value = toLocalDatetimeInput(editorCurrentDate);
  // showPicker() ist der moderne Weg; älteres Android fällt auf focus/click zurück
  if (typeof editorDateInput.showPicker === 'function') {
    try {
      editorDateInput.showPicker();
      return;
    } catch (e) {
      /* Fallback unten */
    }
  }
  editorDateInput.focus();
  editorDateInput.click();
});

editorDateInput.addEventListener('change', async () => {
  const value = editorDateInput.value;
  if (!value) return;
  // datetime-local wird als lokale Zeit interpretiert
  const newDate = new Date(value);
  if (isNaN(newDate.getTime())) return;

  editorCurrentDate = newDate;
  editorDateEl.textContent = formatDateTimeCompact(newDate);

  // Wenn schon ein Eintrag existiert: createdAt direkt aktualisieren
  if (currentEntryId) {
    const entry = await getEntry(currentEntryId);
    if (entry) {
      entry.createdAt = newDate.toISOString();
      entry.updatedAt = new Date().toISOString();
      await updateEntry(entry);
      saveStatusEl.textContent = 'Gespeichert';
    }
  } else {
    // Noch kein Eintrag — beim ersten Save wird editorCurrentDate verwendet
    initialOpenDate = newDate;
  }
});

// =====================================================
// Eintrag löschen — mit Bestätigung
// =====================================================
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmOkBtn = document.getElementById('confirm-ok');
const confirmCancelBtn = document.getElementById('confirm-cancel');

function showConfirm() {
  return new Promise((resolve) => {
    confirmOverlay.hidden = false;

    const cleanup = (result) => {
      confirmOverlay.hidden = true;
      confirmOkBtn.removeEventListener('click', onOk);
      confirmCancelBtn.removeEventListener('click', onCancel);
      confirmOverlay.removeEventListener('click', onBackdrop);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onBackdrop = (e) => {
      if (e.target === confirmOverlay) cleanup(false);
    };

    confirmOkBtn.addEventListener('click', onOk);
    confirmCancelBtn.addEventListener('click', onCancel);
    confirmOverlay.addEventListener('click', onBackdrop);
  });
}

editorDeleteBtn.addEventListener('click', async () => {
  if (!currentEntryId) return;
  const ok = await showConfirm();
  if (!ok) return;

  // Etwaige pending Saves verwerfen
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  await deleteEntry(currentEntryId);
  currentEntryId = null;
  editorCurrentDate = null;
  initialOpenDate = null;

  // Editor schließen ohne erneutes Speichern
  // Vor dem performCloseEditor() den Inhalt leeren, damit kein neuer Eintrag entsteht
  editorTextarea.value = '';
  editorView.classList.remove('active');
  document.body.classList.remove('editing');

  // History-State zurücksetzen, falls noch der Editor-Eintrag drin ist
  if (history.state && history.state.editor) {
    history.back();
  }

  await renderEntriesList();
});

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
