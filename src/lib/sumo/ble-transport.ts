import { PermissionsAndroid, Platform } from 'react-native';
import type { BleError, Device, Subscription } from 'react-native-ble-plx';
import { BleManager, State as BleState } from 'react-native-ble-plx';

import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from './base64';
import {
  BLE_NUS_RX_UUID,
  BLE_NUS_SERVICE_UUID,
  BLE_NUS_TX_UUID,
  DEFAULT_DEVICE_NAME,
  LineAccumulator,
} from './protocol';

export interface DiscoveredRobot {
  id: string;
  name: string;
  rssi: number | null;
}

export type ConnectionPhase =
  | 'disconnected'
  | 'permissions_denied'
  | 'bluetooth_off'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'in_combat'
  | 'error';

export interface BleTransportCallbacks {
  onPhaseChange: (phase: ConnectionPhase, detail?: string) => void;
  onDeviceDiscovered: (device: DiscoveredRobot) => void;
  onConnected: (device: DiscoveredRobot) => void;
  onDisconnected: (wasExpectedCombatDrop: boolean) => void;
  onLineReceived: (line: string) => void;
  onRawTx?: (cmd: string) => void;
}

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return true;
  }
  if (Platform.OS !== 'android') {
    return false;
  }

  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : Number.parseInt(String(Platform.Version), 10);

  if (apiLevel >= 31) {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      res[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Permissão de Bluetooth',
      message: 'Necessária no Android <= 11 para localizar o robô Sumo_Auto_ESP32 via BLE.',
      buttonPositive: 'Permitir',
    },
  );
  return fine === PermissionsAndroid.RESULTS.GRANTED;
}

function matchesSumoDevice(device: Device, targetName: string): boolean {
  const name = (device.name ?? device.localName ?? '').trim();
  if (name.toLowerCase() === targetName.toLowerCase()) {
    return true;
  }
  const uuids = device.serviceUUIDs ?? [];
  return uuids.some((u) => u.toLowerCase() === BLE_NUS_SERVICE_UUID);
}

export class SumoBleTransport {
  private manager: BleManager | null = null;
  private activeDevice: Device | null = null;
  private monitorSub: Subscription | null = null;
  private disconnectSub: Subscription | null = null;
  private stateSub: Subscription | null = null;
  private accumulator = new LineAccumulator();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private manualDisconnect = false;
  private autoConnectEnabled = true;
  private targetName = DEFAULT_DEVICE_NAME;
  private preferredDeviceId: string | null = null;
  private lastKnownMatchReady = false;
  private callbacks: BleTransportCallbacks;
  private txBusy = false;
  private txQueue: Array<{
    cmd: string;
    coalescable: boolean;
    resolve: (ok: boolean) => void;
  }> = [];

  constructor(callbacks: BleTransportCallbacks) {
    this.callbacks = callbacks;
  }

  private ensureManager(): BleManager {
    if (!this.manager) {
      this.manager = new BleManager();
    }
    return this.manager;
  }

  public setAutoConnectConfig(opts: {
    enabled: boolean;
    targetName?: string;
    preferredDeviceId?: string | null;
  }): void {
    this.autoConnectEnabled = opts.enabled;
    if (opts.targetName) this.targetName = opts.targetName;
    if (opts.preferredDeviceId !== undefined) this.preferredDeviceId = opts.preferredDeviceId;
  }

  public setRobotReadyHint(isReadyOrRunning: boolean): void {
    this.lastKnownMatchReady = isReadyOrRunning;
  }

