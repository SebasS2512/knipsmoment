import { getAuth, type Auth } from 'firebase/auth'
import { app } from './firebase'

// Bewusst getrennt von lib/firebase.ts: Auth braucht nur der Admin-Bereich —
// so bleibt firebase/auth aus dem Gäste-Chunk (Code-Splitting, Schritt 8).
export const auth: Auth | undefined = app ? getAuth(app) : undefined
