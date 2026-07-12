import type { Timestamp } from 'firebase/firestore'

/* ============================================================
   Datenmodell (§6 des Handoffs)
   ============================================================ */

export type CaptureMode = 'finder' | 'upload' | 'both'
export type GalleryVisibility = 'immediate' | 'after_approval'
export type PhotoStatus = 'pending' | 'approved' | 'rejected'
/** Stil-Variante des Gäste-Screens (§4.2): A Sucher · B Polaroid · C Filmstreifen */
export type GuestTheme = 'finder' | 'polaroid' | 'filmstrip'

export const PHOTO_LIMIT_MIN = 3
export const PHOTO_LIMIT_MAX = 15
export const PHOTO_LIMIT_DEFAULT = 10

/** Firestore: events/{eventId} */
export interface WeddingEvent {
  coupleNames: string          // "Lena & Jonas"
  date: Timestamp
  location: string
  photoLimit: number           // 3–15, default 10
  captureMode: CaptureMode
  galleryVisible: GalleryVisibility
  theme?: GuestTheme           // default 'finder'
  challenges?: string[]        // Foto-Aufgaben; leer/fehlend = Feature aus
  slug: string                 // "lj25" → knipsmoment.app/l/lj25
  createdAt: Timestamp
  adminUid: string
}

/** Firestore: events/{eventId}/photos/{photoId} */
export interface Photo {
  url: string                  // Storage-Download-URL
  storagePath: string          // events/{eventId}/photos/{photoId}.jpg
  status: PhotoStatus
  guestName?: string
  challenge?: string           // beim Knipsen angezeigte Foto-Aufgabe
  guestSessionId: string       // anonyme Session/Gerät-ID
  createdAt: Timestamp
  width: number
  height: number
}

/** Gäste-Session-State (clientseitig, localStorage — §6) */
export interface GuestSession {
  guestSessionId: string       // UUID, einmal generiert
  takenCount: number           // Anzeige-Limit; Server bleibt Source of Truth
  screen: GuestScreen          // damit Reload den Flow nicht verliert
}

export type GuestScreen = 'welcome' | 'cam' | 'done'
