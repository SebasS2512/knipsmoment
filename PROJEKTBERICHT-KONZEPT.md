# Konzept Projektbericht — „Knipsmoment"

> Prüfungsleistung Webanwendungen SoSe 2026 (Dozent: B. Plutka).
> Umfang: min. 6 Seiten pro Person. Dieses Konzept gliedert den Bericht und
> gibt pro Kapitel Stichpunkte. Kursiv = offene Punkte, die vor der Abgabe
> noch erledigt werden müssen.

---

## ⚠ Vorab: Abgleich mit den Anforderungen

| Anforderung | Status |
|---|---|
| Framework (React/Ionic/Vue/…) | ✅ React + Vite + TypeScript |
| Externe Daten aus einer API | ✅ Firebase (Firestore + Storage + Auth) — Cloud-APIs über SDK |
| Telefondaten/Gerätefunktionen | ✅ Kamera — *aktuell `<input capture>`, sollte auf Capacitor-Camera-Plugin umgestellt werden* |
| **Native App mit Capacitor** | ❌ *FEHLT NOCH — muss eingebaut werden (cap init, android/ios-Projekt, Build aufs Gerät)* |
| KI-Kennzeichnung | 🔶 Git-Historie vorhanden; Kennzeichnungskonzept siehe unten — *vorab mit Dozent klären!* |

---

## Gliederung mit Stichpunkten

### Deckblatt
- Titel: „Knipsmoment — die digitale Einwegkamera für Hochzeiten"
- Name(n), Matrikelnummer(n), Studiengang, Veranstaltung, Dozent, Semester, Abgabedatum
- App-Icon / Screenshot als Blickfang

### Inhaltsverzeichnis
- automatisch generieren (Word/LaTeX)

### 1. Einleitung & Idee (ca. 1 Seite)
- Ausgangspunkt: analoge Einwegkameras auf Hochzeiten — charmant, aber teuer,
  begrenzte Qualität, Entwicklung dauert Wochen
- Idee: Web-App ersetzt die Einwegkamera — QR-Code auf dem Tisch, Gäste knipsen
  ohne Login, begrenzte „Filmrolle" (Standard 10 Bilder) erhält den Charme des Limits
- Zielgruppe: Brautpaare (Admin) + Hochzeitsgäste (alle Altersgruppen → keine
  Installation, keine Registrierung, große Bedienelemente)
- Abgrenzung: bewusst schlankes MVP — keine Gäste-Accounts, keine Live-Galerie,
  keine Kommentare (Verweis auf Konzeptphase)

### 2. Anforderungen & Konzeption (ca. 1–1,5 Seiten)
- Drei Nutzerkontexte: Gast (mobil, anonym) / Brautpaar (Onboarding + Dashboard) /
  System (Upload, Kompression, Statusverwaltung)
- User-Flow-Diagramm: welcome → cam → done; Foto: pending → approved/rejected
- Funktionsumfang V1 als Tabelle (bauen vs. bewusst weggelassen)
- Design-Konzept: „analoger Retro-Filmlook" — warmes Creme + Salbeigrün,
  Film-Korn-Overlay, Datums-Stempel wie bei 90er-Kameras, Design-Tokens
- **Bilder:** Mockups aus dem Design-Handoff + finale Screenshots gegenüberstellen
  (zeigt gestalterische Qualität → 5 % der Note)

### 3. Eingesetzte Technologien (ca. 1 Seite)
- Frontend: React 19 + Vite + TypeScript — warum: Komponentenmodell,
  Typsicherheit, schnelles Tooling
- **Capacitor**: Web-App → native Android-/iOS-App; Camera-Plugin für den Auslöser
  *(einbauen + hier beschreiben: Projektstruktur, Bridge-Konzept, Plugins)*
- Backend as a Service: Firebase — Firestore (Datenbank), Storage (Bilder),
  Auth (Admin-Login); Security Rules als serverseitige Zugriffskontrolle
- Erweiterte Technik (→ 10 % der Note, hier auflisten!):
  - `browser-image-compression` (clientseitige Bildkompression im Web Worker)
  - `jszip` (ZIP-Export im Browser)
  - `qrcode` (QR-Generierung)
  - `vite-plugin-pwa` / Workbox (Service Worker, Offline-Fähigkeit)
  - Code-Splitting mit React.lazy
- kurze Begründung je Technologie statt reiner Aufzählung

