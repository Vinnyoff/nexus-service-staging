import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.incodedev.nexus', // TROQUE
  appName: 'Nexus',                 // TROQUE
  webDir: 'public',                 // placeholder (qualquer pasta existente)
  server: {
    url: 'https://studio--studio-7906776988-e180b.us-central1.hosted.app',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
