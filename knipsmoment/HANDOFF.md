# Handoff für den nächsten Agenten — Knipsmoment

> Auftrag: die restlichen Schritte der Bau-Reihenfolge aus
> `../design_handoff_knipsmoment/README.md` (§10) umsetzen. Dieses Dokument
> ist selbsterklärend — lies zusätzlich die Design-README komplett, bevor du
> Code schreibst. Design-Fidelity ist HIGH: Tokens/Maße/Copy exakt einhalten.

## Stand (2026-07-07)

Schritte 1–6 sind fertig, gebaut und im Browser gegen das echte
Firebase-Projekt `knipsmoment` verifiziert:

- **Gäste-Flow** (`src/guest/`): welcome → cam → done, localStorage-Persistenz,
  Upload mit Kompression (`browser-image-compression`) + sequentieller Queue
  mit Retry-UI (`useUploadQueue.ts`). Fotos landen als `pending` in
  `events/{eventId}/photos` + Storage `events/{eventId}/photos/{uuid}.jpg`.
- **Admin** (`src/admin/`): Login/Registrierung (Firebase Auth E-Mail/Passwort),
  Dashboard nach Mockup 10 (Live-`onSnapshot`, Stats, Status-Tabs, Sortierung,
  Freigeben/Ablehnen/Löschen/Einzel-Download), Onboarding nach §4.3 mit
  QR-Generierung (`qrcode`), Slug = Initialen+Jahr (z. B. `ab26`), Doc-ID = Slug.
- **Routing** (in `src/App.tsx`, ohne Router-Lib): `/` = Gäste-Demo-Event,
  `/l/{slug}` = Gäste-Flow mit Firestore-Event, `/admin` = Admin-Bereich.
- **Rules** (`firestore.rules`, `storage.rules`): deployed. Gäste dürfen anonym
  nur `pending`-Fotos anlegen und einzelne Storage-Objekte lesen (kein list);
  alles andere nur der Event-Admin (`adminUid`).
- Es existieren Testdaten im Live-Projekt: Konten `brautpaar-test@knipsmoment.de`
  und `onboarding-test@knipsmoment.de` (Passwort jeweils `Filmrolle-Demo25!`),
  Events `demo` und `ab26`, ein Testfoto unter `events/demo/photos`.

- **Schritt 7 (ZIP-Export) ist ebenfalls fertig**: clientseitig mit `jszip`
  (`exportZip` in `src/admin/Dashboard.tsx`), exportiert den aktiven Tab,
  Fortschritt im Button, einzelne Fehlschläge brechen nicht ab.
  **Wichtig:** Foto-Downloads laufen über `getBlob(ref(storage, storagePath))`,
  NICHT über `fetch(downloadUrl)` — die tokenisierten URLs der neuen
  `*.firebasestorage.app`-Buckets senden keine CORS-Header für programmatische
  GETs. Zusätzlich ist auf dem Bucket eine CORS-Config (GET, origin *) gesetzt;
  falls je ein neuer Bucket entsteht: `node scripts/set-bucket-cors.mjs`.

- **Schritt 8 ist im Kern ebenfalls fertig**: Service Worker (`vite-plugin-pwa`,
  autoUpdate, Font-Runtime-Caching), PNG-Icons (`scripts/make-icons.mjs`),
  Code-Splitting (Admin via `React.lazy`; `firebase/auth` liegt bewusst in
  `src/lib/auth.ts`, getrennt von `lib/firebase.ts`), optionaler Gastname
  (Welcome-Screen → `guestName` im Foto-Dokument), Offline-Chip im Sucher +
  Auto-Retry bei `online`-Event, neutrale Landing auf `/` in Produktion
  (Demo-Event nur bei `import.meta.env.DEV`).

- **Capacitor ist integriert** (Prüfungsanforderung): `capacitor.config.ts`
  (appId `de.knipsmoment.app`, androidScheme https), Android-Projekt unter
  `android/`. Workflow: `npm run build` → `npx cap sync android` → gradlew.
- **Live-Sucher**: Der Sucher zeigt die Rückkamera live (`getUserMedia`,
  `<video>` unter dem Overlay), der Auslöser friert einen Frame per Canvas ein.
  Kaskade bei Nichtverfügbarkeit (Berechtigung/kein Secure Context/keine
  Kamera): Capacitor-Camera-Plugin (nativ) → `<input capture>` (Web).
  Stream startet nur bei aktivem Cam-Screen und wird beim Verlassen gestoppt.
  Android braucht dafür die CAMERA-Permission (Manifest, bereits gesetzt).

## Offene Aufgaben (in dieser Reihenfolge)

### Rest von Schritt 8 (braucht echte Geräte / den Betreiber)
- **Cross-Device**: iOS Safari + Android Chrome auf echten Geräten testen —
  `<input capture>` verhält sich unterschiedlich (§8). Safe-Area bei Notch
  prüfen. Dafür lokal per `npm run dev -- --host` im WLAN testen oder erst
  deployen.
- **Testdaten räumen** (vor Launch): Auth-Konten `brautpaar-test@…` und
  `onboarding-test@…` in der Console löschen; Events `demo` und `ab26` samt
  Fotos (Firestore + Storage) entfernen.
  **WICHTIG: Erst löschen, wenn Sebastian es explizit freigibt — die Daten
  werden aktuell noch zum Testen und für die Prüfungsvorbereitung gebraucht.**

### Schritt 9 (optional) — Stil-Varianten B/C
- Nur wenn der Kunde es will (§4.2): Polaroid/Filmstreifen als Alternative zu
  Screen B hinter Feature-Flag (z. B. Event-Feld `theme`). Vorher klären.

### Deployment (wenn gewünscht)
- Firebase Hosting ist in `firebase.json` konfiguriert (public: `dist`,
  SPA-Rewrite). `npm run build`, dann
  `npx firebase-tools deploy --only hosting --project knipsmoment`.
- Danach QR-URLs prüfen: Slug-Links müssen auf die Hosting-Domain zeigen
  (`https://knipsmoment.web.app/l/{slug}` — die QR-Generierung nutzt
  `window.location.origin`, stimmt also automatisch).

## Bekannte Stolperfallen
- **Secure Context**: `crypto.randomUUID()` existiert nur unter HTTPS/localhost.
  Beim Testen über die WLAN-IP (`npm run dev:host` → `http://192.168.x.x:5173`)
  crashte die App deshalb mit weißem Bildschirm. Fix: `randomId()` in
  `src/lib/id.ts` (Fallback über `crypto.getRandomValues`). Gleiches Muster gilt
  für andere Secure-Context-APIs (Service Worker, `navigator.share`, Clipboard) —
  die degradieren aber nur, statt zu crashen.
- **CORS Storage-Downloads**: siehe Schritt-7-Notiz oben (`getBlob` statt
  `fetch(url)` + Bucket-CORS).

## Arbeitsweise
- Referenzen: Tokens aus `src/styles/tokens.css` (= §3 der Design-README),
  Verhalten aus `../design_handoff_knipsmoment/prototype.js`, Maße/Copy aus
  §3–§4 der Design-README, Screenshots in `../design_handoff_knipsmoment/screens/`.
- Nach jeder Änderung: `npm run build` (Type-Check) und im Dev-Server
  (`npm run dev`, Port 5173) mobil (375px) UND Desktop prüfen.
- Rules-Änderungen: `npx firebase-tools deploy --only firestore,storage`
  (CLI ist auf diesem Rechner eingeloggt).
- Vorsicht: „Löschen" im Dashboard nutzt `window.confirm` — blockiert
  Browser-Automation; Firestore-Aktionen dann direkt per SDK testen.
