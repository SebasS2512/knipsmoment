import { useEffect, useRef, useState } from 'react'
import type { CaptureMode } from '../types/models'
import type { QueueSummary } from './useUploadQueue'
import { useShutter } from './useShutter'
import { ChallengeChip } from './ChallengeChip'
import { useOnline } from '../lib/useOnline'

const STRIP_MAX = 7

/**
 * Variante A — „Der Sucher" (§4.1/§4.2, `02-gast-sucher.png`).
 * Zeigt die Rückkamera live (getUserMedia) unter dem Overlay; der Auslöser
 * friert einen Video-Frame ein. Ohne Live-Stream greift die Kaskade aus
 * useShutter (Capacitor-Camera → <input capture>).
 */
export function CameraScreen({
  active,
  limit,
  taken,
  dateLabel,
  captureMode,
  shots,
  upload,
  challenge,
  challengeCount,
  onNextChallenge,
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
  challenge?: string
  challengeCount: number
  onNextChallenge: () => void
  onPhoto: (file: File) => void
  onRetryUpload: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
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

  const { remaining, flashKey, toast, capture, handleFile, cameraInput, galleryInput } =
    useShutter({ limit, taken, onPhoto, snapLive: live ? snapFromStream : undefined })

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

        {/* Foto-Aufgabe (falls im Onboarding aktiviert) */}
        <div className="vf-challenge">
          <ChallengeChip text={challenge} count={challengeCount} onNext={onNextChallenge} />
        </div>

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
