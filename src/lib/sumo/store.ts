import { AppState, type AppStateStatus, Vibration } from 'react-native';
import { create } from 'zustand';

import { getItem, setItem } from '@/lib/storage';

import type { ConnectionPhase, DiscoveredRobot } from './ble-transport';
import { SumoBleTransport } from './ble-transport';
import type {
  BenchJogDirection,
  BenchMotorDir,
  BenchMotorSide,
  LineBorderMode,
  LineCalEvent,
  LineSweepProgress,
  RobotInfoData,
  StrategyId,
  TelemetryData,
  TournamentPreset,
} from './protocol';
import {
  cmdBenchJog,
  cmdBenchMotor,
  cmdBenchSpeed,
  cmdCalibrateAll,
  cmdCalibrateBlack,
  cmdCalibrateImu,
  cmdCalibrateSweep,
  cmdCalibrateWhite,
  cmdEmergencyStop,
  cmdHbevasao,
  cmdIrStartDelay,
  cmdLineBorderMode,
  cmdLineCalTest,
  cmdPushedThreshold,
  cmdRequestInfo,
  cmdRequestTelemetry,
  cmdResetConfig,
  cmdStalledThreshold,
  cmdStraightSpeed,
  cmdStrategy,
  cmdStreamTelemetry,
  cmdTurnSpeed,
  cmdZeroYaw,
  DEFAULT_DEVICE_NAME,
  isLineEdgeDetected,
  parseDadosLine,
  parseInfoLine,
  parseLineCalEvent,
  parseLineSweepProgress,
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
  highContrast: 'sumo.highContrast',
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
  az: 9.81,
  gz: 0,
  headingDeg: 0,
  pitchDeg: 0,
  rollDeg: 0,
  linhaLimiarDir: 250,
  linhaLimiarEsq: 250,
  lineWhiteIsLow: true,
  lineCalFlags: 0,
  lineSensorMode: 3,
  nvsOk: true,
  irStartDelayMs: 0,
  firmwareBranch: 'unknown',
  timestamp: 0,
};

export interface SensorLatchCounts {
  se: number;
  sce: number;
  scd: number;
  sd: number;
}

const DEFAULT_SENSOR_LATCH: SensorLatchCounts = { se: 0, sce: 0, scd: 0, sd: 0 };

interface SumoStore {
  phase: ConnectionPhase;
  statusDetail: string;
  isSimulation: boolean;
  autoConnect: boolean;
  highContrast: boolean;
  hapticOnDetect: boolean;
  stream3dActive: boolean;
  activePulseMotor: string | null;
  sensorLatch: SensorLatchCounts;
  lastDeviceId: string | null;
  connectedDevice: DiscoveredRobot | null;
  discoveredDevices: DiscoveredRobot[];
  telemetry: TelemetryData;
  info: RobotInfoData;
  lastLineCalEvent: LineCalEvent | null;
  lineSweep: LineSweepProgress | null;
  lineTestActive: boolean;
  logs: ConsoleEntry[];
  measurements: MeasurementRecord;

  // Lifecycle & connection
  initTransport: () => void;
  startAutoConnect: () => Promise<void>;
  connectDevice: (device: DiscoveredRobot) => Promise<void>;
  disconnect: () => Promise<void>;
  setAutoConnect: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setHapticOnDetect: (enabled: boolean) => void;
  resetSensorLatch: () => void;
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
  calibrateBlack: () => Promise<void>;
  calibrateWhite: () => Promise<void>;
  startLineSweep: (durationMs?: number) => Promise<void>;
  cancelLineSweep: () => Promise<void>;
  setLineBorderMode: (mode: LineBorderMode) => Promise<void>;
  setLineCalTest: (enabled: boolean) => Promise<void>;
  calibrateImu: () => Promise<void>;
  zeroYaw: () => Promise<void>;
  setStream3d: (enabled: boolean) => Promise<void>;
  resetRobotConfig: () => Promise<void>;
  benchJog: (dir: BenchJogDirection) => Promise<void>;
  benchMotorPulse: (side: BenchMotorSide, dir: BenchMotorDir, durationMs?: number) => Promise<void>;
  setBenchSpeed: (vr: number, vg: number) => Promise<void>;
  setManualBenchSpeed: (pwm: number) => Promise<void>;
  sendDriveCommand: (cmd: string) => Promise<void>;
  clearLogs: () => void;

