# Handoff: Knipsmoment — Hochzeits-Einwegkamera (Web-App)

> **Für Claude Code.** Dieses Dokument ist ein vollständiger Implementierungs-Auftrag.
> Lies es einmal komplett, bevor du Code schreibst. Es beschreibt *was* gebaut wird,
> *wie* es aussieht (pixelgenau) und *in welcher Reihenfolge* du vorgehen solltest.

---

## 1. Überblick

**Knipsmoment** ist eine Web-App (PWA), die auf einer Hochzeit eine analoge Einwegkamera ersetzt.
Jeder Gast bekommt über einen QR-Code Zugang, darf eine **begrenzte Anzahl Fotos** (Standard: 10)
aufnehmen oder hochladen. Alle Bilder landen zunächst als *„wartet auf Freigabe"* im
**Admin-Dashboard** des Brautpaars, das sie sichtet, freigibt/löscht und am Ende als ZIP exportiert.

Kein Login für Gäste, keine Store-App, keine Live-Galerie. Bewusst schlank — ein MVP,
der von einer Person in ~1–3 Wochen lieferbar ist.

Es gibt **drei Nutzer-Kontexte**:
1. **Gast** (mobil, kein Login) — QR scannen → knipsen → fertig.
2. **Brautpaar / Admin** (Onboarding + Dashboard, mit Login) — Event anlegen, Bilder verwalten.
3. **System** — Upload, Kompression, Statusverwaltung.

---

## 2. Über die Design-Dateien (WICHTIG)

Die HTML/CSS/JS-Dateien in diesem Bundle sind **Design-Referenzen**, keine Produktions-Bausteine
zum 1:1-Kopieren. Sie zeigen das beabsichtigte Aussehen und Verhalten (Look, Flow, Interaktionen).

**Deine Aufgabe:** Diese Designs in einem echten Stack **nachbauen** — mit dessen etablierten
Mustern und Bibliotheken. Es existiert noch **kein Codebase**. Empfohlener Stack (siehe §9);
du darfst begründet abweichen, wenn ein anderer Stack besser passt.

**Die Fidelity ist HIGH** — die Mockups enthalten finale Farben, Typografie, Abstände und
Interaktionen. Baue die UI **pixelgenau** nach den Angaben in diesem Dokument nach.

---

## 3. Design-Tokens

### Farben
| Token | Hex | Verwendung |
|---|---|---|
| `paper` | `#F3EFE4` | Haupt-Hintergrund (warmes Creme) |
| `paper-2` | `#ECE5D5` | Sekundär-Flächen, Eingabefelder |
| `paper-3` | `#E3DAC6` | Bild-Platzhalter, Rahmen-Flächen |
| `ink` | `#2A2822` | Haupttext |
| `ink-soft` | `#6A6457` | Sekundärtext |
| `ink-faint` | `#9A9384` | Tertiärtext, Hinweise |
| `sage` | `#7C9173` | Primär-Akzent (Salbeigrün) |
| `sage-deep` | `#54664C` | Buttons, aktive Zustände, Überschriften-Akzent |
| `sage-pale` | `#D9E1CF` | Pills, Badges, Icon-Backgrounds |
| `sage-mist` | `#E7ECDD` | zarter Screen-Hintergrund (QR / Polaroid) |
| `amber` | `#D9742E` | **Film-Orange** — Auslöser, Datums-Stempel, „wartend"-Badge |
| `amber-soft` | `#E9954E` | Hover-Varianten |
| `amber-glow` | `#F4B26A` | Blitz-Element, Highlights auf Dunkel |
| `line` | `rgba(42,40,34,0.13)` | Standard-Rahmen |
| `line-2` | `rgba(42,40,34,0.07)` | zarte Trenner |
| Kamera-BG | `#14130f` | Sucher-Screen-Hintergrund (fast schwarz) |

### Typografie
| Familie | Einsatz | Quelle |
|---|---|---|
| **Instrument Serif** (400, ital) | Headlines, Namen, große Zahlen | Google Fonts |
| **DM Sans** (400/500/600/700) | Fließtext, Buttons, UI | Google Fonts |
| **DM Mono** (400/500) | Labels, Zähler, Datums-Stempel, URLs, Eyebrows | Google Fonts |

Typo-Regeln:
- Headlines: Instrument Serif, `line-height: 1.02–1.08`, `letter-spacing: -0.01em`.
- Eyebrows / Labels: DM Mono, `font-size: 10–12px`, `letter-spacing: 0.12–0.22em`, `text-transform: uppercase`.
- Datums-Stempel: DM Mono, Farbe `amber`, `text-shadow: 0 0 8px rgba(217,116,46,0.55)` (leuchtender 90er-Kamera-Look).