  public async startAutoScan(): Promise<void> {
    this.manualDisconnect = false;
    this.clearReconnectTimer();

    const granted = await requestBlePermissions();
    if (!granted) {
      this.callbacks.onPhaseChange(
        'permissions_denied',
        'Permissão Bluetooth negada. Ative nas configurações do aparelho.',
      );
      return;
    }

    const mgr = this.ensureManager();
    const state = await mgr.state();
    if (state !== BleState.PoweredOn) {
      this.callbacks.onPhaseChange('bluetooth_off', 'Ligue o Bluetooth do aparelho.');
      this.stateSub?.remove();
      this.stateSub = mgr.onStateChange((nextState) => {
        if (nextState === BleState.PoweredOn && !this.manualDisconnect) {
          this.stateSub?.remove();
          this.stateSub = null;
          void this.startAutoScan();
        }
      }, true);
      return;
    }

    // Try fast reconnect to already-known peripheral first
    if (this.preferredDeviceId && this.autoConnectEnabled && !this.activeDevice) {
      try {
        const known = await mgr.devices([this.preferredDeviceId]);
        if (known.length > 0 && !this.isConnecting) {
          const ok = await this.connectById(known[0].id, known[0].name ?? this.targetName, known[0].rssi);
          if (ok) return;
        }
      } catch {
        // Fallback to active BLE scan
      }
    }

    this.callbacks.onPhaseChange('scanning', `Procurando ${this.targetName} (BLE NUS)...`);
    mgr.stopDeviceScan();

    // Scan without strict UUID filter on Android/iOS scan-response edge cases, then match by UUID or Name
    mgr.startDeviceScan(null, { allowDuplicates: false }, (err: BleError | null, device: Device | null) => {
      if (err) {
        this.callbacks.onPhaseChange('error', err.message);
        this.scheduleReconnect(2500);
        return;
      }
      if (!device) return;

      const isSumo = matchesSumoDevice(device, this.targetName);
      const isPreferred = this.preferredDeviceId !== null && device.id === this.preferredDeviceId;
      const displayName = device.name ?? device.localName ?? '';

      if (isSumo || isPreferred || displayName.length > 0) {
        if (isSumo || isPreferred) {
          this.callbacks.onDeviceDiscovered({
            id: device.id,
            name: displayName || this.targetName,
            rssi: device.rssi,
          });
          if (this.autoConnectEnabled && !this.isConnecting && !this.activeDevice) {
            mgr.stopDeviceScan();
            void this.connectById(device.id, displayName || this.targetName, device.rssi);
          }
        }
      }
    });
  }

  public stopScan(): void {
    this.manager?.stopDeviceScan();
  }

  public async connectById(
    deviceId: string,
    fallbackName = DEFAULT_DEVICE_NAME,
    rssi: number | null = null,
  ): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;
    this.manualDisconnect = false;
    this.clearReconnectTimer();

    const mgr = this.ensureManager();
    mgr.stopDeviceScan();
    this.callbacks.onPhaseChange('connecting', `Conectando a ${fallbackName}...`);

