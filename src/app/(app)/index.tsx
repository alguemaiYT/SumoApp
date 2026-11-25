import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RobotRadarSvg } from '@/components/sumo/RobotRadarSvg';
import { STRATEGIES } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

const SHORT_MATCH_STATE: Record<number, string> = {
  0: 'IDLE',
  1: 'READY',
  2: 'COMBATE',
  3: 'STOP',
};

export default function DashboardScreen() {
  const router = useRouter();
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const highContrast = useSumoStore((s) => s.highContrast);

  const currentStrat = STRATEGIES.find((s) => s.id === info.estrategia) ?? STRATEGIES[0];
  const stateLabel = SHORT_MATCH_STATE[info.matchState] ?? 'IDLE';
  const isActiveCombat = info.matchState === 1 || info.matchState === 2;

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const divider = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: bg }]}
      contentContainerStyle={styles.container}
    >
      {/* Hero Schematic Radar + Front Line Sensors */}
      <View style={[styles.radarPanel, { backgroundColor: surface, borderColor: divider }]}>
        <Text style={styles.microLabel}>RADAR DE SENSORES</Text>

        <RobotRadarSvg
          senEsq={telemetry.sen_esq}
          senCentroEsq={telemetry.sen_centro_esq}
          senCentroDir={telemetry.sen_centro_dir}
          senDir={telemetry.sen_dir}
          sensorLE={telemetry.sensorLE}
          sensorLD={telemetry.sensorLD}
          thrLE={info.linhaLimiarEsq}
          thrLD={info.linhaLimiarDir}
          highContrast={highContrast}
        />
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

      {/* Flat 4-Column IMU Table */}
      <View style={[styles.imuSection, { borderColor: divider }]}>
        <View style={styles.imuHeader}>
          <Text style={styles.microLabel}>IMU · MPU6050</Text>
          <View style={styles.imuStatusWrap}>
            <View
              style={[
                styles.imuDot,
                { backgroundColor: info.imuOnline ? '#22C55E' : '#EF4444' },
              ]}
            />
            <Text style={[styles.imuStatusText, { color: info.imuOnline ? '#D4D4D8' : '#EF4444' }]}>
              {info.imuOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        <View style={[styles.imuTable, { borderTopColor: divider }]}>
          {[
            { k: 'AX', val: info.ax.toFixed(2), unit: 'm/s²' },
            { k: 'AY', val: info.ay.toFixed(2), unit: 'm/s²' },
            { k: 'GZ', val: info.gz.toFixed(1), unit: '°/s' },
            { k: 'YAW', val: `${info.headingDeg.toFixed(1)}°`, unit: 'deg' },
          ].map((col, idx) => (
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
    paddingTop: 12,
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
    gap: 5,
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