### Abstände & Formen
- Border-Radius: Buttons `999px` (Pille); Cards/Frames `4px`; Phone-Screen `32px`; Eingabefelder `8px`.
- Standard-Sektionsabstand (Web): `110px` oben/unten.
- Schatten (Karten): `0 24px 50px -22px rgba(42,40,34,0.45)`.
- Hit-Targets mobil: **min. 44px**.

### Texturen / Motive (die „analoge" Identität)
1. **Film-Korn** — SVG-`feTurbulence`-Noise, ganzflächig als `position: fixed` Overlay,
   `opacity: 0.42`, `mix-blend-mode: multiply`, `pointer-events: none`.
2. **Sprocket-Perforation** — Reihen von Kreis-Löchern (Radial-Gradient) auf dunklem Grund;
   rahmt Filmstreifen und Variante C.
3. **Klebeband (Tape)** — halbtransparente beige Rechtecke, leicht rotiert, mit feinen Streifen.
4. **Datums-Stempel** — oranger Mono-Text unten rechts, wie eingebrannt.
5. **Bild-Platzhalter** — diagonale Schraffur (`repeating-linear-gradient(-45deg …)`) auf `paper-3`.

---

## 4. Screens / Views

Jeder Screen unten hat ein zugehöriges PNG in `/screens/` und ist im HTML-Prototyp
(`Knipsmoment Konzept.html`) bzw. Screens-Board (`Knipsmoment Screens.html`) live zu sehen.

### 4.1 — Gäste-Flow (mobil, 3 Screens)

Der Gäste-Flow ist eine State-Machine: `welcome → cam → done`. Referenz-Implementierung
der Logik liegt in `prototype.js`.

