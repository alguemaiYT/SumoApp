import { create } from 'zustand';

import { getItem, setItem } from '@/lib/storage';

import type { ConnectionPhase, DiscoveredRobot } from './ble-transport';
import { SumoBleTransport } from './ble-transport';
import type {
  BenchJogDirection,
  RobotInfoData,
  StrategyId,
  TelemetryData,
  TournamentPreset,
} from './protocol';
import {
  cmdBenchJog,
  cmdCalibrateAll,
  cmdCalibrateImu,
  cmdEmergencyStop,
  cmdHbevasao,
  cmdIrStartDelay,
  cmdPushedThreshold,
  cmdRequestInfo,
  cmdRequestTelemetry,
  cmdResetConfig,
  cmdStalledThreshold,
  cmdStraightSpeed,
  cmdStrategy,
  cmdTurnSpeed,
  DEFAULT_DEVICE_NAME,
  parseDadosLine,
  parseInfoLine,
} from './protocol';

export interface ConsoleEntry {
  id: string;
  dir: 'tx' | 'rx' | 'sys';
  text: string;
  time: string;
}

export interface MeasurementRecord {
  massKg: string;
  trackWidthCm: string;
  botRadiusCm: string;
  hbridgeModel: string;
  supportsShortBrake: boolean;
  vbatMultimeterV: string;
  vbatTelemetryV: string;
  irRangeWhiteCm: string;
  irRangeStealthCm: string;
  adcBlackLd: string;
  adcBlackLe: string;
  adcWhiteLd: string;
  adcWhiteLe: string;
  adc2GlitchNotes: string;
  sprint50cmSec: string;
  edgeStopDistCm: string;
  muStaticForceN: string;
  stallForceN: string;
  notes: string;
}

const DEFAULT_MEASUREMENTS: MeasurementRecord = {
  massKg: '0.50',
  trackWidthCm: '9.0',
  botRadiusCm: '5.2',
  hbridgeModel: '',
  supportsShortBrake: false,
  vbatMultimeterV: '',
  vbatTelemetryV: '',
  irRangeWhiteCm: '',
  irRangeStealthCm: '',
  adcBlackLd: '',
  adcBlackLe: '',
  adcWhiteLd: '',
  adcWhiteLe: '',
  adc2GlitchNotes: '',
  sprint50cmSec: '',
  edgeStopDistCm: '',
  muStaticForceN: '',
  stallForceN: '',
  notes: '',
};

const STORAGE_KEYS = {
  lastDeviceId: 'sumo.lastDeviceId',
  autoConnect: 'sumo.autoConnect',
  measurements: 'sumo.measurements',
} as const;

const DEFAULT_TELEMETRY: TelemetryData = {
  velocreta: 235,
  velocgiro: 195,
  HBEvasao: true,
  limiarParado: 0.15,
  limiarEmpurrado: -0.25,
  Vbat: 0,
  sen_dir: 0,
  sen_centro_dir: 0,
  sen_centro_esq: 0,
  sen_esq: 0,
  sensorLD: 2000,
  sensorLE: 2000,
  timestamp: 0,
};

const DEFAULT_INFO: RobotInfoData = {
  estrategia: 1,
  matchState: 0,
  imuOnline: false,
  ax: 0,
  ay: 0,
  gz: 0,
  headingDeg: 0,
  linhaLimiarDir: 250,
  linhaLimiarEsq: 250,
  irStartDelayMs: 0,
  firmwareBranch: 'unknown',
  timestamp: 0,
};

interface SumoStore {
  phase: ConnectionPhase;
  statusDetail: string;
  isSimulation: boolean;
  autoConnect: boolean;
  lastDeviceId: string | null;
  connectedDevice: DiscoveredRobot | null;
  discoveredDevices: DiscoveredRobot[];
  telemetry: TelemetryData;
  info: RobotInfoData;
  logs: ConsoleEntry[];
  measurements: MeasurementRecord;

  // Lifecycle & connection
  initTransport: () => void;
  startAutoConnect: () => Promise<void>;
  connectDevice: (device: DiscoveredRobot) => Promise<void>;
  disconnect: () => Promise<void>;
  setAutoConnect: (enabled: boolean) => void;
  toggleSimulation: (enabled: boolean) => void;

