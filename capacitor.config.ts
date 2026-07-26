import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.madinboo.sumo',
  appName: 'Sumô App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