### 4. Aufbau der App (ca. 1,5–2 Seiten)
- Architekturdiagramm: Client (Gast/Admin) ↔ Firebase-Dienste
- Routing: `/l/{slug}` (Gäste über QR), `/admin` (Dashboard), `/` (Landing)
- Gäste-Flow als State-Machine (welcome/cam/done) + localStorage-Persistenz
  (Session-ID, Zählerstand, aktueller Screen — Reload-sicher)
- Datenmodell: `events/{id}` + `events/{id}/photos/{id}` mit Feldern (Tabelle)
- Security-Rules-Konzept: anonyme Gäste dürfen NUR pending-Fotos anlegen;
  sichten/freigeben/löschen nur der Event-Admin (`adminUid`)
- Admin-Dashboard: Live-Updates über Firestore `onSnapshot` (Realtime-Listener)
- Screenshots aller Screens mit kurzen Bildunterschriften

### 5. Technischer Aspekt im Detail (Pflichtkapitel, ca. 1 Seite)
**Empfehlung: die Upload-Pipeline** — schön erklärbar und umfasst mehrere Ebenen:
- Problem: Handy-Fotos sind 3–10 MB groß, Hochzeits-Locations haben schlechten Empfang
- Lösung: Kompression im Web Worker (max. 1920 px, ~0,8 MB, JPEG 82 %) →
  Upload in Cloud Storage → Firestore-Dokument mit `serverTimestamp()`
- Sequentielle Upload-Queue mit Zuständen (queued/uploading/done/error),
  manueller Retry + Auto-Retry beim `online`-Event
- Codeausschnitte mit Erläuterung, Ablaufdiagramm
- Alternative Themen, falls 2. Person: Security Rules ODER State-Machine + PWA/Service Worker

### 6. Technisches Problem & Lösung (Pflichtkapitel, ca. 1 Seite)
**Empfehlung: das CORS-Problem beim Foto-Download** — real passiert, gut dokumentierbar:
- Symptom: `<img>` zeigt die Bilder, aber `fetch()` für Download/ZIP-Export
  schlägt fehl (`ERR_FAILED`), keine Fehlermeldung im Code
- Analyse: Netzwerk-Trace → Preflight (OPTIONS) OK, aber die eigentliche Antwort
  ohne `Access-Control-Allow-Origin`; neue `*.firebasestorage.app`-Buckets
  liefern keine CORS-Header auf tokenisierte URLs
- Lösung zweigleisig: (1) Downloads über das SDK (`getBlob`, authentifiziert +
  preflighted) statt `fetch(downloadUrl)`; (2) einmalige CORS-Konfiguration auf
  dem Bucket über die Google-Cloud-Storage-JSON-API (eigenes Skript, da kein
  Google Cloud SDK installiert)
- Lerneffekt: Unterschied deklarativer CORS-Preflight vs. Response-Header;
  Browser-Sicherheitsmodell
- Alternativ/zusätzlich: „Foto-Limit ohne Login ist nie hart durchsetzbar" —
  Abwägung Session-ID vs. Einmal-Codes vs. Überengineering

### 7. Test & Qualitätssicherung (ca. 0,5–1 Seite)
- Manuelle Testfälle als Tabelle (Flow, Limit, Offline, Retry, Admin-Aktionen,
  ZIP, Onboarding, QR)
- Cross-Device-Tests: iOS Safari vs. Android Chrome (Kamera-Verhalten), Notch/Safe-Area
- *Kommilitonen-Test durchführen und Ergebnisse (gefundene Probleme + Fixes) dokumentieren*
- Build-/Type-Checks (tsc) als statische Qualitätssicherung

### 8. Fazit & Ausblick (ca. 0,5 Seite)
- Was hat funktioniert, was war schwerer als gedacht
- Ausblick: Stil-Varianten (Polaroid/Filmstreifen), Echtzeit-Galerie,
  Einmal-QR-Codes für hartes Limit, mehrere Events pro Konto
- persönliches Lernfazit (pro Person!)

### 9. Einsatz generativer KI (eigenes Kapitel — siehe unten)

### 10. Eigenständigkeitserklärung
- Standardformulierung der Hochschule + expliziter Verweis auf Kapitel 9

### Anhang
- Link zum GitHub-Repository (ggf. Dozent als Collaborator einladen, da privat)
- Installations-/Startanleitung (npm install, .env.local, npm run dev, Capacitor-Build)
- vollständige Screenshot-Galerie

---

## KI-Kennzeichnung — Empfehlung

