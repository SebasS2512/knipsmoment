# Knipsmoment — Hochzeits-Einwegkamera (Web-App)

React + Vite + TypeScript PWA nach dem Design-Handoff in
`../design_handoff_knipsmoment/README.md`.

## Status (Bau-Reihenfolge §10)

- [x] **1. Projekt-Setup** — Vite/React/TS, Google Fonts (Instrument Serif, DM Sans, DM Mono),
      Design-Tokens (`src/styles/tokens.css`), PWA-Manifest, Firebase-SDK + Config-Scaffold.
- [x] **2. Datenmodell + Security Rules** — TypeScript-Typen (`src/types/models.ts`),
      `firestore.rules`, `storage.rules`, `firebase.json`, Composite-Index für Status-Filter.
- [x] **3. Gäste-Flow** — Welcome → Sucher → Done als State-Machine mit lokalem State
      (`src/guest/`), localStorage-Persistenz (Session-ID, Zähler, Screen), Blitz/Toast/
      Filmstreifen-Animationen, `prefers-reduced-motion`.
- [x] **4. Upload + Firestore/Storage-Anbindung** — Client-Kompression
      (`browser-image-compression`, max. 1920px/~0,8 MB), sequentielle Upload-Queue mit
      Retry + Fehler-/Ladezuständen (`src/guest/useUploadQueue.ts`), Fotos landen als
      `pending` in `events/{eventId}/photos`, Event-Loading über Slug (`/l/{slug}`,
      `src/lib/useEvent.ts`), Demo-Event als Fallback ohne Slug.
- [x] **5. Admin-Auth + Dashboard** — E-Mail/Passwort-Login + Registrierung
      (`src/admin/LoginScreen.tsx`), Dashboard unter `/admin` mit Live-Galerie
      (Firestore `onSnapshot`), Statistik-Leiste, Status-Tabs, Sortierung,
      Freigeben/Ablehnen/Löschen/Einzel-Download (`src/admin/Dashboard.tsx`).
      Übergangs-Button „Demo-Event verknüpfen" bis Onboarding (Schritt 6) steht.
- [x] **6. Onboarding** — 3 Schritte nach §4.3 (`src/admin/Onboarding.tsx`): Eckdaten,
      Filmrollen-Regler (3–15) + Segmented Controls, echter QR-Code (`qrcode`) mit
      Slug-Generierung (Initialen+Jahr, Kollisionsprüfung), „PDF drucken" (Print-CSS)
      und „Teilen" (Web Share / Clipboard). Ersetzt den „Demo-Event"-Übergangsbutton.
- [x] **7. ZIP-Export** — clientseitig mit `jszip` (`exportZip` in
      `src/admin/Dashboard.tsx`): bündelt die Bilder des aktiven Tabs, Fortschritt
      im Button („↧ Packe n/N …"), einzelne Fehlschläge brechen nicht ab.
      Downloads laufen über `getBlob` (SDK) statt `fetch(url)` — die tokenisierten
      URLs der `*.firebasestorage.app`-Buckets senden keine CORS-Header; zusätzlich
      ist Bucket-CORS für GET gesetzt (einmalig, via `scripts/set-bucket-cors.mjs`).
- [ ] 8. Cross-Device-Tests, Fehler-/Ladezustände, Service Worker.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Type-Check + Produktions-Build
```

## Firebase

Projekt: `knipsmoment` · Config in `.env.local` (Vorlage: `.env.example`).

- Firestore-Rules + Indexe sind deployed (`npx firebase-tools deploy --only firestore`).
- **Storage muss einmalig in der Console aktiviert werden:**
  https://console.firebase.google.com/project/knipsmoment/storage → „Get Started".
  Danach: `npx firebase-tools deploy --only storage`
- Für Schritt 5 in der Console **Auth → E-Mail/Passwort** aktivieren.

## Hinweise

- Der Gäste-Flow läuft aktuell mit einem Demo-Event (`src/App.tsx`); ab Schritt 4/6 kommen
  die Event-Daten über den Slug (`/l/{slug}`) aus Firestore.
- Auslöser öffnet die Geräte-Kamera über `<input type="file" capture="environment">`,
  „AUS GALERIE" den Datei-Picker — beides verbraucht ein Bild (§5: Upload = Auslösen).
- Die Fake-Statusbar/Notch aus den Mockups ist bewusst nicht nachgebaut — auf echten
  Geräten liefert das OS die Statusleiste; Safe-Area-Insets sind berücksichtigt.
