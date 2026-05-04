import { bleService } from './ble-service';
import { Haptics } from '@capacitor/haptics';

export class BluetoothAdapter {
  private statusElement: HTMLElement | null = null;
  private commandButtons: HTMLElement | null = null;

  constructor() {
    this.attachListeners();
    this.updateUI();
  }

  private attachListeners() {
    bleService.on('connected', async (device) => {
      console.log('Connected to:', device);
      await Haptics.vibrate({ duration: 200 });
      this.updateUI();
      this.showStatus(`Conectado: ${device.name}`, 'success');
      if (typeof (window as any).onNativeBluetoothConnected === 'function') {
        (window as any).onNativeBluetoothConnected(device);
      }
    });

    bleService.on('disconnected', () => {
      console.log('Disconnected');
      this.updateUI();
      this.showStatus('Desconectado', 'default');
      if (typeof (window as any).onNativeBluetoothDisconnected === 'function') {
        (window as any).onNativeBluetoothDisconnected();
      }
    });

    bleService.on('scanningState', (state) => {
      this.updateUI();
      if (state.scanning) {
        this.showStatus('Procurando robô...', 'scanning');
      }
    });

    bleService.on('deviceFound', async (device) => {
      this.showStatus(`Robô encontrado: ${device.name}`, 'success');
      await Haptics.vibrate({ duration: 150 });
    });
  }

  async handleBluetoothButtonClick() {
    console.log('Bluetooth button clicked');
    // Request permissions first
    await bleService.requestPermissions();

    if (bleService.isConnectedToDevice()) {
      console.log('Disconnecting...');
      await bleService.disconnect();
    } else {
      console.log('Starting auto-discovery...');
      // Vibrate to indicate search start
      await Haptics.vibrate({ duration: 75 });
      this.updateUI();
      await bleService.startAutoDiscovery();
    }
    this.updateUI();
  }

  async sendCommand(cmd: string, value?: number) {
    const command = value !== undefined ? `${cmd},${value}*` : `${cmd}*`;
    await bleService.sendCommand(command);
    await Haptics.vibrate({ duration: 30 });
  }

  private showStatus(message: string, status: string) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-${status}`;
    }
  }

  private handleTelemetry(data: string) {
    // Parse telemetry data from robot and update UI
    if (data.startsWith('dados:')) {
      const values = data.substring(6).split('|');
      this.updateTelemetryUI(values);
    }
  }

  private updateTelemetryUI(values: string[]) {
    // Update battery, sensors, speeds on UI
    const battery = document.getElementById('battery-level');
    if (battery && values[5]) {
      battery.textContent = values[5] + 'V';
    }
  }

  private updateUI() {
    const connectBtn = document.getElementById('connect-btn');
    const connectLabel = document.getElementById('connectLabel');
    
    if (connectBtn && connectLabel) {
      const isConnected = bleService.isConnectedToDevice();
      connectLabel.textContent = isConnected ? 'Desconectar' : 'Conectar Bluetooth';
      connectBtn.classList.toggle('connecting', bleService.isScanning());
      connectBtn.classList.toggle('connected', isConnected);
    } else {
      console.warn('UI elements for Bluetooth not found');
    }
  }

  async init() {
    // Try to auto-reconnect on app startup
    await bleService.tryAutoReconnect();
    this.updateUI();
  }
}

export const bluetoothAdapter = new BluetoothAdapter();
