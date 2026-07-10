import { useState, type FormEvent } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '../lib/auth'

const ERROR_TEXT: Record<string, string> = {
  'auth/invalid-credential': 'E-Mail oder Passwort stimmt nicht.',
  'auth/invalid-email': 'Das ist keine gültige E-Mail-Adresse.',
  'auth/email-already-in-use': 'Für diese E-Mail gibt es schon ein Konto — bitte anmelden.',
  'auth/weak-password': 'Das Passwort braucht mindestens 6 Zeichen.',
  'auth/too-many-requests': 'Zu viele Versuche — bitte kurz warten.',
}

/** Admin-Login/-Registrierung fürs Brautpaar (kein Gäste-Login — §1) */
export function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!auth || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      setError(ERROR_TEXT[code] ?? 'Das hat nicht geklappt — bitte nochmal versuchen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="seal" aria-hidden="true">✦</div>
      <span className="eyebrow">Knipsmoment · Admin</span>
      <h2>{mode === 'login' ? 'Anmelden' : 'Konto anlegen'}</h2>
      <p className="login-sub">
        {mode === 'login'
          ? 'Der Bereich fürs Brautpaar — Bilder sichten, freigeben, herunterladen.'
          : 'Einmal registrieren, dann eure Hochzeit anlegen.'}
      </p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="admin-email">E-Mail</label>
          <input
            id="admin-email"
            className="inp"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Passwort</label>
          <input
            id="admin-password"
            className="inp"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {mode === 'login' ? 'Anmelden →' : 'Konto anlegen →'}
        </button>
      </form>

      <button
        type="button"
        className="login-switch"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login')
          setError('')
        }}
      >
        {mode === 'login' ? 'Noch kein Konto? Registrieren' : '← Zurück zur Anmeldung'}
      </button>
    </div>
  )
}
