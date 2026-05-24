# Mein Tagebuch — PWA (Phase 1)

Persönliches Tagebuch als Progressive Web App.
Einträge und Fotos bleiben **lokal auf dem Gerät** — kein Server.

---

## Was Phase 1 enthält

Aktuell steht das **Grundgerüst**:

- Installierbare PWA (Homescreen-Icon, läuft im Vollbild)
- Offline-Fähigkeit (Service Worker)
- Warmer Tagebuch-Look (Cremepapier, Sepia-Schrift, Sienna-Akzent)
- Navigation: Einträge · Kalender · Suche · Mehr
- Floating-Action-Button für neuen Eintrag

**Noch nicht aktiv** (kommt schrittweise nach deiner Freigabe):
PIN-Sperre · Eintragen mit Auto-Save · Google-Spracherkennung · Fotos · Suche · Kalenderlogik · Export. 

---

## So bekommst du die App aufs Handy

### Schritt 1 — GitHub-Konto

Falls noch nicht vorhanden: kostenloses Konto auf [github.com](https://github.com) anlegen.

### Schritt 2 — Repository anlegen

1. Bei GitHub eingeloggt: oben rechts auf **+** → **New repository**
2. Repository name: `tagebuch` (oder beliebig)
3. **Public** auswählen (für GitHub Pages kostenlos)
4. Auf **Create repository** klicken

### Schritt 3 — Dateien hochladen

Auf der leeren Repository-Seite:

1. Auf **uploading an existing file** klicken
2. Den **gesamten Inhalt** dieses Ordners hochziehen (`index.html`, `manifest.json`, `sw.js`, `styles.css`, `app.js`, der `icons/`-Ordner, `README.md`)
3. Unten **Commit changes** klicken

### Schritt 4 — GitHub Pages aktivieren

1. Im Repository oben auf **Settings**
2. Links auf **Pages**
3. Unter *Source*: **Deploy from a branch** wählen
4. Branch: **main**, Folder: **/ (root)**, dann **Save**
5. Nach 1–2 Minuten erscheint oben die URL, z. B.:
   `https://DEIN-NAME.github.io/tagebuch/`

### Schritt 5 — Auf dem Handy öffnen und installieren

1. URL in **Chrome auf dem Android-Handy** öffnen
2. Im Menü (⋮ oben rechts) → **App installieren** (oder *Zum Startbildschirm hinzufügen*)
3. Auf dem Homescreen erscheint das Tagebuch-Icon
4. Beim Öffnen läuft es wie eine eigenständige App — ohne Browser-Leiste

> **Hinweis:** GitHub Pages liefert automatisch HTTPS — das ist Voraussetzung für die Service-Worker- und Mikrofon-Funktionen.

---

## Updates später einspielen

Wenn ich (oder du) eine Datei änderst:
- Im Repository die Datei öffnen → **Bleistift-Symbol** → bearbeiten → **Commit**
- Oder neue Version per *Add file → Upload* überschreiben.

In der App auf dem Handy: einmal schließen und wieder öffnen, dann zieht das Update.

---

## Struktur

```
tagebuch_app/
├── index.html        ← App-Shell
├── manifest.json     ← PWA-Manifest (Name, Icons, Farben)
├── sw.js             ← Service Worker (Offline-Cache)
├── styles.css        ← Warmer Tagebuch-Look
├── app.js            ← Navigation, später Einträge usw.
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── README.md         ← Diese Datei
```
