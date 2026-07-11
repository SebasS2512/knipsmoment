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
- [x] **8. PWA & Polish** — Service Worker (`vite-plugin-pwa`, autoUpdate,
      Font-Caching), PNG-Icons aus dem SVG (`scripts/make-icons.mjs`), Code-Splitting
      (Admin lazy, eigener Chunk mit auth/jszip/qrcode), optionaler Gastname im
      Welcome-Screen (→ `guestName` im Foto-Dokument), Offline-Chip + Auto-Retry
      bei Netz-Rückkehr, neutrale Landing auf `/` (Demo-Event nur im DEV-Modus).
      **Offen: Tests auf echten iOS/Android-Geräten + Testdaten löschen.**
- [x] **9. Stil-Varianten B/C (§4.2)** — „Polaroid" (`PolaroidScreen.tsx`,
      Sofortbild fällt mit Drop-Animation heraus) und „Filmstreifen"
      (`FilmstripScreen.tsx`, Perforations-Schienen + großer Serif-Zähler).
      Auswahl im Onboarding („Stil des Knips-Screens"), Event-Feld `theme`;
      zum Ausprobieren `?theme=polaroid|filmstrip|finder` an eine Gäste-URL
      hängen. Gemeinsame Auslöser-Logik in `useShutter.ts`.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Type-Check + Produktions-Build
```

## Native App (Capacitor)

Die App läuft zusätzlich als native Android-App (Prüfungsanforderung).
Der Auslöser nutzt nativ das `@capacitor/camera`-Plugin, im Browser den
`<input capture>`-Fallback.

```bash
npm run build                 # Web-Assets bauen
npx cap sync android          # nach jedem Build in das Android-Projekt kopieren
npx cap open android          # Android Studio öffnen (Emulator/Gerät starten)
# oder ohne Android Studio:
cd android; .\gradlew assembleDebug   # APK: android/app/build/outputs/apk/debug/
```

Voraussetzungen: Android Studio + SDK; `android/local.properties` zeigt auf das SDK.

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