  // Measurements persistence
  updateMeasurement: <K extends keyof MeasurementRecord>(key: K, value: MeasurementRecord[K]) => void;
  captureTelemetryToMeasurements: (mode: 'black' | 'white' | 'vbat') => void;
  exportMeasurementsMarkdown: () => string;
}

export interface LiveTelemetrySnapshot {
  connected: boolean;
  appActive: boolean;
  telemetry: TelemetryData;
  info: RobotInfoData;
}

type LiveTelemetryListener = (snap: LiveTelemetrySnapshot) => void;

const UI_COMMIT_INTERVAL_MS = 140;

let transport: SumoBleTransport | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let simSweepTimer: ReturnType<typeof setInterval> | null = null;
let motorPulseTimer: ReturnType<typeof setTimeout> | null = null;
let uiFlushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;
let pollTick = 0;

let liveAppActive = true;
let liveConnected = false;
let liveTelemetry: TelemetryData = DEFAULT_TELEMETRY;
let liveInfo: RobotInfoData = DEFAULT_INFO;
let pendingTelemetry: TelemetryData | null = null;
let pendingInfo: RobotInfoData | null = null;
let pendingLatchDelta: SensorLatchCounts | null = null;
const liveListeners = new Set<LiveTelemetryListener>();

export function getLiveTelemetrySnapshot(): LiveTelemetrySnapshot {
  return {
    connected: liveConnected,
    appActive: liveAppActive,
    telemetry: liveTelemetry,
    info: liveInfo,
  };
}

export function subscribeLiveTelemetry(listener: LiveTelemetryListener): () => void {
  liveListeners.add(listener);
  return () => {
    liveListeners.delete(listener);
  };
}

function notifyLiveListeners(): void {
  if (liveListeners.size === 0) return;
  const snap = getLiveTelemetrySnapshot();
  liveListeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {
      // keep telemetry bus resilient
    }
  });
}

function clearUiFlushTimer(): void {
  if (uiFlushTimer) {
    clearTimeout(uiFlushTimer);
    uiFlushTimer = null;
  }
}

function clearMotorPulseTimer(): void {
  if (motorPulseTimer) {
    clearTimeout(motorPulseTimer);
    motorPulseTimer = null;
  }
}

