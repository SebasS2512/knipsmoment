import { useRef, useState, type ChangeEvent, type RefObject } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const TOAST_MS = 1300

export type CaptureSource = 'camera' | 'gallery'

export type ShutterApi = {
  remaining: number
  flashKey: number
  toast: { text: string; visible: boolean }
  /** Auslöse-Kaskade: optional Live-Snap → Capacitor-Camera → <input capture> */
  capture: (source: CaptureSource) => Promise<void>
  handleFile: (e: ChangeEvent<HTMLInputElement>) => void
  cameraInput: RefObject<HTMLInputElement | null>
  galleryInput: RefObject<HTMLInputElement | null>
}

/**
 * Nativer Kamera-/Galerie-Zugriff über das Capacitor-Camera-Plugin.
 * Liefert null, wenn der Gast abbricht oder die Berechtigung verweigert.
 */
async function nativePhoto(source: CameraSource): Promise<File | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source,
      quality: 90,
      correctOrientation: true,
    })
    if (!photo.webPath) return null
    const blob = await fetch(photo.webPath).then((r) => r.blob())
    return new File([blob], `knips-${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg',
    })
  } catch {
    return null
  }
}

/**
 * Gemeinsame Auslöser-Logik aller Stil-Varianten (§4.2/§5): Zählerstand,
 * Blitz-Animation, Toast „Bild n von N gesichert" und die Capture-Kaskade.
 */
export function useShutter({
  limit,
  taken,
  onPhoto,
  snapLive,
}: {
  limit: number
  taken: number
  onPhoto: (file: File) => void
  /** Variante A: Frame aus dem Live-Sucher einfrieren (hat Vorrang) */
  snapLive?: () => Promise<File | null>
}): ShutterApi {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [flashKey, setFlashKey] = useState(0)
  const [toast, setToast] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  })
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const remaining = limit - taken

  function acceptPhoto(file: File) {
    if (remaining <= 0) return

    onPhoto(file)
    setFlashKey((k) => k + 1)

    const n = taken + 1
    setToast({ text: `Bild ${n} von ${limit} gesichert`, visible: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_MS,
    )
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) acceptPhoto(file)
  }

  async function capture(source: CaptureSource) {
    if (source === 'camera' && snapLive) {
      const file = await snapLive()
      if (file) {
        acceptPhoto(file)
        return
      }
    }
    if (Capacitor.isNativePlatform()) {
      const file = await nativePhoto(
        source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      )
      if (file) acceptPhoto(file)
    } else {
      const input = source === 'camera' ? cameraInput : galleryInput
      input.current?.click()
    }
  }

  return { remaining, flashKey, toast, capture, handleFile, cameraInput, galleryInput }
}
