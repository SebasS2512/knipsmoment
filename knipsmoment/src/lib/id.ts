/**
 * UUID v4 mit Fallback: `crypto.randomUUID()` existiert nur in Secure
 * Contexts (HTTPS/localhost). Beim Testen über die lokale IP
 * (http://192.168.x.x:5173, z. B. vom Handy im WLAN) fehlt die Funktion —
 * dann bauen wir die UUID aus `crypto.getRandomValues`, das überall verfügbar ist.
 */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variante 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
