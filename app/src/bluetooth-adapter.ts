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
    bleService.on('connected', (device) => {
      console.log('Connected to:', device);
      this.updateUI();
      this.showStatus(`Conectado: ${device.name}`, 'success');
    });

    bleService.on('disconnected', () => {
      console.log('Disconnected');
      this.updateUI();
      this.showStatus('Desconectado', 'default');
    });

    bleService.on('dataReceived', (data) => {
      console.log('Data received:', data);
      this.handleTelemetry(data.data);
    });

    bleService.on('error', (err) => {
      console.error('BLE error:', err);
      this.showStatus(err.message, 'error');
    });

    bleService.on('scanningState', (state) => {
      if (state.scanning) {
        this.showStatus('Procurando robô...', 'scanning');
      }
    });

    bleService.on('deviceFound', (device) => {
      this.showStatus(`Robô encontrado: ${device.name}`, 'success');
    });
  }

  async handleBluetoothButtonClick() {
    if (bleService.isConnectedToDevice()) {
      await bleService.disconnect();
    } else {
      // Vibrate to indicate search start
      await Haptics.vibrate({ duration: 75 });
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
    if (connectBtn) {
      const isConnected = bleService.isConnectedToDevice();
      connectBtn.textContent = isConnected ? 'Desconectar' : 'Conectar Bluetooth';
      connectBtn.className = isConnected ? 'btn-connected' : 'btn-default';
    }
  }

  async init() {
    // Try to auto-reconnect on app startup
    await bleService.tryAutoReconnect();
    this.updateUI();
  }
}

export const bluetoothAdapter = new BluetoothAdapter();
