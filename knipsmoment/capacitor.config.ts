import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.knipsmoment.app',
  appName: 'Knipsmoment',
  webDir: 'dist',
  server: {
    // https-Schema, damit Web-APIs (Firebase, crypto, Service Worker) im
    // Android-WebView wie im Browser funktionieren
    androidScheme: 'https',
  },
}

export default config
