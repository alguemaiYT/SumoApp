import {
  BLE_NUS_RX_UUID,
  BLE_NUS_SERVICE_UUID,
  BLE_NUS_TX_UUID,
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
  LineAccumulator,
  parseDadosLine,
  parseInfoLine,
  STRATEGIES,
} from '../protocol';
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from '../base64';

describe('SumoApp BLE NUS Base64 & Protocol', () => {
  test('UTF-8 <-> Base64 roundtrip including ASCII commands and Portuguese text', () => {
    const samples = ['EST,6*', 'LIE,-0.25*', 'dados*', 'INFO*', 'Sumô Autônomo ESP32'];
    for (const s of samples) {
      expect(decodeBase64ToUtf8(encodeUtf8ToBase64(s))).toBe(s);
    }
  });

  test('NUS UUIDs match ESP32 NimBLE firmware constants', () => {
    expect(BLE_NUS_SERVICE_UUID).toBe('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
    expect(BLE_NUS_RX_UUID).toBe('6e400002-b5a3-f393-e0a9-e50e24dcca9e');
    expect(BLE_NUS_TX_UUID).toBe('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  });

  test('command builders clamp values and preserve negative floats', () => {
    expect(cmdStrategy(6)).toBe('EST,6*');
    expect(cmdStraightSpeed(300)).toBe('VR,255*');
    expect(cmdStraightSpeed(-10)).toBe('VR,0*');
    expect(cmdTurnSpeed(195)).toBe('VG,195*');
    expect(cmdHbevasao(true)).toBe('HBE,1*');
    expect(cmdHbevasao(false)).toBe('HBE,0*');
    expect(cmdStalledThreshold(0.15)).toBe('LIP,0.15*');
    expect(cmdPushedThreshold(-0.25)).toBe('LIE,-0.25*');
    expect(cmdIrStartDelay(0)).toBe('IRD,0*');
    expect(cmdIrStartDelay(5000)).toBe('IRD,5000*');
    expect(cmdIrStartDelay(99999)).toBe('IRD,10000*');
    expect(cmdEmergencyStop()).toBe('PARADA*');
    expect(cmdRequestTelemetry()).toBe('dados*');
    expect(cmdRequestInfo()).toBe('INFO*');
    expect(cmdCalibrateAll()).toBe('CAL*');
    expect(cmdCalibrateImu()).toBe('IMU_CAL*');
    expect(cmdResetConfig()).toBe('RESET_CFG*');
    expect(cmdBenchJog('FRENTE')).toBe('FRENTE*');
    expect(cmdBenchJog('ESQ')).toBe('ESQ*');
  });

  test('defines all 7 strategies aligned with firmware EST,1..7*', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('parses 12-field pipe-separated dados* line accurately', () => {
    const parsed = parseDadosLine('240|180|1|0.15|-0.25|7.82|0|1|0|1|315|425', 1000);
    expect(parsed).toEqual({
      velocreta: 240,
      velocgiro: 180,
      HBEvasao: true,
      limiarParado: 0.15,
      limiarEmpurrado: -0.25,
      Vbat: 7.82,
      sen_dir: 0,
      sen_centro_dir: 1,
      sen_centro_esq: 0,
      sen_esq: 1,
      sensorLD: 315,
      sensorLE: 425,
      timestamp: 1000,
    });
  });

  test('rejects malformed or INFO lines in parseDadosLine', () => {
    expect(parseDadosLine('240|180|1')).toBeNull();
    expect(parseDadosLine('INFO|est=1|state=0')).toBeNull();
    expect(parseDadosLine('')).toBeNull();
  });

  test('parses extended INFO* telemetry line accurately', () => {
    const info = parseInfoLine(
      'INFO|est=6|state=1|imu=1|ax=0.12|ay=-0.05|gz=12.4|hdg=91.5|ldThr=410|leThr=420|ird=5000|fw=exper',
      2000,
    );
    expect(info).toEqual({
      estrategia: 6,
      matchState: 1,
      imuOnline: true,
      ax: 0.12,
      ay: -0.05,
      gz: 12.4,
      headingDeg: 91.5,
      linhaLimiarDir: 410,
      linhaLimiarEsq: 420,
      irStartDelayMs: 5000,
      firmwareBranch: 'exper',
      timestamp: 2000,
    });
  });

  test('LineAccumulator reassembles fragmented BLE notifications', () => {
    const acc = new LineAccumulator();
    expect(acc.push('235|195|1|0.15|')).toEqual([]);
    expect(acc.push('-0.25|8.05|0|1|1|0|2010|1990\r\nINFO|est=1')).toEqual([
      '235|195|1|0.15|-0.25|8.05|0|1|1|0|2010|1990',
    ]);
    expect(acc.push('|state=0|imu=0|fw=debug\n')).toEqual(['INFO|est=1|state=0|imu=0|fw=debug']);
  });
});