    try {
      let device = await mgr.connectToDevice(deviceId, { timeout: 8000 });
      if (Platform.OS === 'android') {
        try {
          device = await device.requestMTU(185);
        } catch {
          // Keep default MTU safely
        }
      }
      device = await device.discoverAllServicesAndCharacteristics();

      this.activeDevice = device;
      this.accumulator.reset();

      this.disconnectSub?.remove();
      this.disconnectSub = mgr.onDeviceDisconnected(device.id, () => {
        this.handleUnexpectedDisconnect();
      });

      this.monitorSub?.remove();
      this.monitorSub = device.monitorCharacteristicForService(
        BLE_NUS_SERVICE_UUID,
        BLE_NUS_TX_UUID,
        (err, char) => {
          if (err || !char?.value) return;
          const text = decodeBase64ToUtf8(char.value);
          const lines = this.accumulator.push(text);
          for (const line of lines) {
            this.callbacks.onLineReceived(line);
          }
        },
      );

      this.isConnecting = false;
      this.callbacks.onPhaseChange('connected', device.name ?? fallbackName);
      this.callbacks.onConnected({
        id: device.id,
        name: device.name ?? fallbackName,
        rssi: device.rssi ?? rssi,
      });
      return true;
    } catch (e) {
      this.isConnecting = false;
      const msg = e instanceof Error ? e.message : 'Falha na conexão BLE';
      this.callbacks.onPhaseChange('error', msg);
      if (this.autoConnectEnabled && !this.manualDisconnect) {
        this.scheduleReconnect(2000);
      }
      return false;
    }
  }

  public async sendCommand(
    cmd: string,
    opts?: { coalescable?: boolean; urgent?: boolean },
  ): Promise<boolean> {
    if (!this.activeDevice) return false;
    const coalescable = opts?.coalescable === true;
    const urgent = opts?.urgent === true;

    // Never pile up periodic polling commands while another GATT write is active or queued
    if (coalescable && (this.txBusy || this.txQueue.length > 0)) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      if (urgent) {
        // Drop queued low-priority polls so PARADA* executes immediately
        for (let i = this.txQueue.length - 1; i >= 0; i--) {
          if (this.txQueue[i].coalescable) {
            this.txQueue[i].resolve(true);
            this.txQueue.splice(i, 1);
          }
        }
        this.txQueue.unshift({ cmd, coalescable: false, resolve });
      } else {
        this.txQueue.push({ cmd, coalescable, resolve });
      }
      if (!this.txBusy) {
        void this.drainTxQueue();
      }
    });
  }

  private async drainTxQueue(): Promise<void> {
    if (this.txBusy) return;
    this.txBusy = true;
    try {
      while (this.txQueue.length > 0) {
        const item = this.txQueue.shift()!;
        const dev = this.activeDevice;
        if (!dev) {
          item.resolve(false);
          continue;
        }
        const ok = await this.writeOnce(dev, item.cmd);
        item.resolve(ok);
      }
    } finally {
      this.txBusy = false;
    }
  }

  private async writeOnce(dev: Device, cmd: string): Promise<boolean> {
    const payload = encodeUtf8ToBase64(cmd);
    this.callbacks.onRawTx?.(cmd);

    try {
      await dev.writeCharacteristicWithoutResponseForService(
        BLE_NUS_SERVICE_UUID,
        BLE_NUS_RX_UUID,
        payload,
      );
      return true;
    } catch {
      try {
        await dev.writeCharacteristicWithResponseForService(
          BLE_NUS_SERVICE_UUID,
          BLE_NUS_RX_UUID,
          payload,
        );
        return true;
      } catch {
        return false;
      }
    }
  }

  private clearTxQueue(): void {
    while (this.txQueue.length > 0) {
      this.txQueue.shift()?.resolve(false);
    }
  }

  public async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.clearTxQueue();
    this.stopScan();
    this.monitorSub?.remove();
    this.monitorSub = null;
    this.disconnectSub?.remove();
    this.disconnectSub = null;
    const dev = this.activeDevice;
    this.activeDevice = null;
    if (dev) {
      try {
        await dev.cancelConnection();
      } catch {
        // Already disconnected
      }
    }
    this.callbacks.onPhaseChange('disconnected', 'Desconectado manualmente');
    this.callbacks.onDisconnected(false);
  }

  public destroy(): void {
    void this.disconnect();
    this.stateSub?.remove();
    this.stateSub = null;
    this.manager?.destroy();
    this.manager = null;
  }

  private handleUnexpectedDisconnect(): void {
    this.clearTxQueue();
    this.monitorSub?.remove();
    this.monitorSub = null;
    this.disconnectSub?.remove();
    this.disconnectSub = null;
    this.activeDevice = null;

    if (this.manualDisconnect) return;

    const likelyCombat = this.lastKnownMatchReady;
    if (likelyCombat) {
      this.callbacks.onPhaseChange(
        'in_combat',
        'Robô em combate (BLE desligado pela regra). Reconexão automática após STOP.',
      );
    } else {
      this.callbacks.onPhaseChange('disconnected', 'Conexão perdida — reconectando...');
    }
    this.callbacks.onDisconnected(likelyCombat);

    if (this.autoConnectEnabled) {
      this.scheduleReconnect(likelyCombat ? 2500 : 1200);
    }
  }

  private scheduleReconnect(delayMs: number): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualDisconnect && this.autoConnectEnabled && !this.activeDevice && !this.isConnecting) {
        void this.startAutoScan();
      }
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
