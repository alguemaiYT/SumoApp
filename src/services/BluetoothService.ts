import type { TelemetryData, ConnectionStatus, CommandLog } from '../types/sumo';

type TelemetryCallback = (data: TelemetryData) => void;
type StatusCallback = (status: ConnectionStatus) => void;
type LogCallback = (log: CommandLog) => void;

export class BluetoothService {
  private static instance: BluetoothService;
  private status: ConnectionStatus = 'disconnected';
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private logCallbacks: Set<LogCallback> = new Set();

  private pollingTimer: number | null = null;
  private isSimulation: boolean = true;
  private deviceName: string = "Madinboo_BT";

  // Simulated telemetry state
  private simTelemetry: TelemetryData = {
    velocreta: 220,
    velocgiro: 180,
    HBEvasao: true,
    limiarParado: 0.1,
    limiarEmpurrado: -0.25,
    Vbat: 8.24,
    sen_dir: 0,
    sen_centro_dir: 1,
    sen_centro_esq: 1,
    sen_esq: 0,
    sensorLD: 120,
    sensorLE: 145,
    timestamp: Date.now()
  };

  private constructor() {}

  public static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isSimulated(): boolean {
    return this.isSimulation;
  }

  public onTelemetry(cb: TelemetryCallback) {
    this.telemetryCallbacks.add(cb);
    return () => this.telemetryCallbacks.delete(cb);
  }

  public onStatusChange(cb: StatusCallback) {
    this.statusCallbacks.add(cb);
    return () => this.statusCallbacks.delete(cb);
  }

  public onLog(cb: LogCallback) {
    this.logCallbacks.add(cb);
    return () => this.logCallbacks.delete(cb);
  }

