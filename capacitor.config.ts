import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jalin.kidscheckin',
  appName: 'Kids Checkin',
  webDir: 'build',
  server: {
    url: 'http://192.168.31.16:3000',
    cleartext: true
  }
};

export default config;