**Grundsatz: lieber zu transparent als zu knapp.** Unklare Kennzeichnung = Fehlversuch.
Und: *Vor der Abgabe mit dem Dozenten klären, ob KI-generierter Code in diesem
Umfang zulässig ist* — die Aufgabenstellung verbietet KI nicht, verlangt aber
Kennzeichnung. Diese Absprache am besten schriftlich (Mail) festhalten.

### 1. Eigenes Kapitel „Einsatz generativer KI" im Bericht
Tabelle mit vier Spalten — Werkzeug / Einsatzzweck / betroffene Teile / Umfang:

| Werkzeug | Einsatzzweck | Betroffene Teile | Umfang |
|---|---|---|---|
| Claude Code (Anthropic, Modell Claude Fable 5) | Code-Generierung nach Design-Vorgabe | Gäste-Flow, Admin-Dashboard, Onboarding, Upload-Pipeline (`src/…`) | überwiegend KI-generiert, von mir geprüft, getestet u. angepasst |
| Claude Code | Architektur-/Technologieberatung | Datenmodell, Security Rules, Projektstruktur | gemeinsam erarbeitet |
| Claude Code | Debugging | CORS-Problem Storage-Downloads | Analyse durch KI, Lösung nachvollzogen |
| Claude Code | DevOps-Unterstützung | Firebase-Deployment, Git-Historie, GitHub-Setup | ausgeführt durch KI unter meiner Aufsicht |
| ggf. weitere (z. B. Bildgeneratoren) | … | … | … |

Dazu 2–3 Sätze Arbeitsweise: Design-Handoff als Vorgabe → KI-gestützte
Implementierung in Iterationen → jede Funktion selbst im Browser/auf dem Gerät
getestet → Code gelesen und verstanden (wichtig für die Präsentation!).

### 2. Kennzeichnung im Code selbst
- Die Git-Historie enthält bereits `Co-Authored-By: Claude` in jedem Commit —
  im Bericht explizit darauf hinweisen (nachprüfbare, ehrliche Dokumentation)
- Zusätzlich ein Hinweis-Block oben in der README des Repos: „Dieser Code wurde
  mit Unterstützung von Claude Code (Anthropic) entwickelt; Details im
  Projektbericht, Kapitel 9."

### 3. Kennzeichnung im Berichtstext
- Falls KI auch beim SCHREIBEN des Berichts hilft: pro Kapitel oder pauschal im
  KI-Kapitel angeben („Kapitel X wurde mit KI-Unterstützung formuliert und von
  mir inhaltlich geprüft/überarbeitet")
- Wichtig: Der Bericht sollte die EIGENE Leistung zeigen — eigene Formulierungen,
  eigenes Verständnis. KI höchstens für Korrektur/Struktur nutzen und das angeben.

### 4. Eigenständigkeitserklärung anpassen
Ergänzungssatz nach der Standardformel, z. B.:
> „Bei der Erstellung der Prüfungsleistung wurden generative KI-Werkzeuge
> eingesetzt. Art, Umfang und betroffene Teile sind in Kapitel 9 vollständig
> gekennzeichnet. Ich habe alle KI-generierten Inhalte geprüft und übernehme
> die volle Verantwortung für die Abgabe."

### 5. Für die Präsentation (25 % der Note!)
- Jede Zeile Code muss erklärbar sein — Rückfragen zu KI-generiertem Code sind
  wahrscheinlich. Empfehlung: die zwei Pflichtkapitel-Themen (Upload-Pipeline,
  CORS-Problem) so tief durchdringen, dass sie frei erklärt werden können.
- Den KI-Einsatz offensiv als Methodik präsentieren (eine Folie: Workflow,
  Prüfung, was selbst gemacht wurde) statt ihn zu verstecken.

---

## To-do-Liste bis zur Abgabe (14.09.2026)

1. **Capacitor integrieren** (Pflicht!): `npm i @capacitor/core @capacitor/cli`,
   `npx cap init`, `npx cap add android`, Kamera auf `@capacitor/camera` umstellen,
   Build auf echtem Gerät testen
2. Kommilitonen-Test durchführen + protokollieren
3. Testdaten aus Firebase entfernen
4. Bericht schreiben (Gliederung oben), Screenshots ziehen
5. Präsentation (ca. 10 min): App-Demo (live oder Video!), Technik, Herausforderungen
6. KI-Kennzeichnung mit Dozent absprechen (Mail)
7. Abgabe: Bericht-PDF + alle Projektdateien via NetCase
