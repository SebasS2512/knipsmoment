/**
 * Foto-Aufgabe im Knips-Screen — eine Einladung, kein Zwang.
 * Erledigte Aufgaben blendet der Hook aus; bei mehreren offenen gibt es
 * einen eigenen, gut tippbaren Wechsel-Button.
 */
export function ChallengeChip({
  text,
  count,
  onNext,
}: {
  text?: string
  count: number
  onNext: () => void
}) {
  if (!text) return null
  return (
    <div className="challenge-box">
      <div className="challenge-chip">
        <span className="cc-label">Aufgabe</span>
        {text}
      </div>
      {count > 1 && (
        <button type="button" className="cc-switch" onClick={onNext}>
          ↻ Andere Aufgabe
        </button>
      )}
    </div>
  )
}
