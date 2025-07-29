import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flashexpress.app',
  appName: 'FlashExpress',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config; 