  // Robot commands
  sendRaw: (cmd: string) => Promise<void>;
  setStrategy: (id: StrategyId) => Promise<void>;
  saveTuning: (params: {
    velocreta: number;
    velocgiro: number;
    HBEvasao: boolean;
    limiarParado: number;
    limiarEmpurrado: number;
    irStartDelayMs: number;
  }) => Promise<void>;
  applyPreset: (preset: TournamentPreset) => Promise<void>;
  emergencyStop: () => Promise<void>;
  calibrateAll: () => Promise<void>;
  calibrateImu: () => Promise<void>;
  resetRobotConfig: () => Promise<void>;
  benchJog: (dir: BenchJogDirection) => Promise<void>;
  clearLogs: () => void;

  // Measurements persistence
  updateMeasurement: <K extends keyof MeasurementRecord>(key: K, value: MeasurementRecord[K]) => void;
  exportMeasurementsMarkdown: () => string;
}

let transport: SumoBleTransport | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollTick = 0;

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function makeLog(dir: ConsoleEntry['dir'], text: string): ConsoleEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dir,
    text,
    time: nowTimeStr(),
  };
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export const useSumoStore = create<SumoStore>((set, get) => {
  const appendLog = (dir: ConsoleEntry['dir'], text: string) => {
    set((s) => ({
      logs: [makeLog(dir, text), ...s.logs].slice(0, 80),
    }));
  };

  const handleIncomingLine = (line: string) => {
    const dados = parseDadosLine(line);
    if (dados) {
      set({ telemetry: dados });
      return;
    }
    const info = parseInfoLine(line);
    if (info) {
      set({ info });
      transport?.setRobotReadyHint(info.matchState === 1 || info.matchState === 2);
      return;
    }
    appendLog('rx', line);
  };

  const startPolling = () => {
    stopPolling();
    pollTick = 0;
    pollTimer = setInterval(() => {
      const state = get();
      if (state.phase !== 'connected') return;
      pollTick += 1;
      if (state.isSimulation) {
        const t = state.telemetry;
        const simVbat = Number((7.95 + Math.sin(pollTick / 5) * 0.12).toFixed(2));
        const activeCenter = pollTick % 6 < 3 ? 1 : 0;
        const raw = `${t.velocreta}|${t.velocgiro}|${t.HBEvasao ? 1 : 0}|${t.limiarParado}|${t.limiarEmpurrado}|${simVbat}|0|${activeCenter}|${activeCenter}|0|${1980 + (pollTick % 40)}|${2020 - (pollTick % 35)}`;
        handleIncomingLine(raw);
        if (pollTick % 2 === 0) {
          const inf = state.info;
          handleIncomingLine(
            `INFO|est=${inf.estrategia}|state=${inf.matchState}|imu=1|ax=0.04|ay=-0.02|gz=0.3|hdg=${((pollTick * 3) % 360).toFixed(1)}|ldThr=${inf.linhaLimiarDir}|leThr=${inf.linhaLimiarEsq}|ird=${inf.irStartDelayMs}|fw=exper`,
          );
        }
        return;
      }
      void transport?.sendCommand(cmdRequestTelemetry());
      if (pollTick % 2 === 0) {
        void transport?.sendCommand(cmdRequestInfo());
      }
    }, 450);
  };

  const sendCmd = async (cmd: string) => {
    const state = get();
    appendLog('tx', cmd);

    if (state.isSimulation) {
      const clean = cmd.replace(/\*$/, '');
      const [key, val] = clean.split(',');
      if (key === 'EST' && val) {
        const id = Number.parseInt(val, 10) as StrategyId;
        set((s) => ({ info: { ...s.info, estrategia: id } }));
      } else if (key === 'VR' && val) {
        set((s) => ({ telemetry: { ...s.telemetry, velocreta: Number.parseInt(val, 10) } }));
      } else if (key === 'VG' && val) {
        set((s) => ({ telemetry: { ...s.telemetry, velocgiro: Number.parseInt(val, 10) } }));
      } else if (key === 'HBE' && val) {
        set((s) => ({ telemetry: { ...s.telemetry, HBEvasao: val === '1' } }));
      } else if (key === 'LIP' && val) {
        set((s) => ({ telemetry: { ...s.telemetry, limiarParado: Number.parseFloat(val) } }));
      } else if (key === 'LIE' && val) {
        set((s) => ({ telemetry: { ...s.telemetry, limiarEmpurrado: Number.parseFloat(val) } }));
      } else if (key === 'IRD' && val) {
        set((s) => ({ info: { ...s.info, irStartDelayMs: Number.parseInt(val, 10) } }));
      } else if (key === 'CAL') {
        set((s) => ({ info: { ...s.info, linhaLimiarDir: 580, linhaLimiarEsq: 590 } }));
        appendLog('rx', 'SIM: Calibração de linha + IMU concluída');
      } else if (key === 'RESET_CFG') {
        set({ telemetry: { ...DEFAULT_TELEMETRY, Vbat: 8.05 }, info: { ...DEFAULT_INFO, imuOnline: true, firmwareBranch: 'exper' } });
      }
      return;
    }

    if (!transport || state.phase !== 'connected') {
      appendLog('sys', `Sem conexão BLE para enviar ${cmd}`);
      return;
    }
    const ok = await transport.sendCommand(cmd);
    if (!ok) {
      appendLog('sys', `Falha no envio BLE: ${cmd}`);
    }
  };

  const savedLastId = getItem<string>(STORAGE_KEYS.lastDeviceId);
  const savedAuto = getItem<boolean>(STORAGE_KEYS.autoConnect);
  const savedMeasurements = getItem<MeasurementRecord>(STORAGE_KEYS.measurements);

  return {
    phase: 'disconnected',
    statusDetail: 'Pronto para conectar via BLE (Android & iOS)',
    isSimulation: false,
    autoConnect: savedAuto ?? true,
    lastDeviceId: savedLastId,
    connectedDevice: null,
    discoveredDevices: [],
    telemetry: DEFAULT_TELEMETRY,
    info: DEFAULT_INFO,
    logs: [makeLog('sys', 'SumoApp BLE NUS inicializado')],
    measurements: { ...DEFAULT_MEASUREMENTS, ...(savedMeasurements ?? {}) },

    initTransport: () => {
      if (transport) return;
      transport = new SumoBleTransport({
        onPhaseChange: (phase, detail) => {
          set({ phase, statusDetail: detail ?? '' });
          if (phase === 'in_combat' || phase === 'error' || phase === 'permissions_denied') {
            appendLog('sys', detail ?? phase);
          }
        },
        onDeviceDiscovered: (dev) => {
          set((s) => {
            const exists = s.discoveredDevices.some((d) => d.id === dev.id);
            return {
              discoveredDevices: exists
                ? s.discoveredDevices.map((d) => (d.id === dev.id ? dev : d))
                : [dev, ...s.discoveredDevices],
            };
          });
        },
        onConnected: (dev) => {
          void setItem(STORAGE_KEYS.lastDeviceId, dev.id);
          set({ connectedDevice: dev, lastDeviceId: dev.id });
          appendLog('sys', `Conectado a ${dev.name} (${dev.id})`);
          void transport?.sendCommand(cmdRequestInfo());
          void transport?.sendCommand(cmdRequestTelemetry());
          startPolling();
        },
        onDisconnected: (wasCombat) => {
          stopPolling();
          set({ connectedDevice: null });
          appendLog(
            'sys',
            wasCombat
              ? 'Robô entrou em combate (BLE desligado). Aguardando STOP para reconectar.'
              : 'Robô desconectado.',
          );
        },
        onLineReceived: handleIncomingLine,
      });

      const s = get();
      transport.setAutoConnectConfig({
        enabled: s.autoConnect,
        targetName: DEFAULT_DEVICE_NAME,
        preferredDeviceId: s.lastDeviceId,
      });

      if (s.autoConnect && !s.isSimulation) {
        void transport.startAutoScan().catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Erro ao iniciar scan BLE';
          set({ phase: 'error', statusDetail: msg });
        });
      }
    },

    startAutoConnect: async () => {
      if (get().isSimulation) {
        set({
          phase: 'connected',
          statusDetail: 'Modo Simulador ativo',
          connectedDevice: { id: 'SIM-BLE-NUS', name: `${DEFAULT_DEVICE_NAME} (Sim)`, rssi: -48 },
        });
        startPolling();
        return;
      }
      get().initTransport();
      await transport?.startAutoScan();
    },

    connectDevice: async (dev) => {
      get().initTransport();
      await transport?.connectById(dev.id, dev.name, dev.rssi);
    },

    disconnect: async () => {
      stopPolling();
      if (get().isSimulation) {
        set({ phase: 'disconnected', statusDetail: 'Simulador pausado', connectedDevice: null });
        return;
      }
      await transport?.disconnect();
    },

    setAutoConnect: (enabled) => {
      void setItem(STORAGE_KEYS.autoConnect, enabled);
      set({ autoConnect: enabled });
      transport?.setAutoConnectConfig({ enabled, preferredDeviceId: get().lastDeviceId });
      if (enabled && get().phase === 'disconnected' && !get().isSimulation) {
        void transport?.startAutoScan();
      }
    },

    toggleSimulation: (enabled) => {
      stopPolling();
      if (enabled) {
        void transport?.disconnect();
        set({
          isSimulation: true,
          phase: 'connected',
          statusDetail: 'Simulador BLE local ativo (sem robô físico)',
          connectedDevice: { id: 'SIM-BLE-NUS', name: `${DEFAULT_DEVICE_NAME} (Sim)`, rssi: -45 },
          info: { ...get().info, imuOnline: true, firmwareBranch: 'exper' },
        });
        startPolling();
      } else {
        set({
          isSimulation: false,
          phase: 'disconnected',
          statusDetail: 'Pronto para buscar robô via BLE',
          connectedDevice: null,
        });
        if (get().autoConnect) {
          get().initTransport();
          void transport?.startAutoScan();
        }
      }
    },

    sendRaw: sendCmd,

    setStrategy: async (id) => {
      await sendCmd(cmdStrategy(id));
      await sendCmd(cmdRequestInfo());
    },

    saveTuning: async (p) => {
      await sendCmd(cmdStraightSpeed(p.velocreta));
      await sendCmd(cmdTurnSpeed(p.velocgiro));
      await sendCmd(cmdHbevasao(p.HBEvasao));
      await sendCmd(cmdStalledThreshold(p.limiarParado));
      await sendCmd(cmdPushedThreshold(p.limiarEmpurrado));
      await sendCmd(cmdIrStartDelay(p.irStartDelayMs));
      await sendCmd(cmdRequestTelemetry());
      await sendCmd(cmdRequestInfo());
    },

    applyPreset: async (preset) => {
      await sendCmd(cmdStrategy(preset.estrategia));
      await sendCmd(cmdStraightSpeed(preset.velocreta));
      await sendCmd(cmdTurnSpeed(preset.velocgiro));
      await sendCmd(cmdHbevasao(preset.HBEvasao));
      await sendCmd(cmdStalledThreshold(preset.limiarParado));
      await sendCmd(cmdPushedThreshold(preset.limiarEmpurrado));
      await sendCmd(cmdRequestTelemetry());
      await sendCmd(cmdRequestInfo());
    },

    emergencyStop: async () => {
      await sendCmd(cmdEmergencyStop());
      await sendCmd(cmdRequestInfo());
    },

    calibrateAll: async () => {
      await sendCmd(cmdCalibrateAll());
    },

    calibrateImu: async () => {
      await sendCmd(cmdCalibrateImu());
    },

    resetRobotConfig: async () => {
      await sendCmd(cmdResetConfig());
      await sendCmd(cmdRequestTelemetry());
    },

    benchJog: async (dir) => {
      await sendCmd(cmdBenchJog(dir));
    },

    clearLogs: () => set({ logs: [] }),

    updateMeasurement: (key, value) => {
      set((s) => {
        const next = { ...s.measurements, [key]: value };
        void setItem(STORAGE_KEYS.measurements, next);
        return { measurements: next };
      });
    },

    exportMeasurementsMarkdown: () => {
      const m = get().measurements;
      return [
        '# Medições Físicas — Sumo_Auto_ESP32',
        `- Massa: ${m.massKg} kg | Bitola: ${m.trackWidthCm} cm | Raio: ${m.botRadiusCm} cm`,
        `- Ponte H: ${m.hbridgeModel || 'não informada'} | Short-Brake suportado: ${m.supportsShortBrake ? 'SIM' : 'NÃO'}`,
        `- Bateria: Multímetro=${m.vbatMultimeterV || '?'} V | Telemetria=${m.vbatTelemetryV || '?'} V`,
        `- Alcance IR: Alvo claro=${m.irRangeWhiteCm || '?'} cm | Stealth preto=${m.irRangeStealthCm || '?'} cm`,
        `- Linha ADC Preto: LD=${m.adcBlackLd || '?'} / LE=${m.adcBlackLe || '?'}`,
        `- Linha ADC Branco: LD=${m.adcWhiteLd || '?'} / LE=${m.adcWhiteLe || '?'}`,
        `- GPIO 27 (ADC2) notas: ${m.adc2GlitchNotes || '—'}`,
        `- Reta 50 cm: ${m.sprint50cmSec || '?'} s | Parada na borda: ${m.edgeStopDistCm || '?'} cm`,
        `- Força atrito estático: ${m.muStaticForceN || '?'} N | Stall PWM 255: ${m.stallForceN || '?'} N`,
        `- Observações: ${m.notes || '—'}`,
      ].join('\n');
    },
  };
});
