import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Preferences } from '@capacitor/preferences';
import { Haptics } from '@capacitor/haptics';

export interface BluetoothDevice {
  name: string;
  deviceId: string;
}

export class BLEService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectedDevice: BluetoothDevice | null = null;
  private scanInProgress = false;
  private commandQueue: string[] = [];
  private isConnected = false;

  // UART Service & Characteristics UUIDs
  private readonly SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  private readonly TX_CHAR = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // Write to robot
  private readonly RX_CHAR = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // Read from robot
  private readonly ROBOT_NAME = 'Madinboo';

  constructor() {
    this.initBLE();
  }

  private async initBLE() {
    try {
      await BleClient.initialize();
      console.log('BLE initialized');
      this.emit('bleReady', {});
    } catch (err) {
      console.error('BLE init error:', err);
      this.emit('error', { message: 'Falha ao inicializar Bluetooth' });
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  // Auto-discovery: scan for robot, vibrate when found
  async startAutoDiscovery() {
    if (this.scanInProgress) return;
    this.scanInProgress = true;
    this.emit('scanningState', { scanning: true });

    try {
      await BleClient.requestLEScan(
        { services: [] },
        async (result) => {
          if (result.device.name?.includes(this.ROBOT_NAME)) {
            // Device found!
            await Haptics.vibrate({ duration: 100 });
            await Haptics.vibrate({ duration: 100 });
            this.emit('deviceFound', {
              name: result.device.name,
              deviceId: result.device.deviceId,
            });
            // Auto-connect
            await this.connect({
              name: result.device.name,
              deviceId: result.device.deviceId,
            });
            await this.stopScan();
          }
        }
      );
    } catch (err) {
      console.error('Scan error:', err);
      this.emit('error', { message: 'Erro ao procurar dispositivos' });
      this.scanInProgress = false;
    }
  }

  private async stopScan() {
    try {
      await BleClient.stopLEScan();
    } catch (err) {
      console.error('Stop scan error:', err);
    } finally {
      this.scanInProgress = false;
      this.emit('scanningState', { scanning: false });
    }
  }

  async connect(device: BluetoothDevice) {
    try {
      await BleClient.connect(device.deviceId);
      this.connectedDevice = device;
      this.isConnected = true;

      // Save last device
      await Preferences.set({
        key: 'lastDevice',
        value: JSON.stringify(device),
      });

      // Vibrate on connect
      await Haptics.vibrate({ duration: 50 });

      // Start listening for data
      await this.startNotifications(device.deviceId);

      this.emit('connected', device);
    } catch (err) {
      console.error('Connect error:', err);
      this.emit('error', { message: 'Falha ao conectar' });
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (!this.connectedDevice) return;

    try {
      // Stop notifications before disconnecting
      await BleClient.stopNotifications(
        this.connectedDevice.deviceId,
        this.SERVICE_UUID,
        this.RX_CHAR
      );
      
      await BleClient.disconnect(this.connectedDevice.deviceId);
      this.isConnected = false;
      this.emit('disconnected', {});
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }

  private async startNotifications(deviceId: string) {
    try {
      await BleClient.startNotifications(
        deviceId,
        this.SERVICE_UUID,
        this.RX_CHAR,
        (value) => {
          const text = new TextDecoder().decode(value);
          this.emit('dataReceived', { data: text });
        }
      );
    } catch (err) {
      console.error('Notification error:', err);
    }
  }

  async sendCommand(command: string) {
    if (!this.connectedDevice || !this.isConnected) {
      console.warn('Not connected');
      return;
    }

    try {
      const data = new TextEncoder().encode(command + '\n');
      await BleClient.write(
        this.connectedDevice.deviceId,
        this.SERVICE_UUID,
        this.TX_CHAR,
        data
      );
      console.log('Command sent:', command);
    } catch (err) {
      console.error('Write error:', err);
      this.emit('error', { message: 'Erro ao enviar comando' });
    }
  }

  async tryAutoReconnect() {
    try {
      const stored = await Preferences.get({ key: 'lastDevice' });
      if (stored.value) {
        const device: BluetoothDevice = JSON.parse(stored.value);
        console.log('Attempting auto-reconnect to:', device.name);
        await this.connect(device);
      }
    } catch (err) {
      console.error('Auto-reconnect error:', err);
    }
  }

  isConnectedToDevice(): boolean {
    return this.isConnected;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }
}

export const bleService = new BLEService();
