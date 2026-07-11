import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import QRCode from 'qrcode'
import { db } from '../lib/firebase'
import {
  PHOTO_LIMIT_DEFAULT,
  PHOTO_LIMIT_MAX,
  PHOTO_LIMIT_MIN,
  type CaptureMode,
  type GalleryVisibility,
  type GuestTheme,
} from '../types/models'

type Step = 'basics' | 'film' | 'qr'

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

/** "Lena & Jonas" + 12.07.2025 → "lj25" */
function baseSlug(coupleNames: string, date: string): string {
  const initials = coupleNames
    .split('&')
    .map((s) => s.trim().charAt(0).toLowerCase())
    .filter((c) => /[a-zà-ž]/.test(c))
    .join('')
  const yy = date ? String(new Date(date).getFullYear() % 100).padStart(2, '0') : ''
  return `${initials}${yy}`.padEnd(3, 'x')
}

async function freeSlug(base: string): Promise<string> {
  let candidate = base
  for (;;) {
    const snap = await getDocs(
      query(collection(db!, 'events'), where('slug', '==', candidate), limit(1)),
    )
    if (snap.empty) return candidate
    candidate = `${base}-${Math.random().toString(36).slice(2, 5)}`
  }
}

/** Onboarding Brautpaar: Eckdaten → Filmrolle → QR (§4.3) */
export function Onboarding({
  adminUid,
  onDone,
}: {
  adminUid: string
  onDone: () => void
}) {
  const [step, setStep] = useState<Step>('basics')

  // Schritt 1 — Eckdaten
  const [coupleNames, setCoupleNames] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')

  // Schritt 2 — Filmrolle / Regeln
  const [photoLimit, setPhotoLimit] = useState(PHOTO_LIMIT_DEFAULT)
  const [captureMode, setCaptureMode] = useState<CaptureMode>('both')
  const [galleryVisible, setGalleryVisible] = useState<GalleryVisibility>('after_approval')
  const [theme, setTheme] = useState<GuestTheme>('finder')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState('')

  function submitBasics(e: FormEvent) {
    e.preventDefault()
    setStep('film')
  }

  async function createEvent() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const s = await freeSlug(baseSlug(coupleNames, date))
      // Doc-ID = Slug: lesbare URLs, ein Lookup weniger
      await setDoc(doc(db!, 'events', s), {
        coupleNames: coupleNames.trim(),
        date: Timestamp.fromDate(new Date(date)),
        location: location.trim(),
        photoLimit,
        captureMode,
        galleryVisible,
        theme,
        slug: s,
        createdAt: serverTimestamp(),
        adminUid,
      })
      setSlug(s)
      setStep('qr')
    } catch {
      setError('Anlegen fehlgeschlagen — Verbindung prüfen und nochmal versuchen.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'basics') {
    return (
      <div className="onb">
        <span className="eyebrow">Neue Hochzeit</span>
        <h3>Eure Eckdaten</h3>
        <form onSubmit={submitBasics}>
          <div className="field">
            <label htmlFor="onb-couple">Brautpaar</label>
            <input
              id="onb-couple"
              className="inp serif"
              placeholder="Lena & Jonas"
              required
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="onb-date">Datum</label>
            <input
              id="onb-date"
              className="inp"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="onb-location">Location</label>
            <input
              id="onb-location"
              className="inp"
              placeholder="Gutshof Ahrenberg"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Weiter →
          </button>
        </form>
      </div>
    )
  }

  if (step === 'film') {
    return (
      <div className="onb">
        <span className="eyebrow">Die Filmrolle</span>
        <h3>Wie viele Bilder?</h3>

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

        <div className="field" style={{ marginTop: 26 }}>
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

        {error && <p className="login-error">{error}</p>}

        <button type="button" className="btn btn-primary" disabled={busy} onClick={createEvent}>
          QR erstellen →
        </button>
        <button type="button" className="login-switch" onClick={() => setStep('basics')}>
          ← Zurück
        </button>
      </div>
    )
  }

  return <QrStep slug={slug} onDone={onDone} />
}

function QrStep({ slug, onDone }: { slug: string; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const guestUrl = `${window.location.origin}/l/${slug}`
  const displayUrl = `${window.location.host}/l/${slug}`
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    void QRCode.toCanvas(canvasRef.current, guestUrl, {
      width: 150,
      margin: 0,
      color: { dark: '#2A2822', light: '#ffffff' },
    })
  }, [guestUrl])

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Knipsmoment', url: guestUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(guestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="onb qr-step">
      <div className="seal" aria-hidden="true">✦</div>
      <h3>Eure Kamera ist bereit!</h3>
      <p className="qr-sub">Auf den Tischen aufstellen — Gäste scannen einfach.</p>
      <div className="qr-box">
        <canvas ref={canvasRef} width={150} height={150} />
      </div>
      <span className="datestamp qr-url">{displayUrl}</span>
      <div className="qr-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          ↧ PDF drucken
        </button>
        <button type="button" className="btn btn-ghost" onClick={share}>
          {copied ? 'Link kopiert ✓' : 'Teilen'}
        </button>
      </div>
      <button type="button" className="login-switch" onClick={onDone}>
        Zum Dashboard →
      </button>
    </div>
  )
}
