import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.grovaitech.app',
  appName: 'Grovaitech',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://grovaitech.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
