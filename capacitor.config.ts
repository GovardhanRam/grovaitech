import type { CapacitorConfig } from '@capacitor/cli';

// Default to local reverse proxy (http://localhost:3000/app-entry) for active USB device testing;
// Can be overridden with production URL via CAPACITOR_SERVER_URL=https://grovaitech.vercel.app
const baseServerUrl = (process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '');
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
