import type { QueueSummary } from './useUploadQueue'

/** Screen C — Filmrolle voll / Fertig (§4.1, `03-gast-fertig.png`) */
export function DoneScreen({
  coupleNames,
  taken,
  shots,
  upload,
  onRetryUpload,
  onReset,
}: {
  coupleNames: string
  taken: number
  shots: string[]
  upload: QueueSummary
  onRetryUpload: () => void
  onReset: () => void
}) {
  return (
    <div className="screen-body done">
      <div className="seal" aria-hidden="true">
        ✦
      </div>
      <h2>
        Deine Filmrolle
        <br />
        ist voll!
      </h2>
      <p>
        Danke, dass du mitgeknipst hast.
        <br />
        {coupleNames} entwickeln eure Bilder
        <br />
        nach der Feier.
      </p>
      <div className="roll">
        {Array.from({ length: taken }).map((_, i) => (
          <div
            key={i}
            className="frame"
            style={shots[i] ? { backgroundImage: `url(${shots[i]})` } : undefined}
          />
        ))}
      </div>

      {/* Upload-Zustand: erst „fertig" melden, wenn wirklich alles gesichert ist (§8) */}
      {upload.failed > 0 ? (
        <button type="button" className="done-upload error" onClick={onRetryUpload}>
          ⚠ {upload.failed} {upload.failed === 1 ? 'Bild ist' : 'Bilder sind'} noch nicht
          gesichert — erneut versuchen
        </button>
      ) : upload.pending > 0 ? (
        <p className="done-upload">↑ Bilder werden gesichert …</p>
      ) : null}

      <button type="button" className="reset" onClick={onReset}>
        ↺ Noch jemand? Neu starten
      </button>
    </div>
  )
}
