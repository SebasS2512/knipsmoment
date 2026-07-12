/**
 * Foto-Aufgabe im Knips-Screen — eine Einladung, kein Zwang.
 * Bei zwei zugeteilten Aufgaben schaltet ein Tap um.
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
  const switchable = count > 1
  return (
    <button
      type="button"
      className="challenge-chip"
      onClick={switchable ? onNext : undefined}
      disabled={!switchable}
    >
      <span className="cc-label">Aufgabe{switchable ? ' · tippen zum Wechseln ↻' : ''}</span>
      {text}
    </button>
  )
}
