// Protocol contract strictly synchronized with `alguemaiYT/Sumo_Auto_ESP32` (`config.h` & `Bluetooth.ino`)

export const BLE_NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_NUS_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_NUS_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const DEFAULT_DEVICE_NAME = 'Madinboo_BT';

export type MatchStateCode = 0 | 1 | 2 | 3;
export type LineBorderMode = 0 | 1 | 2 | 3;

export const LINE_BORDER_MODE_LABELS: Record<LineBorderMode, string> = {
  0: 'OFF',
  1: 'SÓ DIR',
  2: 'SÓ ESQ',
  3: 'AMBOS',
};

export const MATCH_STATE_LABELS: Record<MatchStateCode, string> = {
  0: 'PRÉ-PARTIDA (IDLE)',
  1: 'ARMADO (READY)',
  2: 'EM COMBATE',
  3: 'PARADA (STOP)',
};

export type StrategyId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  shortTag: string;
  description: string;
  bestAgainst: string;
  dangerLevel: 'safe' | 'balanced' | 'aggressive' | 'extreme';
}

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: 1,
    name: 'Radar',
    shortTag: 'BUSCA ATIVA',
    description: 'Varredura angular ativa com pulsos curtos de avanço e travamento proporcional de 16 estados.',
    bestAgainst: 'Oponentes desconhecidos e lutas gerais',
    dangerLevel: 'balanced',
  },
  {
    id: 2,
    name: 'Caçador',
    shortTag: 'S-CURVE',
    description: 'Avanço em arco S varrendo o centro do dohyō para pressionar robôs defensivos.',
    bestAgainst: 'Robôs passivos / Edge Waiters',
    dangerLevel: 'balanced',
  },
  {
    id: 3,
    name: 'Firula Esq',
    shortTag: 'FINTA ← ESQ',
    description: 'Finta curta inicial recuando à esquerda para induzir overshoot de chargers e contra-atacar o flanco.',
    bestAgainst: 'Chargers frontais muito rápidos',
    dangerLevel: 'aggressive',
  },
  {
    id: 4,
    name: 'Suicida',
    shortTag: 'BLITZ 255',
    description: 'Largada agressiva em potência máxima (255 PWM) com ganhos mais rápidos de perseguição.',
    bestAgainst: 'Robôs lentos ou quando sua rampa é mais baixa',
    dangerLevel: 'extreme',
  },
  {
    id: 5,
    name: 'Só Vai',
    shortTag: 'CARGA RETA',
    description: 'Investida frontal estabilizada pelo giroscópio (heading lock) com escape direcional na borda.',
    bestAgainst: 'Alinhamento frente a frente no centro',
    dangerLevel: 'aggressive',
  },
  {
    id: 6,
    name: 'Contorno Esq',
    shortTag: 'FLANCO ← ESQ',
    description: 'Abertura em curva pelo flanco esquerdo com giro interno à direita para atingir lateral/traseira.',
    bestAgainst: 'Robôs mais pesados ou com rampa frontal forte',
    dangerLevel: 'balanced',
  },
  {
    id: 7,
    name: 'Segue Linha',
    shortTag: 'CALIBRAÇÃO',
    description: 'Modo seguro de bancada/dohyō para validar sensores LD/LE seguindo a borda sem cair.',
    bestAgainst: 'Teste de sensores de borda (não usar em luta)',
    dangerLevel: 'safe',
  },
  {
    id: 8,
    name: 'Espera',
    shortTag: 'PULSOS 800MS',
    description: 'Espreita ativa: fica imóvel por 800ms, avança num pulso reto de 110ms (2–3 cm) e dá o bote em 255 PWM ao detectar o oponente.',
    bestAgainst: 'Chargers agressivos e robôs que esperam contato',
    dangerLevel: 'balanced',
  },
  {
    id: 9,
    name: 'Contorno Dir',
    shortTag: 'FLANCO → DIR',
    description: 'Espelho do Contorno Esq: abertura em curva pelo flanco direito com giro interno à esquerda.',
    bestAgainst: 'Robôs pesados ou que abrem pela esquerda',
    dangerLevel: 'balanced',
  },
  {
    id: 10,
    name: 'Firula Dir',
    shortTag: 'FINTA → DIR',
    description: 'Espelho da Firula Esq: finta curta inicial à direita e snap rápido no flanco direito.',
    bestAgainst: 'Chargers frontais ou que desviam à direita',
    dangerLevel: 'aggressive',
  },
];

