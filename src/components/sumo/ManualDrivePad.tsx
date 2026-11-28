import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gamepad2,
  Grid2x2,
  RotateCcw,
  Square,
} from 'lucide-react-native';
import * as React from 'react';
import { AppState, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line } from 'react-native-svg';

import { acquireTabSwipeLock, releaseTabSwipeLock } from '@/lib/sumo/gesture-lock';
import { useSumoStore } from '@/lib/sumo/store';

import { DynamicSlider } from './DynamicSlider';

type DriveMode = 'joystick' | 'dpad';
type SectorId = 'CENTER' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type IntensityZone = 'stop' | 'pulse' | 'full';

interface SectorSpec {
  id: SectorId;
  label: string;
  cmd: string;
}

// 8 seamless sectors mapped 100% onto existing ESP32 BLE commands (ZERO firmware changes!)
const SECTORS: Record<SectorId, SectorSpec> = {
  CENTER: { id: 'CENTER', label: 'PARADO', cmd: 'PARADA*' },
  N: { id: 'N', label: 'FRENTE', cmd: 'FRENTE*' },
  NE: { id: 'NE', label: 'ARCO DIR', cmd: 'MOT_E,1*' },
  E: { id: 'E', label: 'GIRO DIR', cmd: 'DIR*' },
  SE: { id: 'SE', label: 'RÉ DIR', cmd: 'MOT_E,-1*' },
  S: { id: 'S', label: 'RÉ', cmd: 'RE*' },
  SW: { id: 'SW', label: 'RÉ ESQ', cmd: 'MOT_D,-1*' },
  W: { id: 'W', label: 'GIRO ESQ', cmd: 'ESQ*' },
  NW: { id: 'NW', label: 'ARCO ESQ', cmd: 'MOT_D,1*' },
};

const SPEED_PRESETS = [
  { pwm: 100, label: '100' },
  { pwm: 160, label: '160' },
  { pwm: 210, label: '210' },
  { pwm: 255, label: '255' },
] as const;

const PAD_SIZE = 164;
const PAD_CENTER = PAD_SIZE / 2;
const MAX_RADIUS = 56;
const DEADZONE_NORM = 0.22;
const FULL_ZONE_NORM = 0.62;
const PULSE_ON_MS = 165;
const PULSE_OFF_MS = 115;

function classifyJoystick(dx: number, dy: number): {
  sector: SectorId;
  zone: IntensityZone;
  normR: number;
  clampedX: number;
  clampedY: number;
} {
  const dist = Math.hypot(dx, dy);
  const clampedDist = Math.min(dist, MAX_RADIUS);
  const scale = dist > 0.001 ? clampedDist / dist : 0;
  const clampedX = dx * scale;
  const clampedY = dy * scale;
  const normR = clampedDist / MAX_RADIUS;

  if (normR < DEADZONE_NORM) {
    return { sector: 'CENTER', zone: 'stop', normR, clampedX, clampedY };
  }

  // Angle where 0° = North (-Y), +90° = East (+X), -90° = West (-X)
  const deg = (Math.atan2(clampedX, -clampedY) * 180) / Math.PI;
  let sector: SectorId = 'N';
  if (deg >= -22.5 && deg < 22.5) sector = 'N';
  else if (deg >= 22.5 && deg < 67.5) sector = 'NE';
  else if (deg >= 67.5 && deg < 112.5) sector = 'E';
  else if (deg >= 112.5 && deg < 157.5) sector = 'SE';
  else if (deg >= 157.5 || deg < -157.5) sector = 'S';
  else if (deg >= -157.5 && deg < -112.5) sector = 'SW';
  else if (deg >= -112.5 && deg < -67.5) sector = 'W';
  else sector = 'NW';

  const zone: IntensityZone = normR >= FULL_ZONE_NORM ? 'full' : 'pulse';
  return { sector, zone, normR, clampedX, clampedY };
}

interface ManualDrivePadProps {
  surface: string;
  divider: string;
}

