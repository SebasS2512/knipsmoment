import { useEffect, useRef, useState } from 'react'
import { getGuestSessionId, useGuestSession } from './useGuestSession'
import { useUploadQueue } from './useUploadQueue'
import { WelcomeScreen } from './WelcomeScreen'
import { CameraScreen } from './CameraScreen'
import { DoneScreen } from './DoneScreen'
import type { CaptureMode } from '../types/models'
import './guest.css'

export interface GuestEventConfig {
  id: string
  coupleNames: string // "Lena & Jonas"
  dateLabel: string   // "12 · 07 · 25"
  photoLimit: number
  captureMode: CaptureMode
}

/**
 * Gäste-Flow als State-Machine: welcome → cam → done (§4.1/§5).
 * done → Reset → welcome (nächster Gast am selben Gerät).
 */
export function GuestFlow({ event }: { event: GuestEventConfig }) {
  const { takenCount, setTakenCount, screen, setScreen } = useGuestSession(
    event.id,
    event.photoLimit,
  )
  const guestSessionId = getGuestSessionId()
  // Uploads laufen auch nach einem Reset weiter — bereits geknipste Bilder
  // des vorherigen Gasts dürfen nicht verloren gehen.
  const { enqueue, retryFailed, summary } = useUploadQueue(event.id, guestSessionId)

  // Optionaler Gastname (§7 V1) — pro Gerät gemerkt, wandert in jedes Foto-Dokument
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem('km:guestName') ?? '',
  )
  useEffect(() => {
    localStorage.setItem('km:guestName', guestName)
  }, [guestName])

  // Object-URLs der in dieser Sitzung geknipsten Bilder (für Streifen & Roll);
  // nach einem Reload zeigen die Frames wieder Platzhalter-Schraffur.
  const shotsRef = useRef<string[]>([])
  const remaining = event.photoLimit - takenCount

  useEffect(() => {
    if (screen === 'cam' && remaining <= 0) {
      const t = setTimeout(() => setScreen('done'), 900)
      return () => clearTimeout(t)
    }
  }, [screen, remaining, setScreen])

  function handlePhoto(file: File) {
    if (remaining <= 0) return
    shotsRef.current = [...shotsRef.current, URL.createObjectURL(file)]
    setTakenCount(takenCount + 1)
    enqueue(file, guestName)
  }

  function handleReset() {
    for (const url of shotsRef.current) URL.revokeObjectURL(url)
    shotsRef.current = []
    setTakenCount(0)
    setScreen('welcome')
  }

  return (
    <div className="guest-app" data-screen={screen}>
      <div className={`screen ${screen === 'welcome' ? 'active' : ''}`}>
        <WelcomeScreen
          event={event}
          guestName={guestName}
          onGuestName={setGuestName}
          onStart={() => setScreen('cam')}
        />
      </div>
      <div className={`screen cam ${screen === 'cam' ? 'active' : ''}`}>
        <CameraScreen
          limit={event.photoLimit}
          taken={takenCount}
          dateLabel={event.dateLabel}
          captureMode={event.captureMode}
          shots={shotsRef.current}
          upload={summary}
          onPhoto={handlePhoto}
          onRetryUpload={retryFailed}
        />
      </div>
      <div className={`screen ${screen === 'done' ? 'active' : ''}`}>
        <DoneScreen
          coupleNames={event.coupleNames}
          taken={takenCount}
          shots={shotsRef.current}
          upload={summary}
          onRetryUpload={retryFailed}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}