export interface TournamentPreset {
  id: string;
  name: string;
  subtitle: string;
  estrategia: StrategyId;
  velocreta: number;
  velocgiro: number;
  HBEvasao: boolean;
  limiarParado: number;
  limiarEmpurrado: number;
}

export const TOURNAMENT_PRESETS: TournamentPreset[] = [
  {
    id: 'balanced',
    name: 'Padrão Competição',
    subtitle: 'Radar + evasão IMU equilibrada',
    estrategia: 1,
    velocreta: 235,
    velocgiro: 195,
    HBEvasao: true,
    limiarParado: 0.15,
    limiarEmpurrado: -0.25,
  },
  {
    id: 'anti-charger',
    name: 'Anti-Charger / Pesado',
    subtitle: 'Contorno de flanco + juke rápido',
    estrategia: 6,
    velocreta: 245,
    velocgiro: 215,
    HBEvasao: true,
    limiarParado: 0.18,
    limiarEmpurrado: -0.2,
  },
  {
    id: 'anti-stealth',
    name: 'Anti-Stealth / Passivo',
    subtitle: 'Caçador S-curve varrendo o centro',
    estrategia: 2,
    velocreta: 230,
    velocgiro: 210,
    HBEvasao: true,
    limiarParado: 0.15,
    limiarEmpurrado: -0.25,
  },
  {
    id: 'full-ram',
    name: 'Blitz Máxima',
    subtitle: 'Suicida 255 PWM força total',
    estrategia: 4,
    velocreta: 255,
    velocgiro: 225,
    HBEvasao: true,
    limiarParado: 0.15,
    limiarEmpurrado: -0.25,
  },
];

export interface TelemetryData {
  velocreta: number;
  velocgiro: number;
  HBEvasao: boolean;
  limiarParado: number;
  limiarEmpurrado: number;
  Vbat: number;
  sen_dir: number;
  sen_centro_dir: number;
  sen_centro_esq: number;
  sen_esq: number;
  sensorLD: number;
  sensorLE: number;
  timestamp: number;
}

export interface RobotInfoData {
  estrategia: StrategyId;
  matchState: MatchStateCode;
  imuOnline: boolean;
  ax: number;
  ay: number;
  az: number;
  gz: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  linhaLimiarDir: number;
  linhaLimiarEsq: number;
  lineWhiteIsLow: boolean;
  lineCalFlags: number;
  lineSensorMode: LineBorderMode;
  nvsOk: boolean;
  irStartDelayMs: number;
  firmwareBranch: 'debug' | 'exper' | 'unknown';
  timestamp: number;
}

export interface LineCalEvent {
  kind: 'preto' | 'branco';
  ok: boolean;
  ld: number;
  le: number;
  cDir?: number;
  cEsq?: number;
  ldThr: number;
  leThr: number;
  whiteIsLow: boolean;
  calFlags: number;
  nvsOk: boolean;
  timestamp: number;
}

export function isLineEdgeDetected(
  adc: number,
  threshold: number,
  whiteIsLow: boolean,
): boolean {
  return whiteIsLow ? adc <= threshold : adc >= threshold;
}

export type BenchJogDirection = 'FRENTE' | 'RE' | 'ESQ' | 'DIR';
export type BenchMotorSide = 'E' | 'D';
export type BenchMotorDir = -1 | 0 | 1;