export const ManualDrivePad = React.memo(function ManualDrivePad({
  surface,
  divider,
}: ManualDrivePadProps) {
  const savedVr = useSumoStore((s) => s.telemetry.velocreta);
  const savedVg = useSumoStore((s) => s.telemetry.velocgiro);
  const activePulseMotor = useSumoStore((s) => s.activePulseMotor);
  const benchJog = useSumoStore((s) => s.benchJog);
  const benchMotorPulse = useSumoStore((s) => s.benchMotorPulse);
  const emergencyStop = useSumoStore((s) => s.emergencyStop);
  const setManualBenchSpeed = useSumoStore((s) => s.setManualBenchSpeed);
  const sendDriveCommand = useSumoStore((s) => s.sendDriveCommand);

  const [driveMode, setDriveMode] = React.useState<DriveMode>('joystick');
  const [speedPwm, setSpeedPwm] = React.useState<number>(savedVr || 180);
  const [benchOverrideActive, setBenchOverrideActive] = React.useState(false);

  const [thumb, setThumb] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeSector, setActiveSector] = React.useState<SectorId>('CENTER');
  const [activeZone, setActiveZone] = React.useState<IntensityZone>('stop');
  const [intensityPct, setIntensityPct] = React.useState(0);

  const currentSectorRef = React.useRef<SectorId>('CENTER');
  const currentZoneRef = React.useRef<IntensityZone>('stop');
  const pulseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulsePhaseOnRef = React.useRef(false);
  const lockedRef = React.useRef(false);

  // Sync slider when robot telemetry updates externally and user hasn't overridden in bench
  React.useEffect(() => {
    if (!benchOverrideActive) {
      setSpeedPwm(savedVr);
    }
  }, [benchOverrideActive, savedVr]);

  const clearPulseLoop = React.useCallback(() => {
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    pulsePhaseOnRef.current = false;
  }, []);

  const releaseLockSafe = React.useCallback(() => {
    if (lockedRef.current) {
      lockedRef.current = false;
      releaseTabSwipeLock();
    }
  }, []);

  const stopJoystickNow = React.useCallback(
    (forceSend = false) => {
      const wasActive = currentSectorRef.current !== 'CENTER' || pulseTimerRef.current !== null;
      clearPulseLoop();
      currentSectorRef.current = 'CENTER';
      currentZoneRef.current = 'stop';
      setThumb({ x: 0, y: 0 });
      setActiveSector('CENTER');
      setActiveZone('stop');
      setIntensityPct(0);
      if (wasActive || forceSend) {
        void sendDriveCommand('PARADA*');
      }
    },
    [clearPulseLoop, sendDriveCommand],
  );

  // Fail-safe stop on unmount or background transition
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        stopJoystickNow(false);
        releaseLockSafe();
      }
    });
    return () => {
      sub.remove();
      stopJoystickNow(false);
      releaseLockSafe();
    };
  }, [releaseLockSafe, stopJoystickNow]);

  const startPulseLoop = React.useCallback(
    (sector: SectorId) => {
      clearPulseLoop();
      const cmd = SECTORS[sector].cmd;
      const stepCycle = () => {
        if (currentSectorRef.current !== sector || currentZoneRef.current !== 'pulse') {
          clearPulseLoop();
          return;
        }
        pulsePhaseOnRef.current = !pulsePhaseOnRef.current;
        if (pulsePhaseOnRef.current) {
          void sendDriveCommand(cmd);
          pulseTimerRef.current = setTimeout(stepCycle, PULSE_ON_MS);
        } else {
          void sendDriveCommand('PARADA*');
          pulseTimerRef.current = setTimeout(stepCycle, PULSE_OFF_MS);
        }
      };
      stepCycle();
    },
    [clearPulseLoop, sendDriveCommand],
  );

  const applyJoystickVector = React.useCallback(
    (xInPad: number, yInPad: number) => {
      const { sector, zone, normR, clampedX, clampedY } = classifyJoystick(
        xInPad - PAD_CENTER,
        yInPad - PAD_CENTER,
      );

      setThumb({ x: clampedX, y: clampedY });
      setIntensityPct(zone === 'stop' ? 0 : Math.round(normR * 100));

      const sectorChanged = sector !== currentSectorRef.current;
      const zoneChanged = zone !== currentZoneRef.current;

      if (!sectorChanged && !zoneChanged) return;

      currentSectorRef.current = sector;
      currentZoneRef.current = zone;
      setActiveSector(sector);
      setActiveZone(zone);

      if (sectorChanged && sector !== 'CENTER') {
        try {
          Vibration.vibrate(10);
        } catch {
          // ignore
        }
      }

      if (zone === 'stop' || sector === 'CENTER') {
        clearPulseLoop();
        void sendDriveCommand('PARADA*');
      } else if (zone === 'full') {
        clearPulseLoop();
        void sendDriveCommand(SECTORS[sector].cmd);
      } else {
        startPulseLoop(sector);
      }
    },
    [clearPulseLoop, sendDriveCommand, startPulseLoop],
  );

  const joyGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (!lockedRef.current) {
            lockedRef.current = true;
            acquireTabSwipeLock();
          }
          applyJoystickVector(e.x, e.y);
        })
        .onUpdate((e) => {
          applyJoystickVector(e.x, e.y);
        })
        .onFinalize(() => {
          releaseLockSafe();
          stopJoystickNow(false);
        }),
    [applyJoystickVector, releaseLockSafe, stopJoystickNow],
  );

  const commitManualSpeed = React.useCallback(
    (pwm: number) => {
      const clamped = Math.max(60, Math.min(255, Math.round(pwm)));
      setBenchOverrideActive(true);
      setSpeedPwm(clamped);
      // Envia BVEL,<pwm>* (somente RAM) para nunca sobrescrever VR/VG salvos na NVS/EEPROM
      void setManualBenchSpeed(clamped);
    },
    [setManualBenchSpeed],
  );

  const restoreCombatSpeed = () => {
    Vibration.vibrate(20);
    setBenchOverrideActive(false);
    setSpeedPwm(savedVr);
    void setManualBenchSpeed(0);
  };

  const activeSpec = SECTORS[activeSector];
  const speedPct = Math.round((speedPwm / 255) * 100);

  return (
    <View style={styles.pane}>
      {/* Top Bar: Mode Switch [Joystick | D-Pad] + Speed Readout */}
      <View style={styles.topRow}>
        <View style={[styles.modeSwitch, { borderColor: divider, backgroundColor: surface }]}>
          <Pressable
            onPress={() => {
              stopJoystickNow(false);
              setDriveMode('joystick');
            }}
            style={[styles.modeBtn, driveMode === 'joystick' && styles.modeBtnActive]}
          >
            <Gamepad2 color={driveMode === 'joystick' ? '#FAFAFA' : '#8E8E98'} size={12} />
            <Text style={[styles.modeText, driveMode === 'joystick' && styles.modeTextActive]}>
              Joystick
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              stopJoystickNow(false);
              setDriveMode('dpad');
            }}
            style={[styles.modeBtn, driveMode === 'dpad' && styles.modeBtnActive]}
          >
            <Grid2x2 color={driveMode === 'dpad' ? '#FAFAFA' : '#8E8E98'} size={12} />
            <Text style={[styles.modeText, driveMode === 'dpad' && styles.modeTextActive]}>
              D-Pad
            </Text>
          </Pressable>
        </View>

        {benchOverrideActive ? (
          <Pressable onPress={restoreCombatSpeed} style={styles.restoreBtn}>
            <RotateCcw color="#F59E0B" size={11} />
            <Text style={styles.restoreText}>
              Usar combate ({savedVr}/{savedVg})
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.safetyHint}>Soltar = PARADA*</Text>
        )}
      </View>

      {/* Manual Speed Selector (Slider + 4 Quick PWM Chips — sends VR/VG ONCE on release!) */}
      <View style={[styles.speedBox, { backgroundColor: surface, borderColor: divider }]}>
        <View style={styles.speedHead}>
          <Text style={styles.speedLabel}>VELOCIDADE MANUAL</Text>
          <View style={styles.speedChips}>
            {SPEED_PRESETS.map((p) => {
              const selected = Math.abs(speedPwm - p.pwm) <= 4;
              return (
                <Pressable
                  key={p.pwm}
                  onPress={() => {
                    Vibration.vibrate(12);
                    commitManualSpeed(p.pwm);
                  }}
                  style={[styles.presetChip, selected && styles.presetChipActive]}
                >
                  <Text style={[styles.presetChipText, selected && styles.presetChipTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.speedSliderRow}>
          <View style={{ flex: 1 }}>
            <DynamicSlider
              value={speedPwm}
              min={60}
              max={255}
              step={5}
              accentColor="#FF4D00"
              onChange={setSpeedPwm}
              onChangeEnd={commitManualSpeed}
            />
          </View>
          <Text style={styles.speedValText}>
            {speedPwm} <Text style={styles.speedValSub}>({speedPct}%)</Text>
          </Text>
        </View>
      </View>

      {/* Interactive Drive Surface: 360° Dynamic Joystick OR Classic D-Pad */}
      {driveMode === 'joystick' ? (
        <View style={styles.joyRow}>
          <GestureDetector gesture={joyGesture}>
            <View
              style={[
                styles.joyPad,
                {
                  backgroundColor: surface,
                  borderColor: activeZone !== 'stop' ? 'rgba(255,77,0,0.65)' : divider,
                },
              ]}
            >
              <Svg width={PAD_SIZE} height={PAD_SIZE} style={StyleSheet.absoluteFill}>
                {/* Outer full-speed guide ring */}
                <Circle
                  cx={PAD_CENTER}
                  cy={PAD_CENTER}
                  r={MAX_RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
                {/* Inner pulse-precision threshold ring (62%) */}
                <Circle
                  cx={PAD_CENTER}
                  cy={PAD_CENTER}
                  r={MAX_RADIUS * FULL_ZONE_NORM}
                  fill="none"
                  stroke="rgba(255,77,0,0.22)"
                  strokeWidth={1}
                  strokeDasharray="3,4"
                />
                {/* Deadzone circle (22%) */}
                <Circle
                  cx={PAD_CENTER}
                  cy={PAD_CENTER}
                  r={MAX_RADIUS * DEADZONE_NORM}
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={1}
                />
                {/* 8-sector crosshairs */}
                <Line x1={PAD_CENTER} y1={14} x2={PAD_CENTER} y2={PAD_SIZE - 14} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <Line x1={14} y1={PAD_CENTER} x2={PAD_SIZE - 14} y2={PAD_CENTER} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                <Line x1={32} y1={32} x2={PAD_SIZE - 32} y2={PAD_SIZE - 32} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                <Line x1={PAD_SIZE - 32} y1={32} x2={32} y2={PAD_SIZE - 32} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                {/* Live thrust vector */}
                {activeZone !== 'stop' ? (
                  <Line
                    x1={PAD_CENTER}
                    y1={PAD_CENTER}
                    x2={PAD_CENTER + thumb.x}
                    y2={PAD_CENTER + thumb.y}
                    stroke={activeZone === 'full' ? '#FF4D00' : '#F59E0B'}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                ) : null}
              </Svg>

              {/* Cardinal indicators */}
              <Text style={[styles.cardinal, { top: 5, left: PAD_CENTER - 4 }]}>F</Text>
              <Text style={[styles.cardinal, { bottom: 5, left: PAD_CENTER - 4 }]}>R</Text>
              <Text style={[styles.cardinal, { left: 7, top: PAD_CENTER - 6 }]}>E</Text>
              <Text style={[styles.cardinal, { right: 7, top: PAD_CENTER - 6 }]}>D</Text>

              {/* Draggable tactile puck */}
              <View
                pointerEvents="none"
                style={[
                  styles.joyThumb,
                  activeZone === 'full' && styles.joyThumbFull,
                  activeZone === 'pulse' && styles.joyThumbPulse,
                  {
                    transform: [{ translateX: thumb.x }, { translateY: thumb.y }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.joyThumbDot,
                    activeZone === 'full' && { backgroundColor: '#FFFFFF' },
                    activeZone === 'pulse' && { backgroundColor: '#F59E0B' },
                  ]}
                />
              </View>
            </View>
          </GestureDetector>

          {/* Right HUD: Live Sector, Precision/Continuous Mode, Active Command & STOP */}
          <View style={styles.joySide}>
            <View style={[styles.hudBox, { backgroundColor: surface, borderColor: divider }]}>
              <Text style={styles.hudMicro}>DIREÇÃO ATIVA</Text>
              <Text
                style={[
                  styles.hudDir,
                  activeZone === 'full' && { color: '#FF4D00' },
                  activeZone === 'pulse' && { color: '#F59E0B' },
                ]}
              >
                {activeSpec.label}
              </Text>
              <View style={styles.hudMetaRow}>
                <View
                  style={[
                    styles.zoneBadge,
                    activeZone === 'full' && styles.zoneBadgeFull,
                    activeZone === 'pulse' && styles.zoneBadgePulse,
                  ]}
                >
                  <Text style={styles.zoneBadgeText}>
                    {activeZone === 'full'
                      ? 'CONTÍNUO'
                      : activeZone === 'pulse'
                        ? 'PRECISÃO'
                        : 'NEUTRO'}
                  </Text>
                </View>
                <Text style={styles.hudPct}>{intensityPct}%</Text>
              </View>
              <Text style={styles.hudCmd}>{activeSpec.cmd}</Text>
            </View>

            <Pressable
              onPress={() => {
                Vibration.vibrate(90);
                stopJoystickNow(true);
                void emergencyStop();
              }}
              style={styles.joyStopBtn}
            >
              <Square color="#EF4444" size={14} fill="#EF4444" />
              <Text style={styles.joyStopText}>PARAR</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.dpadGrid}>
          <View style={styles.dpadRow}>
            <Pressable
              onPressIn={() => {
                Vibration.vibrate(20);
                void benchJog('FRENTE');
              }}
              onPressOut={() => void emergencyStop()}
              style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
            >
              <ArrowUp color="#FAFAFA" size={24} />
            </Pressable>
          </View>

          <View style={styles.dpadRow}>
            <Pressable
              onPressIn={() => {
                Vibration.vibrate(20);
                void benchJog('ESQ');
              }}
              onPressOut={() => void emergencyStop()}
              style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
            >
              <ArrowLeft color="#FAFAFA" size={24} />
            </Pressable>

            <Pressable
              onPress={() => {
                Vibration.vibrate(90);
                void emergencyStop();
              }}
              style={styles.dpadStop}
            >
              <Square color="#EF4444" size={16} fill="#EF4444" />
            </Pressable>

            <Pressable
              onPressIn={() => {
                Vibration.vibrate(20);
                void benchJog('DIR');
              }}
              onPressOut={() => void emergencyStop()}
              style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
            >
              <ArrowRight color="#FAFAFA" size={24} />
            </Pressable>
          </View>

          <View style={styles.dpadRow}>
            <Pressable
              onPressIn={() => {
                Vibration.vibrate(20);
                void benchJog('RE');
              }}
              onPressOut={() => void emergencyStop()}
              style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
            >
              <ArrowDown color="#FAFAFA" size={24} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Isolated Single-Motor Safe 1s Pulse Strip */}
      <View style={styles.motorPulseStrip}>
        <Text style={styles.motorPulseLabel}>PULSO 1S</Text>
        {(
          [
            { side: 'E' as const, dir: 1 as const, label: 'Esq +' },
            { side: 'E' as const, dir: -1 as const, label: 'Esq -' },
            { side: 'D' as const, dir: 1 as const, label: 'Dir +' },
            { side: 'D' as const, dir: -1 as const, label: 'Dir -' },
          ] as const
        ).map((btn) => {
          const tag = `${btn.side}:${btn.dir}`;
          const active = activePulseMotor === tag;
          return (
            <Pressable
              key={tag}
              onPress={() => {
                Vibration.vibrate(25);
                stopJoystickNow(false);
                void benchMotorPulse(btn.side, btn.dir, 1000);
              }}
              style={[
                styles.motorPulseBtn,
                { backgroundColor: surface, borderColor: divider },
                active && styles.motorPulseBtnActive,
              ]}
            >
              <Text style={[styles.motorPulseBtnText, active && { color: '#FAFAFA' }]}>
                {btn.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pane: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modeBtnActive: {
    backgroundColor: '#27272A',
  },
  modeText: {
    color: '#8E8E98',
    fontSize: 11,
    fontWeight: '700',
  },
  modeTextActive: {
    color: '#FAFAFA',
  },
  safetyHint: {
    color: '#8E8E98',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  restoreText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  speedBox: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  speedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  speedLabel: {
    color: '#9A9AA6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  speedChips: {
    flexDirection: 'row',
    gap: 4,
  },
  presetChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(255,77,0,0.2)',
    borderColor: '#FF4D00',
  },
  presetChipText: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  presetChipTextActive: {
    color: '#FAFAFA',
  },
  speedSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speedValText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: 68,
    textAlign: 'right',
  },
  speedValSub: {
    color: '#8E8E98',
    fontSize: 10,
    fontWeight: '600',
  },
  joyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  joyPad: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: PAD_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardinal: {
    position: 'absolute',
    color: '#52525B',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  joyThumb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: '#52525B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joyThumbPulse: {
    backgroundColor: 'rgba(245,158,11,0.22)',
    borderColor: '#F59E0B',
  },
  joyThumbFull: {
    backgroundColor: 'rgba(255,77,0,0.32)',
    borderColor: '#FF4D00',
  },
  joyThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#A1A1AA',
  },
  joySide: {
    flex: 1,
    gap: 8,
    maxWidth: 160,
  },
  hudBox: {
    borderRadius: 7,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  hudMicro: {
    color: '#8E8E98',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hudDir: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  hudMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  zoneBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#18181B',
  },
  zoneBadgePulse: {
    backgroundColor: 'rgba(245,158,11,0.18)',
  },
  zoneBadgeFull: {
    backgroundColor: 'rgba(255,77,0,0.22)',
  },
  zoneBadgeText: {
    color: '#E4E4E7',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  hudPct: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  hudCmd: {
    color: '#38BDF8',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  joyStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 7,
    backgroundColor: '#18181B',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.65)',
  },
  joyStopText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dpadGrid: {
    alignItems: 'center',
    gap: 7,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dpadKey: {
    width: 68,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadStop: {
    width: 68,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motorPulseStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  motorPulseLabel: {
    color: '#8E8E98',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
    fontFamily: 'monospace',
  },
  motorPulseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  motorPulseBtnActive: {
    backgroundColor: 'rgba(255,77,0,0.2)',
    borderColor: '#FF4D00',
  },
  motorPulseBtnText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