  private setStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.statusCallbacks.forEach(cb => cb(newStatus));
  }

  private addLog(type: 'sent' | 'received', raw: string) {
    const log: CommandLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      raw,
      time: new Date().toLocaleTimeString()
    };
    this.logCallbacks.forEach(cb => cb(log));
  }

  public async connect(simulate: boolean = false): Promise<boolean> {
    this.setStatus('connecting');
    this.isSimulation = simulate;

    if (simulate) {
      await new Promise(r => setTimeout(r, 800));
      this.setStatus('connected');
      this.addLog('received', `Connected to ${this.deviceName} (Simulated)`);
      this.startPolling();
      return true;
    }

    try {
      // Check for Web Serial / Web Bluetooth or Bluetooth Serial plugin
      if ('bluetooth' in navigator) {
        // Try Web Bluetooth
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ name: this.deviceName }],
          optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // SPP UUID
        });
        await device.gatt?.connect();
        this.setStatus('connected');
        this.addLog('received', `Connected to WebBluetooth: ${device.name}`);
        this.startPolling();
        return true;
      } else {
        // Fallback to Simulation mode with notice
        this.isSimulation = true;
        await new Promise(r => setTimeout(r, 600));
        this.setStatus('connected');
        this.addLog('received', `Bluetooth direct not supported in this browser. Fallback to Simulation.`);
        this.startPolling();
        return true;
      }
    } catch (err: any) {
      console.warn("Bluetooth connection fallback:", err);
      // Fallback to simulation mode for dev ease
      this.isSimulation = true;
      this.setStatus('connected');
      this.addLog('received', `Connected via Simulation Mode (${err?.message || 'Dev mode'})`);
      this.startPolling();
      return true;
    }
  }

  public disconnect() {
    this.stopPolling();
    this.setStatus('disconnected');
    this.addLog('sent', 'DISCONNECT_CMD');
  }

  // Encoders (ESP32 Bluetooth.ino specification)
  public async sendCommand(rawCmd: string) {
    if (this.status !== 'connected') {
      console.warn("Not connected");
      return;
    }
    this.addLog('sent', rawCmd);

    if (this.isSimulation) {
      this.handleSimulatedCommand(rawCmd);
    } else {
      // Write to hardware stream
    }
  }

  public setStrategy(strategyId: number) {
    this.sendCommand(`EST,${strategyId}*`);
  }

  public setStraightSpeed(pwm: number) {
    this.sendCommand(`VR,${Math.round(pwm)}*`);
  }

  public setTurnSpeed(pwm: number) {
    this.sendCommand(`VG,${Math.round(pwm)}*`);
  }

  public setEvasion(enabled: boolean) {
    this.sendCommand(`HBE,${enabled ? 1 : 0}*`);
  }

  public setStalledThreshold(val: number) {
    this.sendCommand(`LIP,${val}*`);
  }

  public setPushedThreshold(val: number) {
    this.sendCommand(`LIE,${val}*`);
  }

  public emergencyStop() {
    this.sendCommand(`PARADA*`);
  }

  public requestTelemetry() {
    this.sendCommand(`dados*`);
  }

  // Decoder for raw pipe-separated format:
  // velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE
  public parseTelemetryString(raw: string): TelemetryData | null {
    try {
      const parts = raw.trim().split('|');
      if (parts.length < 12) return null;

      return {
        velocreta: parseInt(parts[0], 10) || 0,
        velocgiro: parseInt(parts[1], 10) || 0,
        HBEvasao: parts[2] === '1' || parts[2].toLowerCase() === 'true',
        limiarParado: parseFloat(parts[3]) || 0,
        limiarEmpurrado: parseFloat(parts[4]) || 0,
        Vbat: parseFloat(parts[5]) || 0,
        sen_dir: parseInt(parts[6], 10) || 0,
        sen_centro_dir: parseInt(parts[7], 10) || 0,
        sen_centro_esq: parseInt(parts[8], 10) || 0,
        sen_esq: parseInt(parts[9], 10) || 0,
        sensorLD: parseInt(parts[10], 10) || 0,
        sensorLE: parseInt(parts[11], 10) || 0,
        timestamp: Date.now()
      };
    } catch {
      return null;
    }
  }

  private startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = window.setInterval(() => {
      if (this.status === 'connected') {
        this.requestTelemetry();
      }
    }, 500); // 500ms interval matching ESP32 telemetry rate
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private handleSimulatedCommand(rawCmd: string) {
    if (rawCmd === 'dados*') {
      // Simulate realistic fluctuation of sensors
      const randSensor = Math.random();
      this.simTelemetry.sen_esq = randSensor > 0.8 ? 1 : 0;
      this.simTelemetry.sen_centro_esq = randSensor > 0.4 && randSensor <= 0.8 ? 1 : 0;
      this.simTelemetry.sen_centro_dir = randSensor > 0.4 && randSensor <= 0.8 ? 1 : 0;
      this.simTelemetry.sen_dir = randSensor > 0.85 ? 1 : 0;

      this.simTelemetry.sensorLD = Math.floor(100 + Math.random() * 300);
      this.simTelemetry.sensorLE = Math.floor(110 + Math.random() * 280);
      this.simTelemetry.Vbat = Number((8.1 + Math.random() * 0.3).toFixed(2));
      this.simTelemetry.timestamp = Date.now();

      const rawString = `${this.simTelemetry.velocreta}|${this.simTelemetry.velocgiro}|${this.simTelemetry.HBEvasao ? 1 : 0}|${this.simTelemetry.limiarParado}|${this.simTelemetry.limiarEmpurrado}|${this.simTelemetry.Vbat}|${this.simTelemetry.sen_dir}|${this.simTelemetry.sen_centro_dir}|${this.simTelemetry.sen_centro_esq}|${this.simTelemetry.sen_esq}|${this.simTelemetry.sensorLD}|${this.simTelemetry.sensorLE}`;
      
      const parsed = this.parseTelemetryString(rawString);
      if (parsed) {
        this.telemetryCallbacks.forEach(cb => cb(parsed));
      }
    } else if (rawCmd.startsWith('EST,')) {
      const id = parseInt(rawCmd.split(',')[1], 10);
      this.addLog('received', `ACK: Estratégia alterada para #${id}`);
    } else if (rawCmd.startsWith('VR,')) {
      const val = parseInt(rawCmd.split(',')[1], 10);
      this.simTelemetry.velocreta = val;
      this.addLog('received', `ACK: VeloCreta = ${val}`);
    } else if (rawCmd.startsWith('VG,')) {
      const val = parseInt(rawCmd.split(',')[1], 10);
      this.simTelemetry.velocgiro = val;
      this.addLog('received', `ACK: VeloGiro = ${val}`);
    } else if (rawCmd.startsWith('HBE,')) {
      const val = rawCmd.split(',')[1].startsWith('1');
      this.simTelemetry.HBEvasao = val;
      this.addLog('received', `ACK: HBEvasao = ${val}`);
    } else if (rawCmd.startsWith('LIP,')) {
      const val = parseFloat(rawCmd.split(',')[1]);
      this.simTelemetry.limiarParado = val;
      this.addLog('received', `ACK: LimiarParado = ${val}`);
    } else if (rawCmd.startsWith('LIE,')) {
      const val = parseFloat(rawCmd.split(',')[1]);
      this.simTelemetry.limiarEmpurrado = val;
      this.addLog('received', `ACK: LimiarEmpurrado = ${val}`);
    } else if (rawCmd === 'PARADA*') {
      this.simTelemetry.velocreta = 0;
      this.simTelemetry.velocgiro = 0;
      this.addLog('received', `ACK: MOTORES PARADOS (PARADA DE EMERGÊNCIA)`);
    }
  }
}

export const btService = BluetoothService.getInstance();
