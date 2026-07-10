import { GuestFlow } from './guest/GuestFlow'
import { AdminApp } from './admin/AdminApp'
import { useEvent } from './lib/useEvent'

export default function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return (
      <>
        <AdminApp />
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
      {state.status === 'ready' && <GuestFlow event={state.event} />}
      <div className="grain" aria-hidden="true" />
    </>
  )
}
