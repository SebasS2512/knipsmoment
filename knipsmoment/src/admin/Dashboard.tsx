import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { auth, db, storage } from '../lib/firebase'
import type { PhotoStatus } from '../types/models'
import type { AdminEvent } from './AdminApp'

type AdminPhoto = {
  id: string
  url: string
  storagePath: string
  status: PhotoStatus
  guestSessionId: string
  createdAt: Date | null
}

type Tab = 'all' | PhotoStatus
type Sort = 'newest' | 'oldest'


const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'pending', label: 'Wartend' },
  { key: 'approved', label: 'Freigegeben' },
  { key: 'rejected', label: 'Abgelehnt' },
]

const BADGE: Record<PhotoStatus, { text: string; cls: string }> = {
  pending: { text: 'wartet', cls: 'pend' },
  approved: { text: 'frei', cls: 'appr' },
  rejected: { text: 'raus', cls: 'rej' },
}

function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function stamp(d: Date | null): string {
  if (!d) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}·${mm}·${String(d.getFullYear() % 100).padStart(2, '0')}`
}

/** Admin-Dashboard: sichten, freigeben/ablehnen/löschen, herunterladen (§4.4) */
export function Dashboard({ event }: { event: AdminEvent }) {
  const [photos, setPhotos] = useState<AdminPhoto[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<Sort>('newest')

  useEffect(() => {
    const q = query(
      collection(db!, 'events', event.id, 'photos'),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      setPhotos(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            url: data.url as string,
            storagePath: data.storagePath as string,
            status: data.status as PhotoStatus,
            guestSessionId: data.guestSessionId as string,
            createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? null,
          }
        }),
      )
    })
  }, [event.id])

  const counts = useMemo(() => {
    const c = { all: photos.length, pending: 0, approved: 0, rejected: 0 }
    for (const p of photos) c[p.status]++
    return c
  }, [photos])

  // „Gäste aktiv" = Sessions mit Bild in der letzten Stunde
  const activeGuests = useMemo(() => {
    const cutoff = Date.now() - 60 * 60 * 1000
    return new Set(
      photos
        .filter((p) => p.createdAt && p.createdAt.getTime() > cutoff)
        .map((p) => p.guestSessionId),
    ).size
  }, [photos])

  const visible = useMemo(() => {
    const list = photos.filter((p) => tab === 'all' || p.status === tab)
    return sort === 'newest' ? list : [...list].reverse()
  }, [photos, tab, sort])

  function setStatus(p: AdminPhoto, status: PhotoStatus) {
    void updateDoc(doc(db!, 'events', event.id, 'photos', p.id), { status })
  }

  async function remove(p: AdminPhoto) {
    if (!window.confirm('Dieses Bild endgültig löschen?')) return
    await deleteDoc(doc(db!, 'events', event.id, 'photos', p.id))
    try {
      await deleteObject(ref(storage!, p.storagePath))
    } catch {
      // Doc ist weg — verwaiste Datei ist verschmerzbar, nicht blockieren
    }
  }

  async function download(p: AdminPhoto) {
    const blob = await fetch(p.url).then((r) => r.blob())
    saveBlob(blob, `knipsmoment-${stamp(p.createdAt) || 'bild'}-${p.id.slice(0, 6)}.jpg`)
  }


  return (
    <div className="admin">
      <header className="admin-top">
        <div className="brand">
          <div className="logo" aria-hidden="true">✦</div>
          <div>
            <h3>{event.coupleNames}</h3>
            <div className="sub">
              {event.dateLabel} · {event.location.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" className="signout" onClick={() => signOut(auth!)}>
            Abmelden
          </button>
          <button type="button" className="btn btn-amber" disabled title="ZIP-Export kommt in Schritt 7">
            ⛁ Alle herunterladen (ZIP)
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <div className="stat">
          <div className="n">{counts.all}</div>
          <div className="l">Bilder gesamt</div>
        </div>
        <div className="stat">
          <div className="n pend">{counts.pending}</div>
          <div className="l">Wartend</div>
        </div>
        <div className="stat">
          <div className="n">{counts.approved}</div>
          <div className="l">Freigegeben</div>
        </div>
        <div className="stat">
          <div className="n">{activeGuests}</div>
          <div className="l">Gäste aktiv</div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tab ${tab === t.key ? 'on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="b">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tab sort"
          onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
        >
          ↧ Sortieren: {sort === 'newest' ? 'Neueste' : 'Älteste'}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="admin-empty">
          {photos.length === 0
            ? 'Noch keine Bilder — sobald Gäste knipsen, tauchen sie hier auf.'
            : 'In diesem Filter ist nichts.'}
        </p>
      ) : (
        <div className="admin-grid">
          {visible.map((p) => (
            <div key={p.id} className="shot">
              <img src={p.url} alt="" loading="lazy" />
              <span className={`badge ${BADGE[p.status].cls}`}>{BADGE[p.status].text}</span>
              <span className="stamp datestamp">{stamp(p.createdAt)}</span>
              <div className="actions">
                {p.status !== 'approved' && (
                  <button
                    type="button"
                    className="act ok"
                    title="Freigeben"
                    onClick={() => setStatus(p, 'approved')}
                  >
                    ✓
                  </button>
                )}
                {p.status !== 'rejected' && (
                  <button
                    type="button"
                    className="act no"
                    title="Ablehnen"
                    onClick={() => setStatus(p, 'rejected')}
                  >
                    ✕
                  </button>
                )}
                <button type="button" className="act" title="Herunterladen" onClick={() => download(p)}>
                  ↧
                </button>
                <button type="button" className="act del" title="Endgültig löschen" onClick={() => remove(p)}>
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
