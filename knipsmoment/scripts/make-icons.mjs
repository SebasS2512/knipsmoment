// Rastert public/favicon.svg zu PNG-Icons für PWA-Installierbarkeit
// (Android/Chrome braucht 192/512, iOS den apple-touch-icon).
// Ausführen:  node scripts/make-icons.mjs
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))

for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `pwa-${size}.png`
  const out = fileURLToPath(new URL(`../public/${name}`, import.meta.url))
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out)
  console.log('erzeugt:', name)
}
