import { useState } from 'react'
import { doc, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { CHALLENGE_SUGGESTIONS } from '../lib/challenges'
import {
  PHOTO_LIMIT_MAX,
  PHOTO_LIMIT_MIN,
  type CaptureMode,
  type GalleryVisibility,
  type GuestTheme,
} from '../types/models'
import type { AdminEvent } from './AdminApp'

const CAPTURE_OPTIONS: { key: CaptureMode; label: string }[] = [
  { key: 'finder', label: 'Sucher' },
  { key: 'upload', label: 'Upload' },
  { key: 'both', label: 'Beide' },
]
const GALLERY_OPTIONS: { key: GalleryVisibility; label: string }[] = [
  { key: 'immediate', label: 'Ja' },
  { key: 'after_approval', label: 'Erst nach Freigabe' },
]
const THEME_OPTIONS: { key: GuestTheme; label: string }[] = [
  { key: 'finder', label: 'Sucher' },
  { key: 'polaroid', label: 'Polaroid' },
  { key: 'filmstrip', label: 'Filmstreifen' },
]

/**
 * Event bearbeiten: Eckdaten, Filmrollen-Regeln, Stil und Foto-Aufgaben
 * nachträglich ändern. Der Slug (und damit QR/Link) bleibt unverändert.
 */
export function EventSettings({
  event,
  onClose,
}: {
  event: AdminEvent
  onClose: (saved: boolean) => void
}) {
  const [coupleNames, setCoupleNames] = useState(event.coupleNames)
  const [date, setDate] = useState(event.dateISO)
  const [location, setLocation] = useState(event.location)
  const [photoLimit, setPhotoLimit] = useState(event.photoLimit)
  const [captureMode, setCaptureMode] = useState<CaptureMode>(event.captureMode)
  const [galleryVisible, setGalleryVisible] = useState<GalleryVisibility>(
    event.galleryVisible,
  )
  const [theme, setTheme] = useState<GuestTheme>(event.theme)

  const initialCustoms = event.challenges.filter((c) => !CHALLENGE_SUGGESTIONS.includes(c))
  const [challengesEnabled, setChallengesEnabled] = useState(event.challenges.length > 0)
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(
    () =>
      new Set(
        event.challenges.length > 0
          ? CHALLENGE_SUGGESTIONS.filter((c) => event.challenges.includes(c))
          : CHALLENGE_SUGGESTIONS,
      ),
  )
  const [customChallenges, setCustomChallenges] = useState<string[]>(initialCustoms)
  const [customInput, setCustomInput] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const guestUrl = `${window.location.origin}/l/${event.slug}`

  function toggleChallenge(c: string) {
    setSelectedChallenges((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  function addCustomChallenge() {
    const text = customInput.trim()
    if (!text) return
    if (!customChallenges.includes(text)) setCustomChallenges((l) => [...l, text])
    setCustomInput('')
  }

  async function save() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const challenges = challengesEnabled
        ? [
            ...CHALLENGE_SUGGESTIONS.filter((c) => selectedChallenges.has(c)),
            ...customChallenges,
          ]
        : []
      await updateDoc(doc(db!, 'events', event.id), {
        coupleNames: coupleNames.trim(),
        date: Timestamp.fromDate(new Date(date)),
        location: location.trim(),
        photoLimit,
        captureMode,
        galleryVisible,
        theme,
        challenges,
      })
      onClose(true)
    } catch {
      setError('Speichern fehlgeschlagen — Verbindung prüfen und nochmal versuchen.')
      setBusy(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(guestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard nicht verfügbar (http) — URL steht ja sichtbar da
    }
  }

  return (
    <div className="onb scroll">
      <span className="eyebrow">Event bearbeiten</span>
      <h3>{event.coupleNames}</h3>

      <div className="field">
        <label htmlFor="set-couple">Brautpaar</label>
        <input
          id="set-couple"
          className="inp serif"
          required
          value={coupleNames}
          onChange={(e) => setCoupleNames(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="set-date">Datum</label>
        <input
          id="set-date"
          className="inp"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="set-location">Location</label>
        <input
          id="set-location"
          className="inp"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Bilder pro Gerät</label>
        <div className="limit-row">
          <span className="big">{photoLimit}</span>
          <span className="u">Auslöser / Gerät</span>
        </div>
        <input
          type="range"
          className="limit-slider"
          min={PHOTO_LIMIT_MIN}
          max={PHOTO_LIMIT_MAX}
          value={photoLimit}
          style={{
            ['--fill' as string]: `${((photoLimit - PHOTO_LIMIT_MIN) / (PHOTO_LIMIT_MAX - PHOTO_LIMIT_MIN)) * 100}%`,
          }}
          onChange={(e) => setPhotoLimit(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Aufnahme-Modus</label>
        <div className="seg">
          {CAPTURE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`o ${captureMode === o.key ? 'on' : ''}`}
              onClick={() => setCaptureMode(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Galerie sofort sichtbar?</label>
        <div className="seg">
          {GALLERY_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`o ${galleryVisible === o.key ? 'on' : ''}`}
              onClick={() => setGalleryVisible(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Stil des Knips-Screens</label>
        <div className="seg">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`o ${theme === o.key ? 'on' : ''}`}
              onClick={() => setTheme(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Foto-Aufgaben</label>
        <div className="seg">
          <button
            type="button"
            className={`o ${challengesEnabled ? 'on' : ''}`}
            onClick={() => setChallengesEnabled(true)}
          >
            An
          </button>
          <button
            type="button"
            className={`o ${!challengesEnabled ? 'on' : ''}`}
            onClick={() => setChallengesEnabled(false)}
          >
            Aus
          </button>
        </div>
      </div>

      {challengesEnabled && (
        <>
          <div className="chk-list">
            {CHALLENGE_SUGGESTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chk ${selectedChallenges.has(c) ? 'on' : ''}`}
                onClick={() => toggleChallenge(c)}
              >
                <span className="box" aria-hidden="true" />
                {c}
              </button>
            ))}
            {customChallenges.map((c) => (
              <div key={c} className="chk on custom">
                <span className="box" aria-hidden="true" />
                {c}
                <button
                  type="button"
                  className="rm"
                  aria-label="Aufgabe entfernen"
                  onClick={() => setCustomChallenges((l) => l.filter((x) => x !== c))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="chk-add">
            <input
              className="inp"
              placeholder="Eigene Aufgabe …"
              maxLength={120}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomChallenge()
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost add"
              onClick={addCustomChallenge}
              disabled={!customInput.trim()}
            >
              +
            </button>
          </div>
        </>
      )}

      <div className="field">
        <label>Gäste-Link</label>
        <div className="linkrow">
          <span className="datestamp">{`${window.location.host}/l/${event.slug}`}</span>
          <button type="button" className="btn btn-ghost copy" onClick={copyLink}>
            {copied ? 'Kopiert ✓' : 'Kopieren'}
          </button>
        </div>
      </div>

      {error && <p className="login-error">{error}</p>}

      <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
        Speichern
      </button>
      <button type="button" className="login-switch" onClick={() => onClose(false)}>
        ← Zurück zum Dashboard
      </button>
    </div>
  )
}
