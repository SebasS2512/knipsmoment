import { useCallback, useState } from 'react'
import { pickChallenges } from '../lib/challenges'

const PER_GUEST = 2

/**
 * Teilt jedem Gast 1–2 Foto-Aufgaben zufällig zu (aus den im Onboarding
 * aktivierten). Die Zuteilung bleibt pro Gerät/Session stabil (localStorage);
 * erledigte Aufgaben (Foto damit gemacht) werden nicht mehr eingeblendet;
 * beim „Noch jemand?"-Reset zieht der nächste Gast neue Aufgaben.
 */
export function useChallenges(eventId: string, available: string[]) {
  const assignedKey = `km:${eventId}:challenges`
  const doneKey = `km:${eventId}:challengesDone`

  const readList = (key: string): string[] => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(stored) ? stored.filter((c) => typeof c === 'string') : []
    } catch {
      return []
    }
  }

  const [assigned, setAssigned] = useState<string[]>(() => {
    if (available.length === 0) return []
    // nur übernehmen, was es (noch) gibt — Event-Aufgaben könnten sich ändern
    const valid = readList(assignedKey).filter((c) => available.includes(c))
    if (valid.length > 0) return valid
    const fresh = pickChallenges(available, PER_GUEST)
    localStorage.setItem(assignedKey, JSON.stringify(fresh))
    return fresh
  })
  const [done, setDone] = useState<string[]>(() => readList(doneKey))
  const [index, setIndex] = useState(0)

  /** noch offene (nicht erledigte) Aufgaben */
  const open = assigned.filter((c) => !done.includes(c))

  /** aktuell angezeigte Aufgabe (wird ans Foto getaggt) */
  const current: string | undefined = open[index % Math.max(1, open.length)]

  /** zwischen den offenen Aufgaben umschalten */
  const next = useCallback(() => {
    setIndex((i) => i + 1)
  }, [])

  /** Aufgabe als erledigt markieren (Foto damit gemacht) → nicht mehr zeigen */
  const markDone = useCallback(
    (challenge: string) => {
      setDone((prev) => {
        if (prev.includes(challenge)) return prev
        const nextDone = [...prev, challenge]
        localStorage.setItem(doneKey, JSON.stringify(nextDone))
        return nextDone
      })
      setIndex(0)
    },
    [doneKey],
  )

  /** Reset für den nächsten Gast am selben Gerät */
  const reroll = useCallback(() => {
    localStorage.removeItem(assignedKey)
    localStorage.removeItem(doneKey)
    const fresh = pickChallenges(available, PER_GUEST)
    if (fresh.length > 0) localStorage.setItem(assignedKey, JSON.stringify(fresh))
    setAssigned(fresh)
    setDone([])
    setIndex(0)
  }, [assignedKey, doneKey, available])

  return { assigned, open, current, next, markDone, reroll }
}
