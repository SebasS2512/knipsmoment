import type { GuestEventConfig } from './GuestFlow'

/** Screen A — Welcome (§4.1, `01-gast-welcome.png`) */
export function WelcomeScreen({
  event,
  guestName,
  onGuestName,
  onStart,
}: {
  event: GuestEventConfig
  guestName: string
  onGuestName: (name: string) => void
  onStart: () => void
}) {
  const [nameA = '', nameB = ''] = event.coupleNames.split('&').map((s) => s.trim())

  return (
    <div className="screen-body welcome">
      {/* CSS-Einwegkamera-Illustration — rein CSS, keine Bilddatei */}
      <div className="cam-illus" aria-hidden="true">
        <div className="cam-body" />
        <div className="cam-lens" />
        <div className="cam-flash" />
        <div className="cam-wind" />
        <div className="cam-finder" />
      </div>

      <div className="kicker">Eure Einwegkamera</div>
      <h1>
        {nameA}
        <span className="amp"> &amp; </span>
        {nameB}
      </h1>
      <div className="date">{event.dateLabel}</div>
      <p className="blurb">
        Haltet den Tag fest, wie ihr ihn seht. {event.photoLimit} Bilder — mehr hat
        eure Filmrolle nicht. Also: gut zielen!
      </p>
      <div className="count-pill">
        <span>◉</span> {event.photoLimit} Bilder frei
      </div>
      <input
        className="guest-name"
        type="text"
        placeholder="Wer knipst da? (optional)"
        maxLength={40}
        value={guestName}
        onChange={(e) => onGuestName(e.target.value)}
      />
      <button type="button" className="btn btn-amber start-btn" onClick={onStart}>
        Filmrolle einlegen →
      </button>
    </div>
  )
}
