/**
 * Vorschlagsliste für Foto-Aufgaben (Challenges) — im Onboarding an-/abwählbar,
 * eigene Aufgaben kommen dazu. Gäste bekommen 1–2 davon zufällig zugeteilt.
 */
export const CHALLENGE_SUGGESTIONS: string[] = [
  // Menschen & Verbindungen
  'Mach ein Foto mit jemandem, der das Brautpaar (oder einen von beiden) seit mehr als 10 Jahren kennt.',
  'Ein Selfie mit der Person, die am weitesten angereist ist.',
  'Ein Bild von zwei Gästen, die sich heute zum ersten Mal begegnet sind.',
  'Ein Generationen-Foto: der jüngste und der älteste Gast zusammen.',
  'Ein Foto mit deiner Tischnachbarin oder deinem Tischnachbarn.',
  // Momente
  'Fang einen echten Lachanfall ein.',
  'Erwische das Brautpaar in einem Moment, in dem es sich gegenseitig anschaut.',
  'Ein Foto von jemandem beim Tanzen, der sonst nie tanzt.',
  'Der Moment des Anstoßens — Gläser mitten im Klirren.',
  'Freudentränen (oder das Taschentuch danach).',
  // Details & Spaß
  'Das schönste Detail der Deko.',
  'Die besten Schuhe des Abends.',
  'Der erste Gast auf der Tanzfläche.',
  'Ein Foto, das zeigt, wie DU diesen Tag erlebst.',
]

/** Zufällige Auswahl von n Aufgaben (Fisher-Yates auf Kopie) */
export function pickChallenges(list: string[], n: number): string[] {
  const pool = [...list]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.max(0, Math.min(n, pool.length)))
}
