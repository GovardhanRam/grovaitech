import type { CapacitorConfig } from '@capacitor/cli';

// Deployed Grovaitech production server URL for native mobile shell
const baseServerUrl = (process.env.CAPACITOR_SERVER_URL || 'https://grovaitech.vercel.app').replace(/\/+$/, '');
const appEntryUrl = baseServerUrl.endsWith('/app-entry')
  ? baseServerUrl
  : `${baseServerUrl}/app-entry`;

const config: CapacitorConfig = {
  appId: 'ai.grovaitech.app',
  appName: 'Grovaitech',
  webDir: 'public',
  server: {
    url: appEntryUrl,
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
  },
};

export default config;
