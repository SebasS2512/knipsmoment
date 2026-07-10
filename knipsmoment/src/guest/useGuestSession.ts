import { useEffect, useState } from 'react'
import { randomId } from '../lib/id'
import type { GuestScreen } from '../types/models'

const SESSION_KEY = 'km:guestSessionId'

/** Anonyme Geräte-/Session-ID — einmal generiert, bleibt bestehen (§6) */
export function getGuestSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * Gäste-Session-State pro Event, in localStorage gespiegelt,
 * damit ein Reload den Flow nicht verliert (§6).
 * Das Limit bleibt eine Anzeige-Größe — der Server ist Source of Truth.
 */
export function useGuestSession(eventId: string, photoLimit: number) {
  const takenKey = `km:${eventId}:takenCount`
  const screenKey = `km:${eventId}:screen`

  const [takenCount, setTakenCount] = useState<number>(() => {
    const n = Number.parseInt(localStorage.getItem(takenKey) ?? '0', 10)
    return Number.isFinite(n) && n > 0 ? Math.min(n, photoLimit) : 0
  })

  const [screen, setScreen] = useState<GuestScreen>(() => {
    const s = localStorage.getItem(screenKey)
    return s === 'cam' || s === 'done' ? s : 'welcome'
  })

  useEffect(() => {
    localStorage.setItem(takenKey, String(takenCount))
  }, [takenKey, takenCount])

  useEffect(() => {
    localStorage.setItem(screenKey, screen)
  }, [screenKey, screen])

  return { takenCount, setTakenCount, screen, setScreen }
}
