import { useRouter } from 'expo-router';
import { ChevronRight, RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';

import { Robot3DViewport } from '@/components/sumo/Robot3DViewport';
import { RobotRadarSvg } from '@/components/sumo/RobotRadarSvg';
import { STRATEGIES } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

const SHORT_MATCH_STATE: Record<number, string> = {
  0: 'IDLE',
  1: 'READY',
  2: 'COMBATE',
  3: 'STOP',
};

function fmtSigned(val: number, digits: number): string {
  const fixed = val.toFixed(digits);
  return val > 0.04 ? `+${fixed}` : fixed;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<'2d' | '3d'>('2d');
  const [imuMode, setImuMode] = React.useState<'deg' | 'accel'>('deg');

  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const highContrast = useSumoStore((s) => s.highContrast);
  const hapticOnDetect = useSumoStore((s) => s.hapticOnDetect);
  const setHapticOnDetect = useSumoStore((s) => s.setHapticOnDetect);
  const zeroYaw = useSumoStore((s) => s.zeroYaw);

  const currentStrat = STRATEGIES.find((s) => s.id === info.estrategia) ?? STRATEGIES[0];
  const stateLabel = SHORT_MATCH_STATE[info.matchState] ?? 'IDLE';
  const isActiveCombat = info.matchState === 1 || info.matchState === 2;
  const isTilted =
    info.imuOnline && (Math.abs(info.pitchDeg) > 15 || Math.abs(info.rollDeg) > 15);

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const divider = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  const imuColumns =
    imuMode === 'deg'
      ? [
          { k: 'PITCH', val: `${fmtSigned(info.pitchDeg, 1)}°`, unit: 'deg' },
          { k: 'ROLL', val: `${fmtSigned(info.rollDeg, 1)}°`, unit: 'deg' },
          { k: 'YAW', val: `${info.headingDeg.toFixed(1)}°`, unit: 'deg' },
          { k: 'GIRO', val: info.gz.toFixed(1), unit: '°/s' },
        ]
      : [
          { k: 'AX', val: info.ax.toFixed(2), unit: 'm/s²' },
          { k: 'AY', val: info.ay.toFixed(2), unit: 'm/s²' },
          { k: 'GZ', val: info.gz.toFixed(1), unit: '°/s' },
          { k: 'YAW', val: `${info.headingDeg.toFixed(1)}°`, unit: 'deg' },
        ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: bg }]}
      contentContainerStyle={styles.container}
    >
      {/* Hero Schematic Radar (2D) or Live 3D Mini-Sumo + X/Y/Z Background Graph */}
      <View style={[styles.radarPanel, { backgroundColor: surface, borderColor: divider }]}>
        <View style={styles.radarTopRow}>
          <View style={styles.radarTitleCluster}>
            <Text style={styles.microLabel}>
              {viewMode === '3d' ? 'ATITUDE 3D' : 'RADAR'}
            </Text>
            <View style={[styles.modeSwitch, { borderColor: divider }]}>
              <Pressable
                onPress={() => setViewMode('2d')}
                style={[styles.modeBtn, viewMode === '2d' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, viewMode === '2d' && styles.modeBtnTextActive]}>
                  2D
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('3d')}
                style={[styles.modeBtn, viewMode === '3d' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, viewMode === '3d' && styles.modeBtnTextActive]}>
                  3D
                </Text>
              </Pressable>
            </View>
            {isTilted && viewMode === '2d' ? (
              <View style={styles.tiltBadge}>
                <Text style={styles.tiltBadgeText}>
                  {fmtSigned(info.pitchDeg, 0)}°
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              const next = !hapticOnDetect;
              setHapticOnDetect(next);
              if (next) Vibration.vibrate(20);
            }}
            style={[
              styles.hapticPill,
              hapticOnDetect && styles.hapticPillActive,
            ]}
          >
            <View
              style={[
                styles.hapticDot,
                { backgroundColor: hapticOnDetect ? '#FF4D00' : '#71717A' },
              ]}
            />
            <Text
              style={[
                styles.hapticText,
                hapticOnDetect && { color: '#FAFAFA' },
              ]}
            >
              Vibrar IR
            </Text>
          </Pressable>
        </View>

        {viewMode === '3d' ? (
          <Robot3DViewport height={278} highContrast={highContrast} />
        ) : (
          <RobotRadarSvg
            senEsq={telemetry.sen_esq}
            senCentroEsq={telemetry.sen_centro_esq}
            senCentroDir={telemetry.sen_centro_dir}
            senDir={telemetry.sen_dir}
            sensorLE={telemetry.sensorLE}
            sensorLD={telemetry.sensorLD}
            thrLE={info.linhaLimiarEsq}
            thrLD={info.linhaLimiarDir}
            headingDeg={info.headingDeg}
            highContrast={highContrast}
          />
        )}
      </View>

      {/* Clean Hairline State & Strategy Strip */}
      <Pressable
        onPress={() => router.push('/strategies')}
        style={[styles.stripRow, { borderColor: divider }]}
      >
        <View style={styles.stripLeft}>
          <View
            style={[
              styles.stateDot,
              {
                backgroundColor:
                  info.matchState === 3
                    ? '#EF4444'
                    : isActiveCombat
                      ? '#FF4D00'
                      : '#A1A1AA',
              },
            ]}
          />
          <Text style={styles.stateText}>{stateLabel}</Text>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaMono}>
            VR {telemetry.velocreta} / VG {telemetry.velocgiro}
          </Text>
        </View>

        <View style={styles.stripRight}>
          <Text style={styles.stratSummary}>
            #{currentStrat.id} {currentStrat.name} · IR {info.irStartDelayMs / 1000}s
          </Text>
          <ChevronRight color="#9A9AA6" size={16} />
        </View>
      </Pressable>

      {/* Flat 4-Column IMU Table with GRAUS / m/s² Toggle + Zero Yaw */}
      <View style={[styles.imuSection, { borderColor: divider }]}>
        <View style={styles.imuHeader}>
          <View style={styles.imuStatusWrap}>
            <Text style={styles.microLabel}>IMU · MPU6050</Text>
            <View
              style={[
                styles.imuDot,
                { backgroundColor: info.imuOnline ? '#22C55E' : '#EF4444' },
              ]}
            />
          </View>

          <View style={styles.imuControls}>
            <View style={[styles.modeSwitch, { borderColor: divider }]}>
              <Pressable
                onPress={() => setImuMode('deg')}
                style={[styles.modeBtn, imuMode === 'deg' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, imuMode === 'deg' && styles.modeBtnTextActive]}>
                  GRAUS
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setImuMode('accel')}
                style={[styles.modeBtn, imuMode === 'accel' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, imuMode === 'accel' && styles.modeBtnTextActive]}>
                  m/s²
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                Vibration.vibrate(20);
                void zeroYaw();
              }}
              style={[styles.zeroBtn, { borderColor: divider }]}
            >
              <RotateCcw color="#D4D4D8" size={11} />
              <Text style={styles.zeroBtnText}>0° Yaw</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.imuTable, { borderTopColor: divider }]}>
          {imuColumns.map((col, idx) => (
            <View
              key={col.k}
              style={[
                styles.imuCell,
                idx > 0 && { borderLeftWidth: 1, borderLeftColor: divider },
              ]}
            >
              <Text style={styles.imuKey}>{col.k}</Text>
              <Text style={styles.imuVal} numberOfLines={1}>
                {col.val}
              </Text>
              <Text style={styles.imuUnit}>{col.unit}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Compact Telemetry Footnote */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          Evasão IMU: {telemetry.HBEvasao ? 'ATIVA' : 'OFF'}
        </Text>
        <Text style={styles.footerMono}>
          LIP {telemetry.limiarParado.toFixed(2)} · LIE {telemetry.limiarEmpurrado.toFixed(2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  radarPanel: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 11,
  },
  radarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  radarTitleCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tiltBadge: {
    backgroundColor: 'rgba(245,158,11,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.5)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tiltBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  hapticPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hapticPillActive: {
    borderColor: 'rgba(255,77,0,0.55)',
    backgroundColor: 'rgba(255,77,0,0.12)',
  },
  hapticDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  hapticText: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
  },
  microLabel: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaSep: {
    color: '#71717A',
    fontSize: 12,
  },
  metaMono: {
    color: '#B4B4BE',
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  stripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stratSummary: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  imuSection: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  imuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imuStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imuControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#121215',
    padding: 2,
    gap: 2,
  },
  modeBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
  },
  modeBtnActive: {
    backgroundColor: '#27272A',
  },
  modeBtnText: {
    color: '#9A9AA6',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  modeBtnTextActive: {
    color: '#FAFAFA',
  },
  zeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#161619',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  zeroBtnText: {
    color: '#D4D4D8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  imuDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  imuStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  imuTable: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  imuCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  imuKey: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  imuVal: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  imuUnit: {
    color: '#9A9AA6',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerText: {
    color: '#9A9AA6',
    fontSize: 11,
    fontWeight: '600',
  },
  footerMono: {
    color: '#9A9AA6',
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
});
