import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** true, sobald eine .env.local mit echten Firebase-Werten vorliegt */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey)

let app: FirebaseApp | undefined
let db: Firestore | undefined
let storage: FirebaseStorage | undefined
let auth: Auth | undefined

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  storage = getStorage(app)
  auth = getAuth(app)
  // SDK-interne Retries kürzer halten, damit die Fehler-/Retry-UI der
  // Upload-Queue bei schlechtem Empfang zeitnah greift (§8)
  storage.maxUploadRetryTime = 90_000
  storage.maxOperationRetryTime = 30_000
}

export { app, db, storage, auth }
