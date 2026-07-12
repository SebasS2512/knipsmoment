import imageCompression from 'browser-image-compression'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import { randomId } from './id'

// Client-Kompression vor Upload ist zwingend (§8) — Ziel deutlich unter dem
// 10-MB-Limit der Storage-Rules, Handy-Fotos schrumpfen auf ~0,5–0,8 MB.
const COMPRESSION = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1920,
  fileType: 'image/jpeg',
  initialQuality: 0.82,
  useWebWorker: true,
}

async function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(blob)
    const dims = { width: bmp.width, height: bmp.height }
    bmp.close()
    return dims
  } catch {
    return { width: 0, height: 0 }
  }
}

/**
 * Ein Gäste-Foto sichern: komprimieren → Storage-Upload →
 * Firestore-Dokument als 'pending' (§6). Wirft bei Netz-/Rules-Fehlern —
 * die Queue im Gäste-Flow kümmert sich um Retry.
 */
export async function uploadPhoto(
  eventId: string,
  file: File,
  guestSessionId: string,
  guestName?: string,
  challenge?: string,
): Promise<void> {
  if (!db || !storage) throw new Error('Firebase ist nicht konfiguriert')

  const compressed = await imageCompression(file, COMPRESSION)
  const { width, height } = await readDimensions(compressed)

  const photoId = randomId()
  const storagePath = `events/${eventId}/photos/${photoId}.jpg`
  const storageRef = ref(storage, storagePath)

  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(storageRef)

  await addDoc(collection(db, 'events', eventId, 'photos'), {
    url,
    storagePath,
    status: 'pending',
    guestSessionId,
    createdAt: serverTimestamp(),
    width,
    height,
    ...(guestName?.trim() ? { guestName: guestName.trim() } : {}),
    ...(challenge ? { challenge } : {}),
  })
}
