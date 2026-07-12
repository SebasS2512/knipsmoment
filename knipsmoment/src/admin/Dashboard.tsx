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
import { deleteObject, getBlob, ref } from 'firebase/storage'
import JSZip from 'jszip'
import { db, storage } from '../lib/firebase'
import { auth } from '../lib/auth'
import type { PhotoStatus } from '../types/models'
import type { AdminEvent } from './AdminApp'

type AdminPhoto = {
  id: string
  url: string
  storagePath: string
  status: PhotoStatus
  guestSessionId: string
  guestName?: string
  challenge?: string
  createdAt: Date | null
}

type Tab = 'all' | PhotoStatus
type Sort = 'newest' | 'oldest'

type ZipState = {
  running: boolean
  done: number
  total: number
  failed: number
}

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
  const [zip, setZip] = useState<ZipState | null>(null)

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
            guestName: data.guestName as string | undefined,
            challenge: data.challenge as string | undefined,
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

  // Erfüllte Foto-Aufgaben mit Anzahl (aus den getaggten Fotos)
  const challengeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of photos) {
      if (p.challenge) m.set(p.challenge, (m.get(p.challenge) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [photos])

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

  // Download über das SDK (getBlob) statt fetch(url): die tokenisierten
  // Download-URLs der neuen *.firebasestorage.app-Buckets senden keine
  // CORS-Header für programmatische GETs; der SDK-Weg ist preflighted + auth'd.
  function photoBlob(p: AdminPhoto): Promise<Blob> {
    return getBlob(ref(storage!, p.storagePath))
  }

  async function download(p: AdminPhoto) {
    const blob = await photoBlob(p)
    saveBlob(blob, `knipsmoment-${stamp(p.createdAt) || 'bild'}-${p.id.slice(0, 6)}.jpg`)
  }

  /**
   * ZIP-Export (Schritt 7): bündelt die Bilder des aktiven Tabs clientseitig
   * (§5: „alle oder gefilterte"). Einzelne Fehlschläge brechen nicht ab —
   * am Ende wird die Anzahl gemeldet.
   */
  async function exportZip() {
    if (zip?.running || visible.length === 0) return
    const list = visible
    setZip({ running: true, done: 0, total: list.length, failed: 0 })

    const bundle = new JSZip()
    let failed = 0
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      try {
        const name = `knipsmoment-${String(i + 1).padStart(3, '0')}-${
          stamp(p.createdAt).replace(/·/g, '-') || 'bild'
        }-${p.id.slice(0, 6)}.jpg`
        bundle.file(name, await photoBlob(p))
      } catch {
        failed++
      }
      setZip({ running: true, done: i + 1, total: list.length, failed })
    }

    if (failed < list.length) {
      const blob = await bundle.generateAsync({ type: 'blob' })
      saveBlob(blob, `knipsmoment-${event.id}${tab === 'all' ? '' : `-${tab}`}.zip`)
    }
    setZip({ running: false, done: list.length, total: list.length, failed })
    window.setTimeout(() => setZip(null), 5000)
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
          {zip && !zip.running && (
            <span className="zip-status" role="status">
              {zip.failed === 0
                ? 'ZIP fertig ✓'
                : `⚠ ${zip.failed} von ${zip.total} fehlgeschlagen`}
            </span>
          )}
          <button
            type="button"
            className="btn btn-amber"
            disabled={visible.length === 0 || zip?.running}
            title={visible.length === 0 ? 'Keine Bilder im aktuellen Filter' : undefined}
            onClick={() => void exportZip()}
          >
            {zip?.running
              ? `↧ Packe ${zip.done}/${zip.total} …`
              : `⛁ ${tab === 'all' ? 'Alle' : TABS.find((t) => t.key === tab)?.label} herunterladen (ZIP)`}
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

      {challengeCounts.length > 0 && (
        <div className="challenge-summary">
          <span className="cs-label">Erfüllte Aufgaben</span>
          {challengeCounts.map(([text, n]) => (
            <span key={text} className="cs-chip" title={text}>
              {text.length > 48 ? `${text.slice(0, 48)}…` : text} <b>×{n}</b>
            </span>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="admin-empty">
          {photos.length === 0
            ? 'Noch keine Bilder — sobald Gäste knipsen, tauchen sie hier auf.'
            : 'In diesem Filter ist nichts.'}
        </p>
      ) : (
        <div className="admin-grid">
          {visible.map((p) => (
            <div
              key={p.id}
              className="shot"
              title={[p.guestName, p.challenge && `Aufgabe: ${p.challenge}`]
                .filter(Boolean)
                .join(' · ')}
            >
              <img src={p.url} alt="" loading="lazy" />
              <span className={`badge ${BADGE[p.status].cls}`}>{BADGE[p.status].text}</span>
              {p.challenge && <span className="badge-ch">✦ Aufgabe</span>}
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
