// Setzt die CORS-Konfiguration des Firebase-Storage-Buckets (einmalig nötig,
// damit Browser-Downloads per fetch/getBlob funktionieren — offizieller
// Firebase-Doku-Schritt, normalerweise via `gsutil cors set`, hier ohne
// Google Cloud SDK direkt über die GCS-JSON-API).
// Nutzt das lokale Firebase-CLI-Login (Refresh-Token aus dem Configstore) und
// die öffentlichen OAuth-Client-Konstanten der Firebase CLI.
//
// Ausführen:  node scripts/set-bucket-cors.mjs
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const BUCKET = 'knipsmoment.firebasestorage.app'
const CORS = [
  {
    origin: ['*'],
    method: ['GET'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type'],
  },
]

// Öffentliche OAuth-Client-Daten der Firebase CLI (aus firebase-tools/src/api.ts)
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

const store = JSON.parse(
  readFileSync(join(homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'),
)
const refreshToken = store.tokens?.refresh_token
if (!refreshToken) throw new Error('Kein Firebase-CLI-Login gefunden — `npx firebase-tools login` ausführen.')

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
})
if (!tokenRes.ok) throw new Error(`Token-Refresh fehlgeschlagen: ${tokenRes.status} ${await tokenRes.text()}`)
const { access_token } = await tokenRes.json()

const patchRes = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ cors: CORS }),
})
if (!patchRes.ok) throw new Error(`CORS-PATCH fehlgeschlagen: ${patchRes.status} ${await patchRes.text()}`)
const result = await patchRes.json()
console.log('CORS gesetzt auf', BUCKET, ':', JSON.stringify(result.cors))
