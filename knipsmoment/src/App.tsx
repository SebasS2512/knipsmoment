import { lazy, Suspense } from 'react'
import { GuestFlow } from './guest/GuestFlow'
import { useEvent } from './lib/useEvent'

// Admin-Bereich lazy: hält firebase/auth, jszip und qrcode aus dem Gäste-Chunk
const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
)

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <>
        <Suspense
          fallback={
            <div className="app-status">
              <span className="eyebrow">Knipsmoment · Admin</span>
              <p>Wird geladen …</p>
            </div>
          }
        >
          <AdminApp />
        </Suspense>
        <div className="grain" aria-hidden="true" />
      </>
    )
  }
  return <GuestApp />
}

function GuestApp() {
  const state = useEvent()

  return (
    <>
      {state.status === 'loading' && (
        <div className="app-status">
          <span className="eyebrow">Knipsmoment</span>
          <p>Filmrolle wird geladen …</p>
        </div>
      )}
      {state.status === 'not_found' && (
        <div className="app-status">
          <span className="eyebrow">Knipsmoment</span>
          <h2>Diese Kamera gibt es nicht.</h2>
          <p>Prüft den QR-Code oder fragt das Brautpaar nach dem richtigen Link.</p>
        </div>
      )}
      {state.status === 'landing' && (
        <div className="app-status">
          <div className="seal" aria-hidden="true">✦</div>
          <span className="eyebrow">Knipsmoment</span>
          <h2>Die Einwegkamera für eure Hochzeit.</h2>
          <p>Gäste: scannt einfach den QR-Code auf eurem Tisch.</p>
          <a className="landing-admin" href="/admin">
            Für Brautpaare → Anmelden
          </a>
        </div>
      )}
      {state.status === 'ready' && <GuestFlow event={state.event} />}
      <div className="grain" aria-hidden="true" />
    </>
  )
}
