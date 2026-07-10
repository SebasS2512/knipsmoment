import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query, where, type Timestamp } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { CaptureMode } from '../types/models'
import type { GuestEventConfig } from '../guest/GuestFlow'

/** Demo-Event für lokale Entwicklung ohne Slug (Root-URL) */
export const DEMO_EVENT: GuestEventConfig = {
  id: 'demo',
  coupleNames: 'Lena & Jonas',
  dateLabel: '12 · 07 · 25',
  photoLimit: 10,
  captureMode: 'both',
}

/** "12 · 07 · 25" aus einem Firestore-Timestamp */
function formatDateLabel(date: Timestamp): string {
  const d = date.toDate()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  return `${dd} · ${mm} · ${yy}`
}

/** Slug aus der Gäste-URL: knipsmoment.app/l/{slug} */
export function slugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/l\/([\w-]+)\/?$/)
  return m ? m[1] : null
}

export type EventState =
  | { status: 'loading' }
  | { status: 'ready'; event: GuestEventConfig }
  | { status: 'not_found' }

/**
 * Event über den QR-/URL-Slug aus Firestore laden.
 * Ohne Slug (oder ohne Firebase-Config) läuft das Demo-Event.
 */
export function useEvent(): EventState {
  const [state, setState] = useState<EventState>({ status: 'loading' })

  useEffect(() => {
    const slug = slugFromPath(window.location.pathname)
    if (!slug || !isFirebaseConfigured || !db) {
      setState({ status: 'ready', event: DEMO_EVENT })
      return
    }

    let cancelled = false
    getDocs(query(collection(db, 'events'), where('slug', '==', slug), limit(1)))
      .then((snap) => {
        if (cancelled) return
        const doc = snap.docs[0]
        if (!doc) {
          setState({ status: 'not_found' })
          return
        }
        const data = doc.data()
        setState({
          status: 'ready',
          event: {
            id: doc.id,
            coupleNames: data.coupleNames as string,
            dateLabel: formatDateLabel(data.date as Timestamp),
            photoLimit: data.photoLimit as number,
            captureMode: (data.captureMode as CaptureMode) ?? 'both',
          },
        })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'not_found' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
