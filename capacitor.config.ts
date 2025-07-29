import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashexpress.app',
  appName: 'Flash Express',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
