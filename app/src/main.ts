import { CapacitorUpdater } from '@capacitor/updater';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { bluetoothAdapter } from './bluetooth-adapter';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize status bar
    await StatusBar.setBackgroundColor({ color: '#080C14' });
    StatusBar.setStyle({ style: 'light' });

    // Initialize keep-awake
    await KeepAwake.enable();

    // Initialize Bluetooth adapter
    await bluetoothAdapter.init();

    // Hide splash screen after 1.5s
    setTimeout(() => {
      SplashScreen.hide().catch(() => {});
    }, 1500);
  } catch (err) {
    console.error('Init error:', err);
  }
});