export interface Lipo2sHealth {
  cellV: number;
  pct: number;
  level: 'none' | 'usb' | 'critical' | 'low' | 'ok';
}

export function lipo2sStatus(vbat: number): Lipo2sHealth {
  if (!Number.isFinite(vbat) || vbat <= 0.1) {
    return { cellV: 0, pct: 0, level: 'none' };
  }
  const cellV = Number((vbat / 2).toFixed(2));
  if (vbat < 5.2) {
    return { cellV, pct: 0, level: 'usb' };
  }
  // Realistic 2S LiPo discharge curve (6.60V=0%, 7.00V=15%, 7.40V=45%, 7.80V=75%, 8.40V=100%)
  let pct = 0;
  if (vbat <= 6.6) pct = 0;
  else if (vbat < 7.0) pct = ((vbat - 6.6) / 0.4) * 15;
  else if (vbat < 7.4) pct = 15 + ((vbat - 7.0) / 0.4) * 30;
  else if (vbat < 7.8) pct = 45 + ((vbat - 7.4) / 0.4) * 30;
  else if (vbat < 8.4) pct = 75 + ((vbat - 7.8) / 0.6) * 25;
  else pct = 100;

  const level: Lipo2sHealth['level'] =
    vbat < 7.1 ? 'critical' : vbat < 7.4 ? 'low' : 'ok';

  return { cellV, pct: Math.round(pct), level };
}

export function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

// Command builders (note: NO wireless match-start command — official autonomous sumo rule!)
export const cmdStrategy = (id: StrategyId): string => `EST,${clampInt(id, 1, 10)}*`;
export const cmdStraightSpeed = (pwm: number): string => `VR,${clampInt(pwm, 0, 255)}*`;
export const cmdTurnSpeed = (pwm: number): string => `VG,${clampInt(pwm, 0, 255)}*`;
export const cmdHbevasao = (enabled: boolean): string => `HBE,${enabled ? 1 : 0}*`;
export const cmdLineBorderMode = (mode: LineBorderMode): string =>
  `LBM,${clampInt(mode, 0, 3)}*`;
export const cmdStalledThreshold = (val: number): string =>
  `LIP,${Number.isFinite(val) ? Number(val.toFixed(3)) : 0.15}*`;
export const cmdPushedThreshold = (val: number): string =>
  `LIE,${Number.isFinite(val) ? Number(val.toFixed(3)) : -0.25}*`;
export const cmdIrStartDelay = (ms: number): string => `IRD,${clampInt(ms, 0, 10000)}*`;
export const cmdEmergencyStop = (): string => 'PARADA*';
export const cmdRequestTelemetry = (): string => 'dados*';
export const cmdRequestInfo = (): string => 'INFO*';
export const cmdCalibrateAll = (): string => 'CAL*';
export const cmdCalibrateBlack = (): string => 'CAL_PRETO*';
export const cmdCalibrateWhite = (): string => 'CAL_BRANCO*';
export const cmdLineCalTest = (enabled: boolean): string => `CAL_TEST,${enabled ? 1 : 0}*`;
export const cmdLineThresholds = (
  ldThr: number,
  leThr: number,
  whiteIsLow?: boolean,
): string => {
  const ld = clampInt(ldThr, 120, 3900);
  const le = clampInt(leThr, 120, 3900);
  return whiteIsLow === undefined
    ? `LINHA_THR,${ld},${le}*`
    : `LINHA_THR,${ld},${le},${whiteIsLow ? 1 : 0}*`;
};
export const cmdBenchSpeed = (pwm: number): string => `BVEL,${clampInt(pwm, 0, 255)}*`;
export const cmdCalibrateImu = (): string => 'IMU_CAL*';
export const cmdZeroYaw = (): string => 'ZERO_YAW*';
export const cmdStreamTelemetry = (enabled: boolean): string => `STREAM,${enabled ? 1 : 0}*`;
export const cmdResetConfig = (): string => 'RESET_CFG*';
export const cmdBenchJog = (dir: BenchJogDirection): string => `${dir}*`;
export const cmdBenchMotor = (side: BenchMotorSide, dir: BenchMotorDir): string =>
  `MOT_${side},${dir}*`;

