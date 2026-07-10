import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadPhoto } from '../lib/uploadPhoto'
import { isFirebaseConfigured } from '../lib/firebase'

type QueueItem = {
  id: string
  file: File
  guestName?: string
  status: 'queued' | 'uploading' | 'done' | 'error'
}

export type QueueSummary = {
  /** Bilder, die noch unterwegs sind (queued + uploading) */
  pending: number
  /** fehlgeschlagene Uploads, warten auf Retry */
  failed: number
}

/**
 * Upload-Queue für schlechten Empfang in Locations (§8):
 * sequentiell, mit klaren Zuständen und manuellem Retry.
 * Ohne Firebase-Config (Demo-Modus) werden Bilder nur lokal gezählt.
 */
export function useUploadQueue(eventId: string, guestSessionId: string) {
  // Die Queue lebt in einer Ref (Source of Truth für die Schleife);
  // summary ist der davon abgeleitete UI-State.
  const queue = useRef<QueueItem[]>([])
  const running = useRef(false)
  const [summary, setSummary] = useState<QueueSummary>({ pending: 0, failed: 0 })

  const sync = useCallback(() => {
    setSummary({
      pending: queue.current.filter((i) => i.status === 'queued' || i.status === 'uploading')
        .length,
      failed: queue.current.filter((i) => i.status === 'error').length,
    })
  }, [])

  const process = useCallback(async () => {
    if (running.current) return
    running.current = true
    try {
      let next: QueueItem | undefined
      while ((next = queue.current.find((i) => i.status === 'queued'))) {
        next.status = 'uploading'
        sync()
        try {
          await uploadPhoto(eventId, next.file, guestSessionId, next.guestName)
          next.status = 'done'
        } catch {
          next.status = 'error'
        }
        sync()
      }
    } finally {
      running.current = false
    }
  }, [eventId, guestSessionId, sync])

  const enqueue = useCallback(
    (file: File, guestName?: string) => {
      if (!isFirebaseConfigured) return // Demo-Modus: nur lokal
      queue.current.push({ id: crypto.randomUUID(), file, guestName, status: 'queued' })
      sync()
      void process()
    },
    [process, sync],
  )

  const retryFailed = useCallback(() => {
    for (const item of queue.current) {
      if (item.status === 'error') item.status = 'queued'
    }
    sync()
    void process()
  }, [process, sync])

  // Sobald das Netz zurück ist, fehlgeschlagene Uploads automatisch neu anstoßen (§8)
  useEffect(() => {
    const onOnline = () => retryFailed()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [retryFailed])

  const clear = useCallback(() => {
    queue.current = []
    sync()
  }, [sync])

  return { enqueue, retryFailed, clear, summary }
}
