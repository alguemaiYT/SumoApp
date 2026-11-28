import {
  BLE_NUS_RX_UUID,
  BLE_NUS_SERVICE_UUID,
  BLE_NUS_TX_UUID,
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
  cmdLineThresholds,
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
  isLineEdgeDetected,
  LineAccumulator,
  lipo2sStatus,
  parseDadosLine,
  parseInfoLine,
  parseLineCalEvent,
  parseLineSweepProgress,
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
    expect(cmdLineBorderMode(0)).toBe('LBM,0*');
    expect(cmdLineBorderMode(2)).toBe('LBM,2*');
    expect(cmdLineBorderMode(3)).toBe('LBM,3*');
    expect(cmdStalledThreshold(0.15)).toBe('LIP,0.15*');
    expect(cmdPushedThreshold(-0.25)).toBe('LIE,-0.25*');
    expect(cmdIrStartDelay(0)).toBe('IRD,0*');
    expect(cmdIrStartDelay(5000)).toBe('IRD,5000*');
    expect(cmdIrStartDelay(99999)).toBe('IRD,10000*');
    expect(cmdEmergencyStop()).toBe('PARADA*');
    expect(cmdRequestTelemetry()).toBe('dados*');
    expect(cmdRequestInfo()).toBe('INFO*');
    expect(cmdCalibrateAll()).toBe('CAL*');
    expect(cmdCalibrateBlack()).toBe('CAL_PRETO*');
    expect(cmdCalibrateWhite()).toBe('CAL_BRANCO*');
    expect(cmdCalibrateSweep()).toBe('CAL_SWEEP,8000*');
    expect(cmdCalibrateSweep(0)).toBe('CAL_SWEEP,0*');
    expect(cmdLineCalTest(true)).toBe('CAL_TEST,1*');
    expect(cmdLineCalTest(false)).toBe('CAL_TEST,0*');
    expect(cmdLineThresholds(1550, 1620)).toBe('LINHA_THR,1550,1620*');
    expect(cmdLineThresholds(1550, 1620, false)).toBe('LINHA_THR,1550,1620,0*');
    expect(cmdBenchSpeed(120)).toBe('BVEL,120*');
    expect(cmdCalibrateImu()).toBe('IMU_CAL*');
    expect(cmdZeroYaw()).toBe('ZERO_YAW*');
    expect(cmdStreamTelemetry(true)).toBe('STREAM,1*');
    expect(cmdStreamTelemetry(false)).toBe('STREAM,0*');
    expect(cmdResetConfig()).toBe('RESET_CFG*');
    expect(cmdBenchJog('FRENTE')).toBe('FRENTE*');
    expect(cmdBenchJog('ESQ')).toBe('ESQ*');
    expect(cmdBenchMotor('E', 1)).toBe('MOT_E,1*');
    expect(cmdBenchMotor('D', -1)).toBe('MOT_D,-1*');
    expect(cmdBenchMotor('D', 0)).toBe('MOT_D,0*');
  });

  test('defines all 10 strategies aligned with firmware EST,1..10*', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(cmdStrategy(8)).toBe('EST,8*');
    expect(cmdStrategy(10)).toBe('EST,10*');
    const info10 = parseInfoLine(
      'INFO|est=10|state=0|imu=1|ax=0.00|ay=0.00|az=9.81|gz=0.0|hdg=0.0|pitch=0.0|roll=0.0|ldThr=250|leThr=250|ird=0|fw=exper',
      3000,
    );
    expect(info10?.estrategia).toBe(10);
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

  test('parses extended INFO* telemetry line with az, pitch/roll, line cal, NVS and legacy fallback', () => {
    const info = parseInfoLine(
      'INFO|est=6|state=1|imu=1|ax=0.12|ay=-0.05|az=9.78|gz=12.4|hdg=91.5|pitch=35.4|roll=-2.1|ldThr=1560|leThr=1620|ird=5000|fw=exper|wLow=0|lCal=3|nvs=1',
      2000,
    );
    expect(info).toEqual({
      estrategia: 6,
      matchState: 1,
      imuOnline: true,
      ax: 0.12,
      ay: -0.05,
      az: 9.78,
      gz: 12.4,
      headingDeg: 91.5,
      pitchDeg: 35.4,
      rollDeg: -2.1,
      linhaLimiarDir: 1560,
      linhaLimiarEsq: 1620,
      lineWhiteIsLow: false,
      lineCalFlags: 3,
      lineSensorMode: 3,
      nvsOk: true,
      irStartDelayMs: 5000,
      firmwareBranch: 'exper',
      timestamp: 2000,
    });

    // Edge polarity helper handles both normal (white < black) and inverted (white > black)
    expect(isLineEdgeDetected(300, 1560, true)).toBe(true);
    expect(isLineEdgeDetected(3100, 1560, true)).toBe(false);
    expect(isLineEdgeDetected(3100, 1560, false)).toBe(true);
    expect(isLineEdgeDetected(300, 1560, false)).toBe(false);

    // Parses CAL_PRETO and CAL_BRANCO structured replies
    expect(
      parseLineCalEvent(
        'CAL_BRANCO|ok=1|ld=300|le=340|cDir=2800|cEsq=2910|ldThr=1560|leThr=1649|wLow=1|cal=3|nvs=1',
        2200,
      ),
    ).toEqual({
      kind: 'branco',
      ok: true,
      ld: 300,
      le: 340,
      cDir: 2800,
      cEsq: 2910,
      ldThr: 1560,
      leThr: 1649,
      whiteIsLow: true,
      calFlags: 3,
      nvsOk: true,
      timestamp: 2200,
    });

    // Legacy firmware without az/pitch/roll/wLow/lCal/nvs estimates safely
    const legacy = parseInfoLine(
      'INFO|est=1|state=0|imu=1|ax=4.905|ay=0.00|gz=0.0|hdg=0.0|ldThr=250|leThr=250|ird=0|fw=debug',
      2100,
    );
    expect(legacy?.az).toBe(9.81);
    expect(legacy?.pitchDeg).toBe(30);
    expect(legacy?.rollDeg).toBe(0);
    expect(legacy?.lineWhiteIsLow).toBe(true);
    expect(legacy?.lineCalFlags).toBe(0);
    expect(legacy?.lineSensorMode).toBe(3);
    expect(legacy?.nvsOk).toBe(true);

    const lbmOnlyLeft = parseInfoLine(
      'INFO|est=8|state=0|imu=1|ax=0.0|ay=0.0|az=9.81|gz=0.0|hdg=0.0|pitch=0.0|roll=0.0|ldThr=800|leThr=850|ird=0|fw=debug|wLow=1|lCal=3|nvs=1|lbm=2',
      2300,
    );
    expect(lbmOnlyLeft?.lineSensorMode).toBe(2);
    expect(lbmOnlyLeft?.firmwareBranch).toBe('debug');

    // QTR 8s sweep progress + final result parsing
    const prog = parseLineSweepProgress(
      'CAL_SWEEP_PROG|active=1|ms=5400|ld=1900|ldMin=310|ldMax=3120|le=2010|leMin=285|leMax=3240',
      8000,
      2400,
    );
    expect(prog).toEqual({
      active: true,
      remainingMs: 5400,
      durationMs: 8000,
      ld: 1900,
      ldMin: 310,
      ldMax: 3120,
      le: 2010,
      leMin: 285,
      leMax: 3240,
      timestamp: 2400,
    });

    const sweepDone = parseLineCalEvent(
      'CAL_SWEEP|ok=1|ldMin=310|ldMax=3120|leMin=285|leMax=3240|cDir=2810|cEsq=2955|ldThr=1658|leThr=1703|wLow=1|cal=3|nvs=1',
      2500,
    );
    expect(sweepDone).toEqual({
      kind: 'sweep',
      ok: true,
      ld: 310,
      le: 285,
      ldMin: 310,
      ldMax: 3120,
      leMin: 285,
      leMax: 3240,
      cDir: 2810,
      cEsq: 2955,
      ldThr: 1658,
      leThr: 1703,
      whiteIsLow: true,
      calFlags: 3,
      nvsOk: true,
      timestamp: 2500,
    });
  });

  test('computes realistic 2S LiPo health percentage and alert levels', () => {
    expect(lipo2sStatus(0)).toEqual({ cellV: 0, pct: 0, level: 'none' });
    expect(lipo2sStatus(4.9).level).toBe('usb');
    expect(lipo2sStatus(8.4)).toEqual({ cellV: 4.2, pct: 100, level: 'ok' });
    expect(lipo2sStatus(7.8)).toEqual({ cellV: 3.9, pct: 75, level: 'ok' });
    expect(lipo2sStatus(7.2)).toEqual({ cellV: 3.6, pct: 30, level: 'low' });
    expect(lipo2sStatus(6.9).level).toBe('critical');
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
