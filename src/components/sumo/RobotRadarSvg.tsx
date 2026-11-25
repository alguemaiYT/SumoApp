import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

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
  const idleStroke = highContrast ? '#52525B' : '#32323A';
  const activeFill = 'rgba(255, 77, 0, 0.24)';
  const idleFill = 'rgba(255, 255, 255, 0.025)';
  const chassisStroke = highContrast ? '#A1A1AA' : '#52525B';
  const idleLabel = highContrast ? '#D4D4D8' : '#9A9AA6';

  return (
    <View style={styles.wrap}>
      {/* Top-down Geometric Robot Schematic with Radially Anchored Sector Labels */}
      <View style={styles.svgContainer}>
        <Svg width={312} height={240} viewBox="0 0 312 240">
          {/* Subtle range guide ring */}
          <Path
            d="M 50 148 A 106 106 0 0 1 262 148"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
            strokeDasharray="3,5"
          />

          {/* SE — Far Left IR Sector */}
          <Path
            d="M 36 150 A 120 120 0 0 1 78 58 L 104 92 A 78 78 0 0 0 78 150 Z"
            fill={seOn ? activeFill : idleFill}
            stroke={seOn ? activeStroke : idleStroke}
            strokeWidth={seOn ? 2.2 : 1.2}
          />
          <SvgText
            x={28}
            y={94}
            fill={seOn ? '#FF4D00' : idleLabel}
            fontSize={11}
            fontWeight="700"
            fontFamily="monospace"
            textAnchor="end"
          >
            SE
          </SvgText>

          {/* SCE — Front-Left IR Sector */}
          <Path
            d="M 84 53 A 120 120 0 0 1 153 30 L 153 74 A 78 78 0 0 0 109 88 Z"
            fill={sceOn ? activeFill : idleFill}
            stroke={sceOn ? activeStroke : idleStroke}
            strokeWidth={sceOn ? 2.2 : 1.2}
          />
          <SvgText
            x={114}
            y={22}
            fill={sceOn ? '#FF4D00' : idleLabel}
            fontSize={11}
            fontWeight="700"
            fontFamily="monospace"
            textAnchor="middle"
          >
            SCE
          </SvgText>

          {/* SCD — Front-Right IR Sector */}
          <Path
            d="M 159 30 A 120 120 0 0 1 228 53 L 203 88 A 78 78 0 0 0 159 74 Z"
            fill={scdOn ? activeFill : idleFill}
            stroke={scdOn ? activeStroke : idleStroke}
            strokeWidth={scdOn ? 2.2 : 1.2}
          />
          <SvgText
            x={198}
            y={22}
            fill={scdOn ? '#FF4D00' : idleLabel}
            fontSize={11}
            fontWeight="700"
            fontFamily="monospace"
            textAnchor="middle"
          >
            SCD
          </SvgText>

          {/* SD — Far Right IR Sector */}
          <Path
            d="M 234 58 A 120 120 0 0 1 276 150 L 234 150 A 78 78 0 0 0 208 92 Z"
            fill={sdOn ? activeFill : idleFill}
            stroke={sdOn ? activeStroke : idleStroke}
            strokeWidth={sdOn ? 2.2 : 1.2}
          />
          <SvgText
            x={284}
            y={94}
            fill={sdOn ? '#FF4D00' : idleLabel}
            fontSize={11}
            fontWeight="700"
            fontFamily="monospace"
            textAnchor="start"
          >
            SD
          </SvgText>

          {/* Left & Right Wheels */}
          <Rect x={96} y={152} width={10} height={44} rx={2} fill="#27272A" stroke="#52525B" strokeWidth={1} />
          <Rect x={206} y={152} width={10} height={44} rx={2} fill="#27272A" stroke="#52525B" strokeWidth={1} />

          {/* Main Chassis Body */}
          <Rect
            x={106}
            y={110}
            width={100}
            height={102}
            rx={6}
            fill="#121215"
            stroke={chassisStroke}
            strokeWidth={1.5}
          />

          {/* Front Wedge / Blade */}
          <Path
            d="M 106 128 L 114 102 L 198 102 L 206 128 Z"
            fill="#1A1A1F"
            stroke={highContrast ? '#D4D4D8' : '#71717A'}
            strokeWidth={1.5}
          />

          {/* Center Orientation Crosshair */}
          <Line x1={156} y1={140} x2={156} y2={182} stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
          <Line x1={134} y1={161} x2={178} y2={161} stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
          <Path d="M 151 146 L 156 138 L 161 146" fill="none" stroke="#8E8E98" strokeWidth={1.5} />

          {/* Front-Left Line Sensor (LE) — glows high-contrast white/red halo on white line */}
          {leEdge ? (
            <Circle cx={120} cy={112} r={11} fill="rgba(239,68,68,0.28)" />
          ) : null}
          <Circle
            cx={120}
            cy={112}
            r={6}
            fill={leEdge ? '#FAFAFA' : '#27272A'}
            stroke={leEdge ? '#EF4444' : '#71717A'}
            strokeWidth={leEdge ? 2.2 : 1.4}
          />

          {/* Front-Right Line Sensor (LD) */}
          {ldEdge ? (
            <Circle cx={192} cy={112} r={11} fill="rgba(239,68,68,0.28)" />
          ) : null}
          <Circle
            cx={192}
            cy={112}
            r={6}
            fill={ldEdge ? '#FAFAFA' : '#27272A'}
            stroke={ldEdge ? '#EF4444' : '#71717A'}
            strokeWidth={ldEdge ? 2.2 : 1.4}
          />
        </Svg>
      </View>

      {/* Line Sensors Numeric Readout Strip with Dynamic Status Badges */}
      <View style={styles.lineReadouts}>
        <View style={styles.lineCol}>
          <View style={styles.lineHeadRow}>
            <Text style={styles.lineTag}>LINHA ESQ</Text>
            <View style={[styles.badge, leEdge ? styles.badgeEdge : styles.badgeTrack]}>
              <Text style={[styles.badgeText, leEdge ? styles.badgeTextEdge : styles.badgeTextTrack]}>
                {leEdge ? 'BORDA' : 'PISTA'}
              </Text>
            </View>
          </View>
          <View style={styles.lineValRow}>
            <Text style={[styles.lineValue, leEdge && { color: '#FAFAFA' }]}>{sensorLE}</Text>
            <Text style={styles.lineThr}>≤ {thrLE}</Text>
          </View>
        </View>

        <View style={styles.vDivider} />

        <View style={styles.lineCol}>
          <View style={styles.lineHeadRow}>
            <Text style={styles.lineTag}>LINHA DIR</Text>
            <View style={[styles.badge, ldEdge ? styles.badgeEdge : styles.badgeTrack]}>
              <Text style={[styles.badgeText, ldEdge ? styles.badgeTextEdge : styles.badgeTextTrack]}>
                {ldEdge ? 'BORDA' : 'PISTA'}
              </Text>
            </View>
          </View>
          <View style={styles.lineValRow}>
            <Text style={[styles.lineValue, ldEdge && { color: '#FAFAFA' }]}>{sensorLD}</Text>
            <Text style={styles.lineThr}>≤ {thrLD}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineReadouts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
  lineCol: {
    flex: 1,
    paddingHorizontal: 6,
    gap: 4,
  },
  vDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.09)',
    marginHorizontal: 8,
  },
  lineHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineTag: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTrack: {
    backgroundColor: '#1E1E24',
  },
  badgeEdge: {
    backgroundColor: '#FAFAFA',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeTextTrack: {
    color: '#D4D4D8',
  },
  badgeTextEdge: {
    color: '#09090B',
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
    color: '#9A9AA6',
    fontSize: 11,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
});
