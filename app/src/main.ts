import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { bluetoothAdapter } from './bluetooth-adapter';

// Expose to global scope for HTML onclick handlers
(window as any).bluetoothAdapter = bluetoothAdapter;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize status bar
    await StatusBar.setBackgroundColor({ color: '#080C14' });
    StatusBar.setStyle({ style: 'light' });

    // Initialize keep-awake
    await KeepAwake.keepAwake().catch(() => console.warn("KeepAwake not supported"));

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
