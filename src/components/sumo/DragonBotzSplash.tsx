import * as React from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const DRAGONBOTZ_LOGO = require('../../../assets/dragonbotz-logo.png');

export function DragonBotzSplash({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = React.useState(true);
  const opacity = React.useRef(new Animated.Value(1)).current;
  const scale = React.useRef(new Animated.Value(0.92)).current;
  const barWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const seq = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(barWidth, {
          toValue: 1,
          duration: 580,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]);

    seq.start(({ finished }) => {
      if (finished) {
        setVisible(false);
        onDone?.();
      }
    });

    return () => seq.stop();
  }, [barWidth, onDone, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
        <View style={styles.glowHalo} />
        <Image source={DRAGONBOTZ_LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.accentTrack}>
          <Animated.View
            style={[
              styles.accentFill,
              { transform: [{ scaleX: barWidth }] },
            ]}
          />
        </View>
        <Text style={styles.tagline}>MINI-SUMÔ 500G · TELEMETRIA BLE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 240,
    height: 92,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 77, 0, 0.14)',
  },
  logo: {
    width: 268,
    height: 78,
  },
  accentTrack: {
    marginTop: 18,
    width: 120,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  accentFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF4D00',
  },
  tagline: {
    marginTop: 12,
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    fontFamily: 'monospace',
  },
});
