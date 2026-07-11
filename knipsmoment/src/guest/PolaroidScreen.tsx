import type { CaptureMode } from '../types/models'
import type { QueueSummary } from './useUploadQueue'
import { useShutter } from './useShutter'
import { UploadStatus } from './UploadStatus'

/**
 * Variante B — „Das Polaroid" (§4.2, `05-variante-b-polaroid.png`).
 * Heller Screen (sage-mist); jeder Schnappschuss „fällt" als weißes
 * Sofortbild heraus, handschriftlicher Zähler im Polaroid-Fuß.
 */
export function PolaroidScreen({
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
  const { remaining, flashKey, toast, capture, handleFile, cameraInput, galleryInput } =
    useShutter({ limit, taken, onPhoto })

  const shutterSource = captureMode === 'upload' ? 'gallery' : 'camera'
  const lastShot = shots[shots.length - 1]

  return (
    <div className="screen-body polaroid">
      {/* key = taken: jedes Bild lässt ein frisches Polaroid „herausfallen" */}
      <div key={taken} className={`polaroid-cap ${taken > 0 ? 'drop' : ''}`}>
        <div
          className="ph"
          style={lastShot ? { backgroundImage: `url(${lastShot})` } : undefined}
        >
          {!lastShot && 'euer moment'}
        </div>
        <div className="pl-foot">
          <div className="hand">
            noch {remaining} von {limit}
          </div>
          <div className="d">{dateLabel.replace(/\s/g, '')}</div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-amber pl-shutter"
        onClick={() => void capture(shutterSource)}
        disabled={remaining <= 0}
      >
        Auslösen
      </button>
      {captureMode !== 'finder' && (
        <button
          type="button"
          className="pl-gallery"
          onClick={() => void capture('gallery')}
          disabled={remaining <= 0}
        >
          ODER AUS GALERIE
        </button>
      )}

      <UploadStatus upload={upload} onRetry={onRetryUpload} />

      {flashKey > 0 && <div key={flashKey} className="vf-flash fire" />}
      <div className={`cam-toast light ${toast.visible ? 'show' : ''}`} role="status">
        {toast.text}
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
