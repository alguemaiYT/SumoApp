import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface RobotRadarProps {
  senEsq: number;
  senCentroEsq: number;
  senCentroDir: number;
  senDir: number;
  sensorLE: number;
  sensorLD: number;
  thrLE: number;
  thrLD: number;
  highContrast?: boolean;
}

export function RobotRadarSvg({
  senEsq,
  senCentroEsq,
  senCentroDir,
  senDir,
  sensorLE,
  sensorLD,
  thrLE,
  thrLD,
  highContrast = false,
}: RobotRadarProps) {
  const seOn = senEsq === 1;
  const sceOn = senCentroEsq === 1;
  const scdOn = senCentroDir === 1;
  const sdOn = senDir === 1;

  const leEdge = sensorLE <= thrLE;
  const ldEdge = sensorLD <= thrLD;

  const activeStroke = '#FF4D00';
  const idleStroke = highContrast ? '#3F3F46' : '#27272A';
  const activeFill = 'rgba(255, 77, 0, 0.22)';
  const idleFill = 'rgba(255, 255, 255, 0.02)';
  const chassisStroke = highContrast ? '#71717A' : '#3F3F46';

  return (
    <View style={styles.wrap}>
      {/* Top Sensor Labels aligned above arcs */}
      <View style={styles.topLabels}>
        <Text style={[styles.arcLabel, seOn && styles.arcLabelActive]}>SE</Text>
        <Text style={[styles.arcLabel, sceOn && styles.arcLabelActive]}>SCE</Text>
        <Text style={[styles.arcLabel, scdOn && styles.arcLabelActive]}>SCD</Text>
        <Text style={[styles.arcLabel, sdOn && styles.arcLabelActive]}>SD</Text>
      </View>

      {/* Top-down Geometric Robot Schematic */}
      <View style={styles.svgContainer}>
        <Svg width={296} height={224} viewBox="0 0 296 224">
          {/* Subtle range guide ring */}
          <Path
            d="M 42 132 A 106 106 0 0 1 254 132"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
            strokeDasharray="3,5"
          />

          {/* SE — Far Left IR Sector */}
          <Path
            d="M 28 134 A 120 120 0 0 1 70 42 L 96 76 A 78 78 0 0 0 70 134 Z"
            fill={seOn ? activeFill : idleFill}
            stroke={seOn ? activeStroke : idleStroke}
            strokeWidth={seOn ? 2 : 1.2}
          />

          {/* SCE — Front-Left IR Sector */}
          <Path
            d="M 76 37 A 120 120 0 0 1 145 14 L 145 58 A 78 78 0 0 0 101 72 Z"
            fill={sceOn ? activeFill : idleFill}
            stroke={sceOn ? activeStroke : idleStroke}
            strokeWidth={sceOn ? 2 : 1.2}
          />

          {/* SCD — Front-Right IR Sector */}
          <Path
            d="M 151 14 A 120 120 0 0 1 220 37 L 195 72 A 78 78 0 0 0 151 58 Z"
            fill={scdOn ? activeFill : idleFill}
            stroke={scdOn ? activeStroke : idleStroke}
            strokeWidth={scdOn ? 2 : 1.2}
          />

          {/* SD — Far Right IR Sector */}
          <Path
            d="M 226 42 A 120 120 0 0 1 268 134 L 226 134 A 78 78 0 0 0 200 76 Z"
            fill={sdOn ? activeFill : idleFill}
            stroke={sdOn ? activeStroke : idleStroke}
            strokeWidth={sdOn ? 2 : 1.2}
          />

          {/* Robot Chassis (top-down sumo square with front wedge blade) */}
          {/* Left & Right Wheels */}
          <Rect x={88} y={136} width={10} height={44} rx={2} fill="#27272A" stroke="#52525B" strokeWidth={1} />
          <Rect x={198} y={136} width={10} height={44} rx={2} fill="#27272A" stroke="#52525B" strokeWidth={1} />

          {/* Main Body */}
          <Rect
            x={98}
            y={94}
            width={100}
            height={102}
            rx={6}
            fill="#121215"
            stroke={chassisStroke}
            strokeWidth={1.5}
          />

          {/* Front Wedge / Blade Highlight */}
          <Path
            d="M 98 112 L 106 86 L 190 86 L 198 112 Z"
            fill="#18181B"
            stroke={highContrast ? '#A1A1AA' : '#52525B'}
            strokeWidth={1.5}
          />

          {/* Center Orientation Crosshair */}
          <Line x1={148} y1={124} x2={148} y2={166} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <Line x1={126} y1={145} x2={170} y2={145} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <Path d="M 143 130 L 148 122 L 153 130" fill="none" stroke="#71717A" strokeWidth={1.5} />

          {/* Front-Left Line Sensor Dot (LE) */}
          <Circle
            cx={112}
            cy={96}
            r={6}
            fill={leEdge ? '#EF4444' : '#27272A'}
            stroke={leEdge ? '#FCA5A5' : '#52525B'}
            strokeWidth={1.5}
          />

          {/* Front-Right Line Sensor Dot (LD) */}
          <Circle
            cx={184}
            cy={96}
            r={6}
            fill={ldEdge ? '#EF4444' : '#27272A'}
            stroke={ldEdge ? '#FCA5A5' : '#52525B'}
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      {/* Line Sensors Numeric Readout Strip (Left / Right aligned under chassis corners) */}
      <View style={styles.lineReadouts}>
        <View style={styles.lineCol}>
          <View style={styles.lineHeadRow}>
            <Text style={styles.lineTag}>LINHA ESQ</Text>
            <Text style={[styles.lineState, leEdge ? styles.edgeAlert : styles.edgeSafe]}>
              {leEdge ? 'BORDA' : 'PISTA'}
            </Text>
          </View>
          <View style={styles.lineValRow}>
            <Text style={[styles.lineValue, leEdge && { color: '#EF4444' }]}>{sensorLE}</Text>
            <Text style={styles.lineThr}>≤ {thrLE}</Text>
          </View>
        </View>

        <View style={styles.vDivider} />

        <View style={styles.lineCol}>
          <View style={styles.lineHeadRow}>
            <Text style={styles.lineTag}>LINHA DIR</Text>
            <Text style={[styles.lineState, ldEdge ? styles.edgeAlert : styles.edgeSafe]}>
              {ldEdge ? 'BORDA' : 'PISTA'}
            </Text>
          </View>
          <View style={styles.lineValRow}>
            <Text style={[styles.lineValue, ldEdge && { color: '#EF4444' }]}>{sensorLD}</Text>
            <Text style={styles.lineThr}>≤ {thrLD}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  topLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 34,
    marginBottom: -4,
  },
  arcLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.6,
  },
  arcLabelActive: {
    color: '#FF4D00',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineReadouts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  lineCol: {
    flex: 1,
    paddingHorizontal: 6,
    gap: 2,
  },
  vDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 8,
  },
  lineHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineTag: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  lineState: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  edgeAlert: {
    color: '#EF4444',
  },
  edgeSafe: {
    color: '#A1A1AA',
  },
  lineValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  lineValue: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  lineThr: {
    color: '#71717A',
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
});
