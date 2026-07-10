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

## Offene Aufgaben (in dieser Reihenfolge)

### Schritt 8 — Polish & PWA
- **Service Worker / PWA**: `vite-plugin-pwa` einbauen (Manifest liegt schon in
  `public/manifest.webmanifest`), App-Shell cachen. Uploads NICHT offline
  queuen (bewusst schlank halten).
- **Code-Splitting**: Bundle ist ~880 kB. Admin-Bereich per `React.lazy` +
  dynamic import abspalten; Gäste-Route soll klein sein.
- **Optionaler Gastname** (§7 V1): kleines Mono-Eingabefeld im Welcome-Screen
  („Wer knipst da? (optional)"), Wert in localStorage + als `guestName` ins
  Foto-Dokument (`src/lib/uploadPhoto.ts` erweitern; Rules erlauben das Feld).
- **Fehler-/Ladezustände**: Offline-Hinweis im Gäste-Flow (`navigator.onLine`),
  Skeleton statt Textzeile beim Event-Laden.
- **Cross-Device**: iOS Safari + Android Chrome testen — `<input capture>`
  verhält sich unterschiedlich (§8). Safe-Area auf Geräten mit Notch prüfen.
- **Produktions-Root**: `/` zeigt aktuell das Demo-Event (`DEMO_EVENT` in
  `src/lib/useEvent.ts`). Vor Launch: durch neutrale Landing ersetzen
  („Knipsmoment — QR-Code der Einladung scannen") und Demo-Fallback nur in
  DEV (`import.meta.env.DEV`) lassen.
- **Testdaten räumen**: Test-Konten + Events `demo`/`ab26` löschen (Console
  oder Dashboard), bevor echte Nutzer kommen.

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
