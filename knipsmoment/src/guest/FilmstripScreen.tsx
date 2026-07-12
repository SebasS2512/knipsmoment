import type { CaptureMode } from '../types/models'
import type { QueueSummary } from './useUploadQueue'
import { useShutter } from './useShutter'
import { UploadStatus } from './UploadStatus'
import { ChallengeChip } from './ChallengeChip'

/**
 * Variante C — „Der Filmstreifen" (§4.2, `06-variante-c-filmstreifen.png`).
 * Perforations-Schienen links/rechts rahmen den Screen, großes Serif-
 * „Noch 7 Bilder", zentriertes Bild. Reduziert, grafisch, elegant.
 */
export function FilmstripScreen({
  limit,
  taken,
  captureMode,
  shots,
  upload,
  challenge,
  challengeCount,
  onNextChallenge,
  onPhoto,
  onRetryUpload,
}: {
  limit: number
  taken: number
  captureMode: CaptureMode
  shots: string[]
  upload: QueueSummary
  challenge?: string
  challengeCount: number
  onNextChallenge: () => void
  onPhoto: (file: File) => void
  onRetryUpload: () => void
}) {
  const { remaining, flashKey, toast, capture, handleFile, cameraInput, galleryInput } =
    useShutter({ limit, taken, onPhoto })

  const shutterSource = captureMode === 'upload' ? 'gallery' : 'camera'
  const lastShot = shots[shots.length - 1]

  return (
    <div className="screen-body var-c">
      <div className="vc-rail left" aria-hidden="true" />
      <div className="vc-rail right" aria-hidden="true" />
      <div className="vc-center">
        <div className="vc-kicker">Filmrolle · 36 ASA</div>
        <div
          className="ph vc-shot"
          style={lastShot ? { backgroundImage: `url(${lastShot})` } : undefined}
        >
          {!lastShot && 'euer moment'}
        </div>
        <div className="vc-count" aria-live="polite">
          Noch {remaining}
          <br />
          {remaining === 1 ? 'Bild' : 'Bilder'}
        </div>
        <ChallengeChip text={challenge} count={challengeCount} onNext={onNextChallenge} />
        <button
          type="button"
          className="btn btn-primary vc-shutter"
          onClick={() => void capture(shutterSource)}
          disabled={remaining <= 0}
        >
          ◉ Auslösen
        </button>
        {captureMode !== 'finder' && (
          <button
            type="button"
            className="vc-gallery"
            onClick={() => void capture('gallery')}
            disabled={remaining <= 0}
          >
            oder aus Galerie
          </button>
        )}

        <UploadStatus upload={upload} onRetry={onRetryUpload} />
      </div>

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
