import type { QueueSummary } from './useUploadQueue'
import { useOnline } from '../lib/useOnline'

/** Upload-Zustand (§8) für die hellen Stil-Varianten B/C */
export function UploadStatus({
  upload,
  onRetry,
}: {
  upload: QueueSummary
  onRetry: () => void
}) {
  const online = useOnline()
  const open = upload.failed + upload.pending

  if (!online && open > 0) {
    return (
      <span className="up-chip">
        ○ OFFLINE · {open} {open === 1 ? 'BILD WARTET' : 'BILDER WARTEN'}
      </span>
    )
  }
  if (upload.failed > 0) {
    return (
      <button type="button" className="up-chip error" onClick={onRetry}>
        ⚠ {upload.failed} NICHT GESICHERT · ERNEUT
      </button>
    )
  }
  if (upload.pending > 0) {
    return (
      <span className="up-chip">
        ↑ SICHERT {upload.pending > 1 ? `${upload.pending} BILDER` : ''}…
      </span>
    )
  }
  return null
}
