import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { collection, getDocs, limit, query, Timestamp, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { LoginScreen } from './LoginScreen'
import { Dashboard } from './Dashboard'
import { Onboarding } from './Onboarding'
import { EventSettings } from './EventSettings'
import type { CaptureMode, GalleryVisibility, GuestTheme } from '../types/models'
import './admin.css'

export interface AdminEvent {
  id: string
  coupleNames: string
  dateLabel: string // "12·07·2025"
  dateISO: string   // "2025-07-12" (für <input type=date>)
  location: string
  photoLimit: number
  captureMode: CaptureMode
  galleryVisible: GalleryVisibility
  theme: GuestTheme
  challenges: string[]
  slug: string
}

function formatAdminDate(date: Timestamp): string {
  const d = date.toDate()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}·${mm}·${d.getFullYear()}`
}

type EventState = 'loading' | 'none' | AdminEvent

/** Admin-Bereich: Auth-Gate → Event des Brautpaars laden → Dashboard (§4.4) */
export function AdminApp() {
  const { user, ready } = useAuth()

  if (!isFirebaseConfigured) {
    return (
      <div className="app-status">
        <span className="eyebrow">Knipsmoment · Admin</span>
        <h2>Firebase fehlt.</h2>
        <p>Config in `.env.local` eintragen (siehe README), dann neu laden.</p>
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="app-status">
        <span className="eyebrow">Knipsmoment · Admin</span>
        <p>Anmeldung wird geprüft …</p>
      </div>
    )
  }
  if (!user) return <LoginScreen />
  return <AdminEventGate user={user} />
}

function AdminEventGate({ user }: { user: User }) {
  const [state, setState] = useState<EventState>('loading')
  const [editing, setEditing] = useState(false)

  const loadEvent = useCallback(async () => {
    setState('loading')
    const snap = await getDocs(
      query(collection(db!, 'events'), where('adminUid', '==', user.uid), limit(1)),
    )
    const d = snap.docs[0]
    if (!d) {
      setState('none')
      return
    }
    const data = d.data()
    const date = (data.date as Timestamp).toDate()
    setState({
      id: d.id,
      coupleNames: data.coupleNames as string,
      dateLabel: formatAdminDate(data.date as Timestamp),
      dateISO: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      location: data.location as string,
      photoLimit: data.photoLimit as number,
      captureMode: (data.captureMode as CaptureMode) ?? 'both',
      galleryVisible: (data.galleryVisible as GalleryVisibility) ?? 'after_approval',
      theme: (data.theme as GuestTheme) ?? 'finder',
      challenges: Array.isArray(data.challenges) ? (data.challenges as string[]) : [],
      slug: (data.slug as string) ?? d.id,
    })
  }, [user.uid])

  useEffect(() => {
    void loadEvent()
  }, [loadEvent])

  if (state === 'loading') {
    return (
      <div className="app-status">
        <span className="eyebrow">Knipsmoment · Admin</span>
        <p>Eure Hochzeit wird geladen …</p>
      </div>
    )
  }
  if (state === 'none') {
    return <Onboarding adminUid={user.uid} onDone={() => void loadEvent()} />
  }
  if (editing) {
    return (
      <EventSettings
        event={state}
        onClose={(saved) => {
          setEditing(false)
          if (saved) void loadEvent()
        }}
      />
    )
  }
  return <Dashboard event={state} onEdit={() => setEditing(true)} />
}