export function parseDadosLine(raw: string, now = Date.now()): TelemetryData | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('INFO|')) return null;

  const parts = trimmed.split('|');
  if (parts.length !== 12) return null;

  const velocreta = Number.parseInt(parts[0], 10);
  const velocgiro = Number.parseInt(parts[1], 10);
  const hbeRaw = parts[2].trim().toLowerCase();
  const limiarParado = Number.parseFloat(parts[3]);
  const limiarEmpurrado = Number.parseFloat(parts[4]);
  const Vbat = Number.parseFloat(parts[5]);
  const sen_dir = Number.parseInt(parts[6], 10);
  const sen_centro_dir = Number.parseInt(parts[7], 10);
  const sen_centro_esq = Number.parseInt(parts[8], 10);
  const sen_esq = Number.parseInt(parts[9], 10);
  const sensorLD = Number.parseInt(parts[10], 10);
  const sensorLE = Number.parseInt(parts[11], 10);

  if (
    [
      velocreta,
      velocgiro,
      limiarParado,
      limiarEmpurrado,
      Vbat,
      sen_dir,
      sen_centro_dir,
      sen_centro_esq,
      sen_esq,
      sensorLD,
      sensorLE,
    ].some((n) => !Number.isFinite(n))
  ) {
    return null;
  }

  return {
    velocreta,
    velocgiro,
    HBEvasao: hbeRaw === '1' || hbeRaw === 'true',
    limiarParado,
    limiarEmpurrado,
    Vbat,
    sen_dir: sen_dir ? 1 : 0,
    sen_centro_dir: sen_centro_dir ? 1 : 0,
    sen_centro_esq: sen_centro_esq ? 1 : 0,
    sen_esq: sen_esq ? 1 : 0,
    sensorLD,
    sensorLE,
    timestamp: now,
  };
}

export function parseInfoLine(raw: string, now = Date.now()): RobotInfoData | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('INFO|')) return null;

  const map: Record<string, string> = {};
  for (const token of trimmed.slice(5).split('|')) {
    const eq = token.indexOf('=');
    if (eq > 0) {
      map[token.slice(0, eq)] = token.slice(eq + 1);
    }
  }

  const est = Number.parseInt(map.est ?? '', 10);
  const state = Number.parseInt(map.state ?? '', 10);
  if (!Number.isFinite(est) || est < 1 || est > 10) return null;
  if (!Number.isFinite(state) || state < 0 || state > 3) return null;

  const fwRaw = map.fw ?? '';
  const firmwareBranch: RobotInfoData['firmwareBranch'] =
    fwRaw === 'debug' || fwRaw === 'exper' ? fwRaw : 'unknown';

  const ax = Number.parseFloat(map.ax ?? '0') || 0;
  const ay = Number.parseFloat(map.ay ?? '0') || 0;
  const rawAz = map.az !== undefined ? Number.parseFloat(map.az) : Number.NaN;
  const az = Number.isFinite(rawAz) ? rawAz : 9.81;
  const gz = Number.parseFloat(map.gz ?? '0') || 0;
  const headingDeg = Number.parseFloat(map.hdg ?? '0') || 0;

  const rawPitch = map.pitch !== undefined ? Number.parseFloat(map.pitch) : Number.NaN;
  const rawRoll = map.roll !== undefined ? Number.parseFloat(map.roll) : Number.NaN;
  const pitchDeg = Number.isFinite(rawPitch)
    ? rawPitch
    : Number(((Math.asin(Math.max(-1, Math.min(1, ax / 9.81))) * 180) / Math.PI).toFixed(1));
  const rollDeg = Number.isFinite(rawRoll)
    ? rawRoll
    : Number(((Math.asin(Math.max(-1, Math.min(1, ay / 9.81))) * 180) / Math.PI).toFixed(1));

  const rawLbm = map.lbm !== undefined ? Number.parseInt(map.lbm, 10) : Number.NaN;
  const lineSensorMode: LineBorderMode =
    rawLbm === 0 || rawLbm === 1 || rawLbm === 2 || rawLbm === 3 ? rawLbm : 3;

  return {
    estrategia: est as StrategyId,
    matchState: state as MatchStateCode,
    imuOnline: map.imu === '1',
    ax,
    ay,
    az,
    gz,
    headingDeg,
    pitchDeg,
    rollDeg,
    linhaLimiarDir: Number.parseInt(map.ldThr ?? '250', 10) || 250,
    linhaLimiarEsq: Number.parseInt(map.leThr ?? '250', 10) || 250,
    lineWhiteIsLow: map.wLow !== undefined ? map.wLow !== '0' : true,
    lineCalFlags: Number.parseInt(map.lCal ?? '0', 10) || 0,
    lineSensorMode,
    nvsOk: map.nvs !== undefined ? map.nvs !== '0' : true,
    irStartDelayMs: Number.parseInt(map.ird ?? '0', 10) || 0,
    firmwareBranch,
    timestamp: now,
  };
}

