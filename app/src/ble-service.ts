import { registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics } from '@capacitor/haptics';

export interface BluetoothDevice {
  name: string;
  address: string;
}

interface BluetoothClassicPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  isEnabled(): Promise<{ enabled: boolean }>;
  isConnected(): Promise<{ connected: boolean }>;
  requestPermissions(): Promise<void>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  connect(options: { address: string }): Promise<void>;
  disconnect(): Promise<void>;
  sendCommand(options: { command: string }): Promise<void>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const BluetoothClassic = registerPlugin<BluetoothClassicPlugin>('BluetoothClassic');

export class BLEService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectedDevice: BluetoothDevice | null = null;
  private scanInProgress = false;
  private isConnected = false;
  private readonly ROBOT_NAME = 'Madinboo';

  constructor() {
    this.initBluetooth();
  }

  private async initBluetooth() {
    console.log('BLEService: Initializing Bluetooth...');
    try {
      const { available } = await BluetoothClassic.isAvailable();
      console.log('BLEService: Bluetooth availability:', available);
      if (!available) {
        console.error('BLEService: Bluetooth not available');
        return;
      }

      await BluetoothClassic.removeAllListeners();

      await BluetoothClassic.addListener('deviceFound', (device: BluetoothDevice) => {
        console.log('BLEService: Device found event:', device.name, device.address);
        if (device.name?.includes(this.ROBOT_NAME)) {
          console.log('BLEService: Target robot found! Auto-connecting...');
          this.emit('deviceFound', device);
          this.connect(device);
        }
      });

      await BluetoothClassic.addListener('connected', (device: BluetoothDevice) => {
        console.log('BLEService: Connected successfully to:', device.name);
        this.connectedDevice = device;
        this.isConnected = true;
        this.emit('connected', device);
        
        Preferences.set({
          key: 'lastDevice',
          value: JSON.stringify(device),
        });
      });

      await BluetoothClassic.addListener('scanningState', (state: { scanning: boolean }) => {
        console.log('BLEService: Scanning state changed:', state.scanning);
        this.scanInProgress = state.scanning;
        this.emit('scanningState', state);
      });

      console.log('BLEService: Listeners attached and ready');
      this.emit('bleReady', {});
    } catch (err) {
      console.error('BLEService: Init error:', err);
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

  async requestPermissions(): Promise<boolean> {
    console.log('BLEService: Checking permissions...');
    try {
      const status = await BluetoothClassic.checkPermissions();
      console.log('BLEService: Permission status:', status);

      if (status.bluetooth === 'granted' && status.location === 'granted') {
        return true;
      }

      console.log('BLEService: Requesting permissions...');
      const requestResult = await BluetoothClassic.requestPermissions();
      console.log('BLEService: Request result:', requestResult);

      return requestResult.bluetooth === 'granted' && requestResult.location === 'granted';
    } catch (err) {
      console.error('BLEService: Permission logic error:', err);
      return false;
    }
  }

  async startAutoDiscovery() {
    if (this.scanInProgress) {
        await this.stopScan();
    }
    
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        this.emit('error', { message: 'Permissões negadas. O app precisa de Bluetooth e Localização.' });
        return;
      }

      await BluetoothClassic.startDiscovery();
    } catch (err) {
      console.error('Scan error:', err);
      this.emit('error', { message: 'Erro ao iniciar busca' });
    }
  }

  private async stopScan() {
    try {
      await BluetoothClassic.stopDiscovery();
    } catch (err) {
      console.error('Stop scan error:', err);
    }
  }

  async connect(device: BluetoothDevice) {
    try {
      this.showConnectingStatus();
      await BluetoothClassic.connect({ address: device.address });
    } catch (err) {
      console.error('Connect error:', err);
      this.emit('error', { message: 'Falha ao conectar' });
    }
  }

  private showConnectingStatus() {
    // This will be handled by UI through events
  }

  async disconnect() {
    try {
      await BluetoothClassic.disconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }

  async sendCommand(command: string) {
    if (!this.isConnected) return;
    try {
      await BluetoothClassic.sendCommand({ command: command + '\n' });
    } catch (err) {
      console.error('Send error:', err);
    }
  }

  async tryAutoReconnect() {
    try {
      const { value } = await Preferences.get({ key: 'lastDevice' });
      if (value) {
        const device: BluetoothDevice = JSON.parse(value);
        console.log('Attempting auto-reconnect to:', device.address);
        await this.connect(device);
      }
    } catch (err) {
      console.error('Auto-reconnect error:', err);
    }
  }

  isConnectedToDevice(): boolean {
    return this.isConnected;
  }

  isScanning(): boolean {
      return this.scanInProgress;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }
}

export const bleService = new BLEService();
