import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import type { CaptureMode } from '../types/models'
import type { QueueSummary } from './useUploadQueue'
import { useOnline } from '../lib/useOnline'

const TOAST_MS = 1300
const STRIP_MAX = 7

/**
 * Nativer Kamera-/Galerie-Zugriff über das Capacitor-Camera-Plugin.
 * Liefert null, wenn der Gast abbricht oder die Berechtigung verweigert.
 */
async function nativePhoto(source: CameraSource): Promise<File | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source,
      quality: 90,
      correctOrientation: true,
    })
    if (!photo.webPath) return null
    const blob = await fetch(photo.webPath).then((r) => r.blob())
    return new File([blob], `knips-${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg',
    })
  } catch {
    return null
  }
}

/**
 * Screen B — Sucher / Kamera (§4.1, `02-gast-sucher.png`).
 * Der Sucher zeigt ein Live-Bild der Rückkamera (getUserMedia) direkt unter
 * dem Overlay; der Auslöser friert einen Video-Frame ein. Wo kein Live-Stream
 * möglich ist (Berechtigung verweigert, kein Secure Context, keine Kamera),
 * fällt der Auslöser auf Capacitor-Camera bzw. `<input capture>` zurück.
 * „AUS GALERIE" öffnet den Picker. Beides verbraucht ein Bild (§5).
 */
export function CameraScreen({
  active,
  limit,
  taken,
  dateLabel,
  captureMode,
  shots,
  upload,
  onPhoto,
  onRetryUpload,
}: {
  active: boolean
  limit: number
  taken: number
  dateLabel: string
  captureMode: CaptureMode
  shots: string[]
  upload: QueueSummary
  onPhoto: (file: File) => void
  onRetryUpload: () => void
}) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const remaining = limit - taken
  const online = useOnline()

  // Live-Sucher: Rückkamera nur starten, solange dieser Screen aktiv ist,
  // und beim Verlassen wieder freigeben (Kamera-LED aus).
  useEffect(() => {
    if (!active) return
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        if (!stream) return
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setLive(true)
      } catch {
        // Berechtigung verweigert / keine Kamera / kein Secure Context →
        // Sucher bleibt Platzhalter, Auslöser nutzt den Fallback-Pfad
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setLive(false)
    }
  }, [active])

  function acceptPhoto(file: File) {
    if (remaining <= 0) return

    onPhoto(file)
    setFlashKey((k) => k + 1)

    const n = taken + 1
    setToast({ text: `Bild ${n} von ${limit} gesichert`, visible: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_MS,
    )
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) acceptPhoto(file)
  }

  /** Frame aus dem Live-Stream einfrieren */
  async function snapFromStream(): Promise<File | null> {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92))
    return blob ? new File([blob], `knips-${Date.now()}.jpg`, { type: 'image/jpeg' }) : null
  }

  // Reihenfolge Auslöser: Live-Stream → Capacitor-Plugin (nativ) → <input capture>
  async function capture(source: 'camera' | 'gallery') {
    if (source === 'camera' && live) {
      const file = await snapFromStream()
      if (file) {
        acceptPhoto(file)
        return
      }
    }
    if (Capacitor.isNativePlatform()) {
      const file = await nativePhoto(
        source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      )
      if (file) acceptPhoto(file)
    } else {
      const input = source === 'camera' ? cameraInput : galleryInput
      input.current?.click()
    }
  }

  // Modus 'upload' (§4.3): der Auslöser öffnet den Picker statt der Kamera
  const shutterSource = captureMode === 'upload' ? 'gallery' : 'camera'

  const stripShots = shots.slice(-STRIP_MAX)
  // Nach Reload liegen keine Object-URLs mehr vor — Platzhalter-Frames auffüllen
  const stripPlaceholders = Math.max(0, Math.min(taken, STRIP_MAX) - stripShots.length)

  return (
    <div className="screen-body">
      <div className="viewfinder">
        <div className="vf-scene">[ euer moment ]</div>
        <video
          ref={videoRef}
          className={`vf-video ${live ? 'on' : ''}`}
          autoPlay
          playsInline
          muted
        />
        <div className="vf-frame vf-brackets" aria-hidden="true">
          <i />
        </div>
        <div className="vf-cross" aria-hidden="true" />
        <div className="vf-top">
          <span className="vf-counter" aria-live="polite">
            NOCH <b>{remaining}</b> {remaining === 1 ? 'BILD' : 'BILDER'}
          </span>
          <span className="vf-rec">
            <i /> AUTO
          </span>
        </div>
        <span className="vf-date datestamp">{dateLabel.replace(/\s/g, '')}</span>

        {/* Upload-Zustand: offline / sichern läuft / Fehler mit Retry (§8) */}
        {!online && (upload.failed > 0 || upload.pending > 0) ? (
          <span className="vf-upload">
            ○ OFFLINE · {upload.failed + upload.pending}{' '}
            {upload.failed + upload.pending === 1 ? 'BILD WARTET' : 'BILDER WARTEN'}
          </span>
        ) : upload.failed > 0 ? (
          <button type="button" className="vf-upload error" onClick={onRetryUpload}>
            ⚠ {upload.failed} NICHT GESICHERT · ERNEUT
          </button>
        ) : upload.pending > 0 ? (
          <span className="vf-upload">
            ↑ SICHERT {upload.pending > 1 ? `${upload.pending} BILDER` : ''}…
          </span>
        ) : null}

        <div className="vf-strip">
          {Array.from({ length: stripPlaceholders }).map((_, i) => (
            <div key={`ph-${i}`} className="frame static" />
          ))}
          {stripShots.map((url) => (
            <div key={url} className="frame" style={{ backgroundImage: `url(${url})` }} />
          ))}
        </div>
        {flashKey > 0 && <div key={flashKey} className="vf-flash fire" />}
        <div className={`cam-toast ${toast.visible ? 'show' : ''}`} role="status">
          {toast.text}
        </div>
      </div>

      <div className="cam-controls">
        <div className="side left">
          {captureMode !== 'finder' && (
            <button
              type="button"
              className="upload-btn"
              onClick={() => void capture('gallery')}
              disabled={remaining <= 0}
            >
              AUS
              <br />
              GALERIE
            </button>
          )}
        </div>
        <button
          type="button"
          className="shutter"
          aria-label="Auslösen"
          onClick={() => void capture(shutterSource)}
          disabled={remaining <= 0}
        />
        <div className="side right">
          <span className="cam-hint">
            TIPP
            <br />
            HALTEN &amp;
            <br />
            RUHIG
          </span>
        </div>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  )
}