export function parseLineCalEvent(raw: string, now = Date.now()): LineCalEvent | null {
  const trimmed = raw.trim();
  const isPreto = trimmed.startsWith('CAL_PRETO|');
  const isBranco = trimmed.startsWith('CAL_BRANCO|');
  if (!isPreto && !isBranco) return null;

  const prefixLen = isPreto ? 10 : 11;
  const map: Record<string, string> = {};
  for (const token of trimmed.slice(prefixLen).split('|')) {
    const eq = token.indexOf('=');
    if (eq > 0) {
      map[token.slice(0, eq)] = token.slice(eq + 1);
    }
  }

  const ld = Number.parseInt(map.ld ?? '', 10);
  const le = Number.parseInt(map.le ?? '', 10);
  const ldThr = Number.parseInt(map.ldThr ?? '', 10);
  const leThr = Number.parseInt(map.leThr ?? '', 10);
  if (![ld, le, ldThr, leThr].every((n) => Number.isFinite(n))) {
    return null;
  }

  const cDirRaw = map.cDir !== undefined ? Number.parseInt(map.cDir, 10) : Number.NaN;
  const cEsqRaw = map.cEsq !== undefined ? Number.parseInt(map.cEsq, 10) : Number.NaN;

  return {
    kind: isPreto ? 'preto' : 'branco',
    ok: map.ok !== undefined ? map.ok !== '0' : true,
    ld,
    le,
    cDir: Number.isFinite(cDirRaw) ? cDirRaw : undefined,
    cEsq: Number.isFinite(cEsqRaw) ? cEsqRaw : undefined,
    ldThr,
    leThr,
    whiteIsLow: map.wLow !== undefined ? map.wLow !== '0' : true,
    calFlags: Number.parseInt(map.cal ?? '0', 10) || 0,
    nvsOk: map.nvs !== undefined ? map.nvs !== '0' : true,
    timestamp: now,
  };
}

export class LineAccumulator {
  private buffer = '';

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];
    let idx = this.buffer.indexOf('\n');
    while (idx !== -1) {
      const line = this.buffer.slice(0, idx).replace(/\r$/, '');
      if (line.length > 0) {
        lines.push(line);
      }
      this.buffer = this.buffer.slice(idx + 1);
      idx = this.buffer.indexOf('\n');
    }
    if (this.buffer.length > 512) {
      this.buffer = this.buffer.slice(-256);
    }
    return lines;
  }

  reset(): void {
    this.buffer = '';
  }
}
