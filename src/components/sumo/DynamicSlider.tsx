import * as React from 'react';
import { StyleSheet, Vibration, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { acquireTabSwipeLock, releaseTabSwipeLock } from '@/lib/sumo/gesture-lock';

interface DynamicSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  fillFromRight?: boolean;
  accentColor?: string;
  onChange: (next: number) => void;
  onChangeEnd?: (finalVal: number) => void;
}

export const DynamicSlider = React.memo(function DynamicSlider({
  value,
  min,
  max,
  step,
  decimals = 0,
  fillFromRight = false,
  accentColor = '#FAFAFA',
  onChange,
  onChangeEnd,
}: DynamicSliderProps) {
  const [dragging, setDragging] = React.useState(false);
  const trackWidthRef = React.useRef(200);
  const lastValRef = React.useRef(value);
  const lastHapticMsRef = React.useRef(0);
  const lockedRef = React.useRef(false);

  lastValRef.current = value;

  const snapFromX = React.useCallback(
    (x: number): number => {
      const w = trackWidthRef.current;
      if (w <= 0) return lastValRef.current;
      const ratio = Math.max(0, Math.min(1, x / w));
      const raw = min + ratio * (max - min);
      const snapped = Math.round((raw - min) / step) * step + min;
      const clamped = Math.max(min, Math.min(max, snapped));
      return decimals > 0 ? Number(clamped.toFixed(decimals)) : Math.round(clamped);
    },
    [decimals, max, min, step],
  );

  const emitIfChanged = React.useCallback(
    (next: number) => {
      if (Math.abs(next - lastValRef.current) > (decimals > 0 ? 0.0005 : 0)) {
        lastValRef.current = next;
        const now = Date.now();
        if (now - lastHapticMsRef.current >= 48) {
          lastHapticMsRef.current = now;
          try {
            Vibration.vibrate(6);
          } catch {
            // ignore on non-native environments
          }
        }
        onChange(next);
      }
    },
    [decimals, onChange],
  );

  const releaseLockSafe = React.useCallback(() => {
    if (lockedRef.current) {
      lockedRef.current = false;
      releaseTabSwipeLock();
    }
  }, []);

  React.useEffect(() => releaseLockSafe, [releaseLockSafe]);

  const gesture = React.useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-2, 2])
      .failOffsetY([-28, 28])
      .onBegin((e) => {
        if (!lockedRef.current) {
          lockedRef.current = true;
          acquireTabSwipeLock();
        }
        setDragging(true);
        emitIfChanged(snapFromX(e.x));
      })
      .onUpdate((e) => {
        emitIfChanged(snapFromX(e.x));
      })
      .onFinalize(() => {
        setDragging(false);
        releaseLockSafe();
        onChangeEnd?.(lastValRef.current);
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => {
        const next = snapFromX(e.x);
        emitIfChanged(next);
        onChangeEnd?.(next);
      });

    return Gesture.Race(pan, tap);
  }, [emitIfChanged, onChangeEnd, releaseLockSafe, snapFromX]);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
        }}
        style={styles.sliderHit}
      >
        <View style={[styles.barTrack, dragging && styles.barTrackDragging]}>
          {fillFromRight ? (
            <View
              style={[
                styles.barFillRight,
                {
                  left: `${pct}%`,
                  right: 0,
                  backgroundColor: accentColor,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.barFill,
                {
                  width: `${pct}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          )}
        </View>
        <View
          style={[
            styles.thumb,
            dragging && styles.thumbDragging,
            {
              left: `${pct}%`,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  sliderHit: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  barTrack: {
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  barTrackDragging: {
    height: 6,
    borderRadius: 3,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barFillRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 10,
    height: 20,
    borderRadius: 3,
    marginLeft: -5,
    top: 5,
    borderWidth: 1,
    borderColor: '#09090B',
  },
  thumbDragging: {
    width: 14,
    height: 24,
    borderRadius: 4,
    marginLeft: -7,
    top: 3,
  },
});
