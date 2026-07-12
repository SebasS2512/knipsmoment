import { useCallback, useState } from 'react'
import { pickChallenges } from '../lib/challenges'

const PER_GUEST = 2

/**
 * Teilt jedem Gast 1–2 Foto-Aufgaben zufällig zu (aus den im Onboarding
 * aktivierten). Die Zuteilung bleibt pro Gerät/Session stabil (localStorage);
 * beim „Noch jemand?"-Reset zieht der nächste Gast neue Aufgaben.
 */
export function useChallenges(eventId: string, available: string[]) {
  const storageKey = `km:${eventId}:challenges`

  const [assigned, setAssigned] = useState<string[]>(() => {
    if (available.length === 0) return []
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      // nur übernehmen, was es (noch) gibt — Event-Aufgaben könnten sich ändern
      if (Array.isArray(stored)) {
        const valid = stored.filter((c) => available.includes(c))
        if (valid.length > 0) return valid
      }
    } catch {
      // kaputter Eintrag → neu ziehen
    }
    const fresh = pickChallenges(available, PER_GUEST)
    localStorage.setItem(storageKey, JSON.stringify(fresh))
    return fresh
  })
  const [index, setIndex] = useState(0)

  /** aktuell angezeigte Aufgabe (wird ans Foto getaggt) */
  const current: string | undefined = assigned[index]

  /** zwischen den zugeteilten Aufgaben umschalten */
  const next = useCallback(() => {
    setIndex((i) => (assigned.length > 0 ? (i + 1) % assigned.length : 0))
  }, [assigned.length])

  /** Reset für den nächsten Gast am selben Gerät */
  const reroll = useCallback(() => {
    localStorage.removeItem(storageKey)
    const fresh = pickChallenges(available, PER_GUEST)
    if (fresh.length > 0) localStorage.setItem(storageKey, JSON.stringify(fresh))
    setAssigned(fresh)
    setIndex(0)
  }, [storageKey, available])

  return { assigned, current, next, reroll }
}
