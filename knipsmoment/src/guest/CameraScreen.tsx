import { useRef, useState, type ChangeEvent } from 'react'
import type { CaptureMode } from '../types/models'
import type { QueueSummary } from './useUploadQueue'

const TOAST_MS = 1300
const STRIP_MAX = 7

/**
 * Screen B — Sucher / Kamera (§4.1, `02-gast-sucher.png`).
 * Auslöser öffnet die Geräte-Kamera (`<input capture>`), „AUS GALERIE" den
 * Datei-Picker. Beides verbraucht ein Bild (§5: Upload = Auslösen).
 */
export function CameraScreen({
  limit,
  taken,
  dateLabel,
  captureMode,
  shots,
  upload,
  onPhoto,
  onRetryUpload,
}: {
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
  const [flashKey, setFlashKey] = useState(0)
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const remaining = limit - taken

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || remaining <= 0) return

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

  // Modus 'upload' (§4.3): der Auslöser öffnet den Picker statt der Kamera
  const shutterInput = captureMode === 'upload' ? galleryInput : cameraInput

  const stripShots = shots.slice(-STRIP_MAX)
  // Nach Reload liegen keine Object-URLs mehr vor — Platzhalter-Frames auffüllen
  const stripPlaceholders = Math.max(0, Math.min(taken, STRIP_MAX) - stripShots.length)

  return (
    <div className="screen-body">
      <div className="viewfinder">
        <div className="vf-scene vf-brackets">
          <i />[ euer moment ]
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

        {/* Upload-Zustand: sichern läuft / Fehler mit Retry (§8) */}
        {upload.failed > 0 ? (
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
              onClick={() => galleryInput.current?.click()}
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
          onClick={() => shutterInput.current?.click()}
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
