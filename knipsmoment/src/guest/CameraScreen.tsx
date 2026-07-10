import { useRef, useState, type ChangeEvent } from 'react'
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
  const online = useOnline()

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

  // Nativ (Capacitor): Camera-Plugin. Web: verstecktes <input capture>/<input>.
  async function capture(source: 'camera' | 'gallery') {
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