#### Screen A — Welcome (`01-gast-welcome.png`)
- **Zweck:** Begrüßung, Erklärung des Limits, Einstieg.
- **Hintergrund:** `paper`. Zentrierter Inhalt, `text-align: center`.
- **Komponenten (von oben):**
  - Status-Bar (Zeit „9:41" + Signal-Punkte) — nur mobile Deko.
  - **CSS-Einwegkamera-Illustration** (132×86px): Body (`paper-2`, 2px `ink`-Border, radius 10px),
    Linse (Radial-Gradient sage, 42px Kreis, 3px `ink`-Border), Blitz (`amber-glow` Rechteck),
    Aufzugsrad + Sucher als kleine Formen. **Rein CSS, keine Bilddatei.**
  - Eyebrow: „EURE EINWEGKAMERA" (Mono, `sage-deep`, uppercase, letter-spacing 0.22em).
  - **H1:** Namen des Brautpaars, Instrument Serif ~46px. Das „&" kursiv in `sage-deep`.
    (z. B. „Lena *&* Jonas")
  - Datum: Mono, `ink-soft`, Format „12 · 07 · 25".
  - Blurb: DM Sans 14.5px, `ink-soft`: „Haltet den Tag fest, wie ihr ihn seht. {N} Bilder —
    mehr hat eure Filmrolle nicht. Also: gut zielen!"
  - **Count-Pill:** Pille `sage-pale`/`sage-deep`, „◉ {N} Bilder frei".
  - **Primär-Button (amber):** „Filmrolle einlegen →" — führt zu Screen B.

#### Screen B — Sucher / Kamera (`02-gast-sucher.png`)
- **Zweck:** Das Kern-Erlebnis. Foto aufnehmen ODER aus Galerie hochladen.
- **Hintergrund:** `#14130f` (fast schwarz), Text weiß.
- **Layout:** oben Sucher-Fläche (flex-1), unten Kontroll-Leiste (fixe Höhe 116px, 3-Spalten-Grid).
- **Sucher (viewfinder):**
  - Rand 6px, radius 18px, dunkelgrüner Grund `#20201a` mit diagonaler Schraffur.
  - **Ecken-Klammern** (4 Stück, weiße L-Formen) + **Fadenkreuz** in der Mitte.
  - Oben links: **Zähler** „NOCH **7** BILDER" (Mono; Zahl in `amber-glow`).
  - Oben rechts: „● AUTO" (kleiner amber-Punkt).
  - Unten rechts: **Datums-Stempel** `12·07·25` (leuchtend orange).
  - Unten: **Mini-Filmstreifen** — kleine Frames (30×22px) der bereits gemachten Fotos,
    erscheinen mit Pop-Animation.
  - **Blitz-Overlay:** weiße Fläche, `opacity 0→0.95→0` über 0.42s bei jedem Auslösen.
  - **Toast:** „Bild {n} von {N} gesichert", 1.3s sichtbar.
- **Kontroll-Leiste:**
  - Links: **Upload-Button** „AUS GALERIE" (öffnet Datei-/Kamera-Picker; im echten Bau:
    `<input type="file" accept="image/*" capture>`).
  - Mitte: **Auslöser (Shutter)** — 76px Kreis, `amber`, 5px weißer Ring, doppelter Glow-Ring.
    Bei Klick `scale(0.92)`. Disabled (grau) wenn Limit erreicht.
  - Rechts: Hinweis „TIPP · HALTEN & RUHIG" (Mono, gedämpft).
- **Verhalten pro Auslösen:** Blitz feuern → Zähler −1 → Frame in Filmstreifen → Toast.
  Bei 0 verbleibenden Bildern nach ~0.9s automatisch zu Screen C.

#### Screen C — Filmrolle voll / Fertig (`03-gast-fertig.png`)
- **Zweck:** Liebevoller Abschluss.
- **Hintergrund:** `paper`, zentriert.
- **Komponenten:**
  - **Siegel:** 64px Kreis, `sage-pale`, `sage`-Border, Instrument-Serif-„✦".
  - **H2:** „Deine Filmrolle ist voll!" (Instrument Serif ~34px).
  - Text: „Danke, dass du mitgeknipst hast. {Namen} entwickeln eure Bilder nach der Feier."
  - **Roll:** Raster kleiner Film-Frames (40×30px), einer pro gemachtem Bild.
  - **Reset-Link (Text):** „↺ Noch jemand? Neu starten" — setzt State zurück auf `welcome`
    (nächster Gast am selben Gerät).

### 4.2 — Stil-Varianten des Gäste-Screens (Design-Entscheidung offen)

Drei ausgearbeitete Richtungen für Screen B. **Vor der Implementierung mit dem Kunden klären,
welche gebaut wird** — Standardempfehlung: **Variante A**.

- **Variante A — „Der Sucher"** (`04-…`): wie Screen B oben. Echte Kamera-Haptik. *Empfohlen.*
- **Variante B — „Das Polaroid"** (`05-…`): heller Screen (`sage-mist`), jeder Schnappschuss
  „fällt" als weißes Sofortbild heraus, handschriftlicher Zähler „noch 7 von 10", separater
  Auslöser-Button + „ODER AUS GALERIE". Verspielt, warm.
- **Variante C — „Der Filmstreifen"** (`06-…`): Perforations-Schienen links/rechts rahmen den
  ganzen Screen, großes Serif-„Noch 7 Bilder", zentriertes Bild. Reduziert, grafisch, elegant.

### 4.3 — Onboarding Brautpaar (3 Screens, mobil)

#### Onboarding 1 — Eckdaten (`07-onboarding-eckdaten.png`)
- Eyebrow „NEUE HOCHZEIT", H3 „Eure Eckdaten".
- Felder (Label in Mono uppercase, Eingabe in `paper-2`, radius 8px):
  - **Brautpaar** (Instrument Serif 20px im Feld) — z. B. „Lena & Jonas"
  - **Datum** — z. B. „12. Juli 2025"
  - **Location** — z. B. „Gutshof Ahrenberg"
- Primär-Button „Weiter →".

#### Onboarding 2 — Filmrolle / Regeln (`08-onboarding-filmrolle.png`)
- Eyebrow „DIE FILMROLLE", H3 „Wie viele Bilder?".
- **Limit-Regler:** große Serif-Zahl (`sage-deep`, ~52px) + „Auslöser / Gerät", darunter
  Slider-Track (`paper-3`, gefüllt `sage`, weißer Knopf). Bereich **3–15**, Default **10**.
- **Aufnahme-Modus** — Segmented Control 3 Optionen: „Sucher" / „Upload" / „Beide" (Default „Beide").
- **Galerie sofort sichtbar?** — Segmented: „Ja" / „Erst nach Freigabe" (Default „Erst nach Freigabe").
- Primär-Button „QR erstellen →".

#### Onboarding 3 — QR-Code (`09-onboarding-qr.png`)
- Hintergrund `sage-mist`, zentriert.
- Siegel „✦", H3 „Eure Kamera ist bereit!", Untertext „Auf den Tischen aufstellen — Gäste scannen einfach."
- **QR-Code** in weißer Box (echter QR im Bau — im Mock deterministisch generiert). Finder-Ecken
  in `ink`/`sage-deep`.
- Event-URL als Datums-Stempel: „knipsmoment.app/l/lj25".
- Buttons: „↧ PDF drucken" (primär) + „Teilen" (ghost).

### 4.4 — Admin-Dashboard (Desktop, `10-admin-dashboard.png`)
- **Zweck:** Sichten, freigeben/ablehnen, herunterladen.
- In Browser-Chrome dargestellt (URL „knipsmoment.app/admin/lena-und-jonas").
- **Kopf:** rundes Logo-Siegel „✦" + „Lena & Jonas" (Serif) + Sub „12·07·2025 · GUTSHOF AHRENBERG".
  Rechts: **amber-Button „⛁ Alle herunterladen (ZIP)"**.
- **Statistik-Leiste** (4 Werte, Serif-Zahlen ~34px, Trennstriche):
  „Bilder gesamt" · „Wartend" (Zahl in `amber`) · „Freigegeben" · „Gäste aktiv".
- **Toolbar:** Tabs als Pillen — „Alle" (aktiv, dunkel) / „Wartend" / „Freigegeben" / „Abgelehnt",
  jeweils mit Zähler-Badge (amber). Rechts Sortier-Pille „↧ Sortieren: Neueste".
- **Galerie-Grid:** 5 Spalten (responsive: 3 / 2), Karten mit:
  - Bild (Seitenverhältnis 3:4).
  - **Status-Badge** oben links: „wartet" (amber) oder „frei" (sage-deep).
  - Datums-Stempel unten rechts.
  - **Hover-Overlay** mit 3 runden Aktions-Buttons: **✓ Freigeben** (sage-deep),
    **✕ Ablehnen** (weiß/amber), **↧ Download**.

---

## 5. Interaktionen & Verhalten

- **Gäste-State-Machine:** `welcome → cam → done`; `done` → Reset → `welcome`.
- **Auslösen (Shutter):** Blitz-Animation (0.42s), Zähler dekrementieren, Frame in Streifen
  pushen (Pop-Anim 0.35s), Toast (1.3s). Bei `remaining === 0`: Shutter disablen, nach 0.9s → `done`.
- **Upload = Auslösen:** „Aus Galerie" zählt gleich wie ein Auslöser (verbraucht ein Bild).
- **Limit-Durchsetzung:** clientseitig pro Session/Gerät (siehe §6-Risiken). Server prüft
  Session-Kontingent zusätzlich.
- **Admin-Aktionen:** Freigeben setzt Status `pending → approved`; Ablehnen `→ rejected`;
  Tabs filtern nach Status; ZIP-Export bündelt alle (oder gefilterte) Bilder.
- **Animationen respektieren `prefers-reduced-motion`** (Blitz/Pop reduziert darstellen).
- **Responsive:** Gäste- und Onboarding-Screens sind mobil-first (Design-Breite ~300–390px);
  Admin ist Desktop-first mit Grid-Reflow bei 980px / 560px.

---

## 6. State & Datenmodell

### Firestore-Collections
```
events/{eventId}
  coupleNames: string        // "Lena & Jonas"
  date: timestamp
  location: string
  photoLimit: number         // 3–15, default 10
  captureMode: 'finder' | 'upload' | 'both'
  galleryVisible: 'immediate' | 'after_approval'
  slug: string               // "lj25" → knipsmoment.app/l/lj25
  createdAt: timestamp
  adminUid: string

events/{eventId}/photos/{photoId}
  url: string                // Storage-Download-URL
  storagePath: string
  status: 'pending' | 'approved' | 'rejected'
  guestName?: string
  guestSessionId: string     // anonyme Session/Gerät-ID
  createdAt: timestamp
  width, height: number
```

### Storage
```
events/{eventId}/photos/{photoId}.jpg
```

### Gäste-Session-State (clientseitig, localStorage)
- `guestSessionId` (UUID, einmal generiert)
- `takenCount` pro `eventId` (Anzeige-Limit; Server bleibt Source of Truth)
- Aktueller Screen (damit Reload nicht den Flow verliert)

### Zustandsübergänge Foto
`(Upload) → pending → [Admin ✓] → approved`  |  `→ [Admin ✕] → rejected`

---

## 7. Funktionsumfang — V1 (bauen) vs. später (NICHT bauen)

**V1:**
- Event-Anlage (Onboarding 1–3) inkl. QR-/Slug-Generierung.
- Gäste-Seite über Slug/QR, ohne Login.
- Kamera-Aufnahme (`<input capture>`) **und** Datei-Upload.
- Bild-Limit pro Gerät/Session + clientseitige Kompression vor Upload.
- Optionaler Gastname.
- Admin-Login (Firebase Auth) + Dashboard: Liste, Vorschau, Freigeben, Ablehnen, Löschen.
- ZIP-Export aller (freigegebenen) Bilder.

**Bewusst NICHT in V1:** Nutzerkonten für Gäste · Kommentare/Likes/Chat · native App ·
KI-Bearbeitung · Echtzeit-Galerie für alle Gäste · komplexe Rollen/Rechte.

---

## 8. Bekannte Risiken (aus der Analyse, beim Bau berücksichtigen)

- **Limit ist ohne Login nie hart** — Gäste können Browser wechseln / Link neu öffnen.
  Session-ID + optional QR-Einmal-Codes mildern das; nicht überentwickeln.
- **iOS vs. Android Kamera-Verhalten** unterscheidet sich bei `<input capture>` — beide testen.
- **Große Dateien** → Client-Kompression (z. B. `browser-image-compression`) vor Upload zwingend.
- **Schlechter Empfang** in Locations → Upload mit Retry/Queue, klare Fehler-/Ladezustände.
- **Admin-Sicherheit** → Firebase Security Rules pro Event; Admin-Routen hinter Auth.

---

## 9. Empfohlener Tech-Stack

- **Frontend:** React + Vite als PWA (alternativ Ionic, wie in der Ausgangsanalyse). Mobile-first.
- **Styling:** CSS-Variablen exakt aus §3 (die Tokens sind bereits als `:root`-Variablen in
  `styles.css` definiert — direkt übernehmbar). Kein UI-Framework nötig.
- **Backend:** Firebase — Firestore (Daten), Storage (Bilder), Auth (Admin), Hosting.
- **QR:** clientseitig generieren (z. B. `qrcode`), zeigt Event-Slug-URL.
- **Kompression:** `browser-image-compression` o. ä.
- **ZIP-Export:** serverseitig (Cloud Function) oder clientseitig via `jszip` für kleine Mengen.
- **Fonts:** Google Fonts — Instrument Serif, DM Sans, DM Mono.

**Aufwand (aus Analyse):** schlanker MVP für 1 Person ~1–3 Wochen Vollzeit; mit Polishing,
Tests und sauberem Deployment ~3–5 Wochen.

---

## 10. Empfohlene Bau-Reihenfolge

1. Projekt-Setup (React+Vite PWA, Firebase-Projekt, Fonts, `styles.css`-Tokens übernehmen).
2. Datenmodell + Security Rules (Firestore, Storage) anlegen.
3. **Gäste-Flow** (Welcome → Sucher → Done) mit lokalem State — Design pixelgenau nach §4.1.
   Referenz-Logik: `prototype.js`.
4. Upload + Kompression + Firestore/Storage-Anbindung; Session-/Limit-Logik.
5. **Admin-Auth + Dashboard** (Grid, Status-Filter, Freigeben/Ablehnen/Löschen) — §4.4.
6. **Onboarding** (Event anlegen → Slug/QR) — §4.3.
7. ZIP-Export.
8. Cross-Device-Tests (iOS/Android Kamera), Fehler-/Ladezustände, PWA-Manifest.
9. (Optional) Stil-Varianten B/C hinter Feature-Flag, falls gewünscht.

---

## 11. Dateien in diesem Bundle

Design-Referenzen (in HTML gebaut — Aussehen & Verhalten, **nicht** direkt shippen):

- `Knipsmoment Konzept.html` — Konzept-Seite + **klickbarer Gäste-Prototyp** (beste Referenz fürs Verhalten).
- `Knipsmoment Screens.html` — alle Screens als isolierte Frames nebeneinander.
- `styles.css` — **Design-Tokens als CSS-Variablen** (direkt übernehmbar) + Grundtypografie.
- `components.css` — Komponenten-Styles (Phone, Sucher, Admin, Onboarding) als Referenz.
- `page.css` — Layout der Konzept-Seite (für den Bau der App nachrangig).
- `prototype.js` — **Referenz-Implementierung der Gäste-State-Machine** (welcome/cam/done, Auslösen, Zähler).
- `page.js` — Admin-Grid- & QR-Mock-Logik (Referenz).
- `screens/*.png` — pixelgenaue Screenshots aller 10 Views.

> Beim Nachbauen: Tokens aus `styles.css` übernehmen, Verhalten aus `prototype.js` ableiten,
> Maße/Copy aus §3–§4 dieses Dokuments. Die HTML-Dateien sind Referenz, nicht Ziel-Code.