function clearSimSweepTimer(): void {
  if (simSweepTimer) {
    clearInterval(simSweepTimer);
    simSweepTimer = null;
  }
}

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

  const flushUiUpdates = () => {
    clearUiFlushTimer();
    const nextTel = pendingTelemetry;
    const nextInfo = pendingInfo;
    const latchDelta = pendingLatchDelta;
    pendingTelemetry = null;
    pendingInfo = null;
    pendingLatchDelta = null;
    if (!nextTel && !nextInfo && !latchDelta) return;

    set((s) => {
      const patch: Partial<SumoStore> = {};
      if (nextTel) patch.telemetry = nextTel;
      if (nextInfo) patch.info = nextInfo;
      if (latchDelta) {
        patch.sensorLatch = {
          se: s.sensorLatch.se + latchDelta.se,
          sce: s.sensorLatch.sce + latchDelta.sce,
          scd: s.sensorLatch.scd + latchDelta.scd,
          sd: s.sensorLatch.sd + latchDelta.sd,
        };
      }
      return patch;
    });
  };

  const scheduleUiFlush = (immediate: boolean) => {
    if (!liveAppActive) return;
    if (immediate) {
      flushUiUpdates();
      return;
    }
    if (!uiFlushTimer) {
      uiFlushTimer = setTimeout(flushUiUpdates, UI_COMMIT_INTERVAL_MS);
    }
  };

  const handleIncomingLine = (line: string) => {
    const dados = parseDadosLine(line);
    if (dados) {
      const prev = liveTelemetry;
      const seRise = prev.sen_esq === 0 && dados.sen_esq === 1;
      const sceRise = prev.sen_centro_esq === 0 && dados.sen_centro_esq === 1;
      const scdRise = prev.sen_centro_dir === 0 && dados.sen_centro_dir === 1;
      const sdRise = prev.sen_dir === 0 && dados.sen_dir === 1;
      const anyRise = seRise || sceRise || scdRise || sdRise;

      if (anyRise && liveAppActive && get().hapticOnDetect) {
        try {
          Vibration?.vibrate?.(25);
        } catch {
          // ignore on non-native environments
        }
      }

      const prevLeEdge = isLineEdgeDetected(
        prev.sensorLE,
        liveInfo.linhaLimiarEsq,
        liveInfo.lineWhiteIsLow,
      );
      const prevLdEdge = isLineEdgeDetected(
        prev.sensorLD,
        liveInfo.linhaLimiarDir,
        liveInfo.lineWhiteIsLow,
      );
      const nextLeEdge = isLineEdgeDetected(
        dados.sensorLE,
        liveInfo.linhaLimiarEsq,
        liveInfo.lineWhiteIsLow,
      );
      const nextLdEdge = isLineEdgeDetected(
        dados.sensorLD,
        liveInfo.linhaLimiarDir,
        liveInfo.lineWhiteIsLow,
      );

      const discreteChanged =
        prev.sen_esq !== dados.sen_esq ||
        prev.sen_centro_esq !== dados.sen_centro_esq ||
        prev.sen_centro_dir !== dados.sen_centro_dir ||
        prev.sen_dir !== dados.sen_dir ||
        prevLeEdge !== nextLeEdge ||
        prevLdEdge !== nextLdEdge ||
        prev.velocreta !== dados.velocreta ||
        prev.velocgiro !== dados.velocgiro ||
        prev.HBEvasao !== dados.HBEvasao ||
        prev.limiarParado !== dados.limiarParado ||
        prev.limiarEmpurrado !== dados.limiarEmpurrado;

      liveTelemetry = dados;
      pendingTelemetry = dados;
      if (anyRise) {
        const cur = pendingLatchDelta ?? { se: 0, sce: 0, scd: 0, sd: 0 };
        pendingLatchDelta = {
          se: cur.se + (seRise ? 1 : 0),
          sce: cur.sce + (sceRise ? 1 : 0),
          scd: cur.scd + (scdRise ? 1 : 0),
          sd: cur.sd + (sdRise ? 1 : 0),
        };
      }

      notifyLiveListeners();
      scheduleUiFlush(discreteChanged);
      return;
    }
    const info = parseInfoLine(line);
    if (info) {
      const prev = liveInfo;
      const discreteChanged =
        prev.estrategia !== info.estrategia ||
        prev.matchState !== info.matchState ||
        prev.imuOnline !== info.imuOnline ||
        prev.linhaLimiarDir !== info.linhaLimiarDir ||
        prev.linhaLimiarEsq !== info.linhaLimiarEsq ||
        prev.lineWhiteIsLow !== info.lineWhiteIsLow ||
        prev.lineCalFlags !== info.lineCalFlags ||
        prev.lineSensorMode !== info.lineSensorMode ||
        prev.nvsOk !== info.nvsOk ||
        prev.irStartDelayMs !== info.irStartDelayMs ||
        prev.firmwareBranch !== info.firmwareBranch;

      liveInfo = info;
      pendingInfo = info;
      transport?.setRobotReadyHint(info.matchState === 1 || info.matchState === 2);
      notifyLiveListeners();
      scheduleUiFlush(discreteChanged);
      return;
    }
    const sweepProg = parseLineSweepProgress(line, get().lineSweep?.durationMs ?? 8000);
    if (sweepProg) {
      set({ lineSweep: sweepProg.active ? sweepProg : null });
      return;
    }
    const calEvt = parseLineCalEvent(line);
    if (calEvt) {
      if (calEvt.kind === 'sweep') {
        try {
          Vibration?.vibrate?.(calEvt.ok ? [0, 45, 60, 75] : 90);
        } catch {
          // ignore on non-native environments
        }
      }
      set({
        lastLineCalEvent: calEvt,
        ...(calEvt.kind === 'sweep' ? { lineSweep: null } : {}),
      });
      appendLog('rx', line);
      return;
    }
    if (line.trim().startsWith('CAL_TEST|')) {
      set({ lineTestActive: line.includes('active=1') });
      appendLog('rx', line);
      return;
    }
    appendLog('rx', line);
  };

  const startPolling = () => {
    stopPolling();
    if (!liveAppActive) return;
    pollTick = 0;
    pollTimer = setInterval(() => {
      if (!liveAppActive) return;
      const state = get();
      if (state.phase !== 'connected') return;
      pollTick += 1;
      if (state.isSimulation) {
        const t = liveTelemetry;
        const simVbat = Number((7.95 + Math.sin(pollTick / 5) * 0.12).toFixed(2));
        const activeCenter = pollTick % 6 < 3 ? 1 : 0;
        const raw = `${t.velocreta}|${t.velocgiro}|${t.HBEvasao ? 1 : 0}|${t.limiarParado}|${t.limiarEmpurrado}|${simVbat}|0|${activeCenter}|${activeCenter}|0|${1980 + (pollTick % 40)}|${2020 - (pollTick % 35)}`;
        handleIncomingLine(raw);
        const inf = liveInfo;
        const simPitch = Number((Math.sin(pollTick / 5) * 14.0).toFixed(1));
        const simRoll = Number((Math.cos(pollTick / 6) * 7.5).toFixed(1));
        const simAz = Number((9.81 * Math.cos((simPitch * Math.PI) / 180)).toFixed(2));
        handleIncomingLine(
          `INFO|est=${inf.estrategia}|state=${inf.matchState}|imu=1|ax=0.04|ay=-0.02|az=${simAz}|gz=0.3|hdg=${((pollTick * 4) % 360).toFixed(1)}|pitch=${simPitch}|roll=${simRoll}|ldThr=${inf.linhaLimiarDir}|leThr=${inf.linhaLimiarEsq}|ird=${inf.irStartDelayMs}|fw=exper|wLow=${inf.lineWhiteIsLow ? 1 : 0}|lCal=${inf.lineCalFlags}|nvs=1|lbm=${inf.lineSensorMode}`,
        );
        return;
      }
      // When firmware STREAM,1* or 8s QTR sweep is active, ESP32 pushes frames on its own
      if (state.stream3dActive || state.lineSweep?.active) {
        return;
      }
      // Alternate single non-overlapping coalescable writes (~2 Hz each, zero GATT contention)
      if (pollTick % 2 === 0) {
        void transport?.sendCommand(cmdRequestTelemetry(), { coalescable: true });
      } else {
        void transport?.sendCommand(cmdRequestInfo(), { coalescable: true });
      }
    }, 260);
  };

  const sendCmd = async (cmd: string, opts?: { urgent?: boolean }) => {
    const state = get();
    appendLog('tx', cmd);

    if (state.isSimulation) {
      const clean = cmd.replace(/\*$/, '');
      const [key, val] = clean.split(',');
      if (key === 'EST' && val) {
        const id = Number.parseInt(val, 10) as StrategyId;
        liveInfo = { ...liveInfo, estrategia: id };
        set((s) => ({ info: { ...s.info, estrategia: id } }));
      } else if (key === 'VR' && val) {
        const n = Number.parseInt(val, 10);
        liveTelemetry = { ...liveTelemetry, velocreta: n };
        set((s) => ({ telemetry: { ...s.telemetry, velocreta: n } }));
      } else if (key === 'VG' && val) {
        const n = Number.parseInt(val, 10);
        liveTelemetry = { ...liveTelemetry, velocgiro: n };
        set((s) => ({ telemetry: { ...s.telemetry, velocgiro: n } }));
      } else if (key === 'HBE' && val) {
        const b = val === '1';
        liveTelemetry = { ...liveTelemetry, HBEvasao: b };
        set((s) => ({ telemetry: { ...s.telemetry, HBEvasao: b } }));
      } else if (key === 'LBM' && val !== undefined) {
        const parsed = Number.parseInt(val, 10);
        const mode: LineBorderMode =
          parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3 ? parsed : 3;
        liveInfo = { ...liveInfo, lineSensorMode: mode, nvsOk: true };
        set((s) => ({ info: { ...s.info, lineSensorMode: mode, nvsOk: true } }));
        appendLog('rx', `SIM: Proteção de borda branca LBM=${mode} salva na NVS`);
      } else if (key === 'LIP' && val) {
        const f = Number.parseFloat(val);
        liveTelemetry = { ...liveTelemetry, limiarParado: f };
        set((s) => ({ telemetry: { ...s.telemetry, limiarParado: f } }));
      } else if (key === 'LIE' && val) {
        const f = Number.parseFloat(val);
        liveTelemetry = { ...liveTelemetry, limiarEmpurrado: f };
        set((s) => ({ telemetry: { ...s.telemetry, limiarEmpurrado: f } }));
      } else if (key === 'IRD' && val) {
        const n = Number.parseInt(val, 10);
        liveInfo = { ...liveInfo, irStartDelayMs: n };
        set((s) => ({ info: { ...s.info, irStartDelayMs: n } }));
      } else if (key === 'CAL') {
        liveInfo = { ...liveInfo, linhaLimiarDir: 580, linhaLimiarEsq: 590, lineCalFlags: 1, nvsOk: true };
        set((s) => ({
          info: { ...s.info, linhaLimiarDir: 580, linhaLimiarEsq: 590, lineCalFlags: 1, nvsOk: true },
        }));
        appendLog('rx', 'SIM: Calibração de linha + IMU concluída');
      } else if (key === 'CAL_PRETO') {
        liveInfo = { ...liveInfo, linhaLimiarDir: 900, linhaLimiarEsq: 910, lineCalFlags: liveInfo.lineCalFlags | 1, nvsOk: true };
        const evt: LineCalEvent = {
          kind: 'preto',
          ok: true,
          ld: 2010,
          le: 2030,
          ldThr: 900,
          leThr: 910,
          whiteIsLow: true,
          calFlags: liveInfo.lineCalFlags,
          nvsOk: true,
          timestamp: Date.now(),
        };
        set((s) => ({ info: { ...s.info, ...liveInfo }, lastLineCalEvent: evt }));
        appendLog('rx', 'SIM: CAL_PRETO salvo na NVS');
      } else if (key === 'CAL_BRANCO') {
        liveInfo = { ...liveInfo, linhaLimiarDir: 1020, linhaLimiarEsq: 1035, lineWhiteIsLow: true, lineCalFlags: 3, nvsOk: true };
        const evt: LineCalEvent = {
          kind: 'branco',
          ok: true,
          ld: 180,
          le: 195,
          cDir: 1830,
          cEsq: 1835,
          ldThr: 1020,
          leThr: 1035,
          whiteIsLow: true,
          calFlags: 3,
          nvsOk: true,
          timestamp: Date.now(),
        };
        set((s) => ({ info: { ...s.info, ...liveInfo }, lastLineCalEvent: evt }));
        appendLog('rx', 'SIM: CAL_BRANCO 2 pontos salvo na NVS');
      } else if (key === 'CAL_SWEEP') {
        clearSimSweepTimer();
        const dur = val !== undefined ? Number.parseInt(val, 10) : 8000;
        if (dur <= 0) {
          set({ lineSweep: null });
          appendLog('rx', 'SIM: Calibração QTR 8s cancelada');
        } else {
          let rem = dur;
          set({
            lineSweep: {
              active: true,
              remainingMs: dur,
              durationMs: dur,
              ld: 2010,
              ldMin: 2010,
              ldMax: 2010,
              le: 2030,
              leMin: 2030,
              leMax: 2030,
              timestamp: Date.now(),
            },
          });
          simSweepTimer = setInterval(() => {
            rem = Math.max(0, rem - 250);
            const sweptWhite = rem < dur - 800;
            const curLd = rem % 500 < 250 ? 295 : 3090;
            const curLe = rem % 500 < 250 ? 315 : 3180;
            if (rem > 0) {
              handleIncomingLine(
                `CAL_SWEEP_PROG|active=1|ms=${rem}|ld=${curLd}|ldMin=${sweptWhite ? 295 : 2010}|ldMax=3090|le=${curLe}|leMin=${sweptWhite ? 315 : 2030}|leMax=3180`,
              );
            } else {
              clearSimSweepTimer();
              liveInfo = {
                ...liveInfo,
                linhaLimiarDir: 1636,
                linhaLimiarEsq: 1690,
                lineWhiteIsLow: true,
                lineCalFlags: 3,
                nvsOk: true,
              };
              set((s) => ({ info: { ...s.info, ...liveInfo } }));
              handleIncomingLine(
                'CAL_SWEEP|ok=1|ldMin=295|ldMax=3090|leMin=315|leMax=3180|cDir=2795|cEsq=2865|ldThr=1636|leThr=1690|wLow=1|cal=3|nvs=1',
              );
            }
          }, 250);
        }
      } else if (key === 'CAL_TEST') {
        const active = val === '1';
        set({ lineTestActive: active });
        appendLog('rx', `SIM: Teste LEDs borda ${active ? 'ATIVO' : 'DESLIGADO'}`);
      } else if (key === 'BVEL') {
        appendLog('rx', `SIM: Velocidade manual temporária PWM=${val ?? '0'} (NVS preservada)`);
      } else if (key === 'IMU_CAL' || key === 'ZERO_YAW') {
        liveInfo = { ...liveInfo, headingDeg: 0, gz: 0 };
        set((s) => ({ info: { ...s.info, headingDeg: 0, gz: 0 } }));
        appendLog('rx', key === 'ZERO_YAW' ? 'SIM: Yaw zerado (0.0°)' : 'SIM: IMU calibrada');
      } else if (key === 'MOT_E' || key === 'MOT_D') {
        appendLog('rx', `SIM: Motor ${key === 'MOT_E' ? 'Esquerdo' : 'Direito'} dir=${val ?? '0'}`);
      } else if (key === 'RESET_CFG') {
        liveTelemetry = { ...DEFAULT_TELEMETRY, Vbat: 8.05 };
        liveInfo = { ...DEFAULT_INFO, imuOnline: true, firmwareBranch: 'exper' };
        set({ telemetry: liveTelemetry, info: liveInfo });
      }
      notifyLiveListeners();
      return;
    }

    if (!transport || state.phase !== 'connected') {
      appendLog('sys', `Sem conexão BLE para enviar ${cmd}`);
      return;
    }
    const ok = await transport.sendCommand(cmd, { urgent: opts?.urgent });
    if (!ok) {
      appendLog('sys', `Falha no envio BLE: ${cmd}`);
    }
  };

  const savedLastId = getItem<string>(STORAGE_KEYS.lastDeviceId);
  const savedAuto = getItem<boolean>(STORAGE_KEYS.autoConnect);
  const savedHighContrast = getItem<boolean>(STORAGE_KEYS.highContrast);
  const savedMeasurements = getItem<MeasurementRecord>(STORAGE_KEYS.measurements);

  return {
    phase: 'disconnected',
    statusDetail: 'Pronto para conectar',
    isSimulation: false,
    autoConnect: savedAuto ?? true,
    highContrast: savedHighContrast ?? false,
    hapticOnDetect: false,
    stream3dActive: false,
    activePulseMotor: null,
    sensorLatch: DEFAULT_SENSOR_LATCH,
    lastDeviceId: savedLastId,
    connectedDevice: null,
    discoveredDevices: [],
    telemetry: DEFAULT_TELEMETRY,
    info: DEFAULT_INFO,
    lastLineCalEvent: null,
    lineSweep: null,
    lineTestActive: false,
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
          liveConnected = true;
          void setItem(STORAGE_KEYS.lastDeviceId, dev.id);
          set({ connectedDevice: dev, lastDeviceId: dev.id });
          appendLog('sys', `Conectado a ${dev.name} (${dev.id})`);
          void transport?.sendCommand(cmdRequestInfo());
          void transport?.sendCommand(cmdRequestTelemetry());
          if (liveAppActive && get().stream3dActive) {
            void transport?.sendCommand(cmdStreamTelemetry(true));
          }
          notifyLiveListeners();
          startPolling();
        },
        onDisconnected: (wasCombat) => {
          liveConnected = false;
          stopPolling();
          clearSimSweepTimer();
          clearUiFlushTimer();
          set({ connectedDevice: null, lineTestActive: false, lineSweep: null });
          notifyLiveListeners();
          appendLog(
            'sys',
            wasCombat
              ? 'Robô entrou em combate (BLE desligado). Aguardando STOP para reconectar.'
              : 'Robô desconectado.',
          );
        },
        onLineReceived: handleIncomingLine,
      });

      if (!appStateSub && typeof AppState?.addEventListener === 'function') {
        liveAppActive = AppState.currentState === 'active';
        appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
          const active = nextState === 'active';
          if (active === liveAppActive) return;
          liveAppActive = active;
          const st = get();
          if (!active) {
            stopPolling();
            clearUiFlushTimer();
            if (!st.isSimulation && st.phase === 'connected' && st.stream3dActive && transport) {
              void transport.sendCommand(cmdStreamTelemetry(false));
            }
          } else {
            flushUiUpdates();
            if (st.phase === 'connected') {
              if (!st.isSimulation && st.stream3dActive && transport) {
                void transport.sendCommand(cmdStreamTelemetry(true));
              }
              startPolling();
            }
          }
          notifyLiveListeners();
        });
      }

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
        liveConnected = true;
        set({
          phase: 'connected',
          statusDetail: 'Modo Simulador ativo',
          connectedDevice: { id: 'SIM-BLE-NUS', name: `${DEFAULT_DEVICE_NAME} (Sim)`, rssi: -48 },
        });
        notifyLiveListeners();
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
      clearUiFlushTimer();
      liveConnected = false;
      if (get().isSimulation) {
        set({ phase: 'disconnected', statusDetail: 'Simulador pausado', connectedDevice: null });
        notifyLiveListeners();
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

    setHighContrast: (enabled) => {
      void setItem(STORAGE_KEYS.highContrast, enabled);
      set({ highContrast: enabled });
    },

    setHapticOnDetect: (enabled) => {
      set({ hapticOnDetect: enabled });
    },

    resetSensorLatch: () => {
      set({ sensorLatch: DEFAULT_SENSOR_LATCH });
    },

    toggleSimulation: (enabled) => {
      stopPolling();
      clearUiFlushTimer();
      if (enabled) {
        void transport?.disconnect();
        liveConnected = true;
        liveInfo = { ...liveInfo, imuOnline: true, firmwareBranch: 'exper' };
        set({
          isSimulation: true,
          phase: 'connected',
          statusDetail: 'Simulador BLE local ativo (sem robô físico)',
          connectedDevice: { id: 'SIM-BLE-NUS', name: `${DEFAULT_DEVICE_NAME} (Sim)`, rssi: -45 },
          info: liveInfo,
        });
        notifyLiveListeners();
        startPolling();
      } else {
        liveConnected = false;
        set({
          isSimulation: false,
          phase: 'disconnected',
          statusDetail: 'Pronto para buscar robô via BLE',
          connectedDevice: null,
        });
        notifyLiveListeners();
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
      clearMotorPulseTimer();
      clearSimSweepTimer();
      set({ activePulseMotor: null, lineTestActive: false, lineSweep: null });
      await sendCmd(cmdEmergencyStop(), { urgent: true });
      await sendCmd(cmdRequestInfo());
    },

    calibrateAll: async () => {
      await sendCmd(cmdCalibrateAll());
    },

    calibrateBlack: async () => {
      await sendCmd(cmdCalibrateBlack());
    },

    calibrateWhite: async () => {
      await sendCmd(cmdCalibrateWhite());
    },

    startLineSweep: async (durationMs = 8000) => {
      const s = get();
      if (!s.isSimulation && s.phase === 'connected') {
        set({
          lineSweep: {
            active: true,
            remainingMs: durationMs,
            durationMs,
            ld: liveTelemetry.sensorLD,
            ldMin: 4095,
            ldMax: 0,
            le: liveTelemetry.sensorLE,
            leMin: 4095,
            leMax: 0,
            timestamp: Date.now(),
          },
        });
      }
      await sendCmd(cmdCalibrateSweep(durationMs));
    },

    cancelLineSweep: async () => {
      clearSimSweepTimer();
      set({ lineSweep: null });
      await sendCmd(cmdCalibrateSweep(0));
    },

    setLineBorderMode: async (mode) => {
      liveInfo = { ...liveInfo, lineSensorMode: mode };
      set((s) => ({ info: { ...s.info, lineSensorMode: mode } }));
      await sendCmd(cmdLineBorderMode(mode));
    },

    setLineCalTest: async (enabled) => {
      set({ lineTestActive: enabled });
      await sendCmd(cmdLineCalTest(enabled));
    },

    calibrateImu: async () => {
      await sendCmd(cmdCalibrateImu());
    },

    zeroYaw: async () => {
      await sendCmd(cmdZeroYaw());
    },

    setStream3d: async (enabled) => {
      const prev = get().stream3dActive;
      if (prev === enabled) return;
      set({ stream3dActive: enabled });
      const s = get();
      if (!s.isSimulation && s.phase === 'connected' && transport && (liveAppActive || !enabled)) {
        await transport.sendCommand(cmdStreamTelemetry(enabled));
      }
    },

    resetRobotConfig: async () => {
      await sendCmd(cmdResetConfig());
      await sendCmd(cmdRequestTelemetry());
    },

    benchJog: async (dir) => {
      clearMotorPulseTimer();
      set({ activePulseMotor: null });
      await sendCmd(cmdBenchJog(dir));
    },

    benchMotorPulse: async (side, dir, durationMs = 1000) => {
      clearMotorPulseTimer();
      const tag = `${side}:${dir}`;
      set({ activePulseMotor: tag });
      await sendCmd(cmdBenchMotor(side, dir));
      motorPulseTimer = setTimeout(() => {
        motorPulseTimer = null;
        set({ activePulseMotor: null });
        void sendCmd(cmdEmergencyStop(), { urgent: true });
      }, durationMs);
    },

    setBenchSpeed: async (vr, vg) => {
      await sendCmd(cmdStraightSpeed(vr));
      await sendCmd(cmdTurnSpeed(vg));
      await sendCmd(cmdRequestTelemetry());
    },

    setManualBenchSpeed: async (pwm) => {
      await sendCmd(cmdBenchSpeed(pwm));
    },

    sendDriveCommand: async (cmd) => {
      clearMotorPulseTimer();
      if (get().activePulseMotor !== null) {
        set({ activePulseMotor: null });
      }
      const state = get();
      if (state.isSimulation) {
        return;
      }
      if (!transport || state.phase !== 'connected') {
        return;
      }
      await transport.sendCommand(cmd, { urgent: cmd === 'PARADA*' });
    },

    clearLogs: () => set({ logs: [] }),

    updateMeasurement: (key, value) => {
      set((s) => {
        const next = { ...s.measurements, [key]: value };
        void setItem(STORAGE_KEYS.measurements, next);
        return { measurements: next };
      });
    },

    captureTelemetryToMeasurements: (mode) => {
      const t = get().telemetry;
      set((s) => {
        const next = { ...s.measurements };
        if (mode === 'black') {
          next.adcBlackLd = String(t.sensorLD);
          next.adcBlackLe = String(t.sensorLE);
        } else if (mode === 'white') {
          next.adcWhiteLd = String(t.sensorLD);
          next.adcWhiteLe = String(t.sensorLE);
        } else if (mode === 'vbat') {
          next.vbatTelemetryV = t.Vbat.toFixed(2);
        }
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
        `- GPIO 26 (ADC2) notas: ${m.adc2GlitchNotes || '—'}`,
        `- Reta 50 cm: ${m.sprint50cmSec || '?'} s | Parada na borda: ${m.edgeStopDistCm || '?'} cm`,
        `- Força atrito estático: ${m.muStaticForceN || '?'} N | Stall PWM 255: ${m.stallForceN || '?'} N`,
        `- Observações: ${m.notes || '—'}`,
      ].join('\n');
    },
  };
});
