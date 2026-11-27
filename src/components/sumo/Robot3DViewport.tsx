import { useIsFocused } from '@react-navigation/native';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { acquireTabSwipeLock, releaseTabSwipeLock } from '@/lib/sumo/gesture-lock';
import {
  getLiveTelemetrySnapshot,
  type LiveTelemetrySnapshot,
  subscribeLiveTelemetry,
  useSumoStore,
} from '@/lib/sumo/store';

import { buildSumo3DHtml } from './sumo3dHtml';

type CamPreset = 'iso' | 'front' | 'side' | 'top';
type VisualStyle = 'tech' | 'hud' | 'cel';
type GraphMode = 'deg' | 'accel';

interface Robot3DViewportProps {
  height?: number;
  highContrast?: boolean;
}

// CRITICAL: `react-native-webview` on Android calls `loadDataWithBaseURL()` every time
// the `source` object reference changes when `html` is set. Cache a single immutable
// source object once at module level so the 573 KB Three.js bundle is NEVER re-serialized
// or reloaded across renders.
let cachedSumo3DSource: { readonly html: string } | null = null;
function getSumo3DSource(): { readonly html: string } {
  if (!cachedSumo3DSource) {
    cachedSumo3DSource = Object.freeze({ html: buildSumo3DHtml() });
  }
  return cachedSumo3DSource;
}

const WEBVIEW_PUSH_INTERVAL_MS = 80;

function serializeSnapshot(snap: LiveTelemetrySnapshot): string {
  const { telemetry, info, connected } = snap;
  const leEdge = telemetry.sensorLE <= info.linhaLimiarEsq;
  const ldEdge = telemetry.sensorLD <= info.linhaLimiarDir;
  return JSON.stringify({
    connected,
    pitchDeg: info.pitchDeg,
    rollDeg: info.rollDeg,
    yawDeg: info.headingDeg,
    ax: info.ax,
    ay: info.ay,
    az: info.az,
    se: telemetry.sen_esq,
    sce: telemetry.sen_centro_esq,
    scd: telemetry.sen_centro_dir,
    sd: telemetry.sen_dir,
    leEdge,
    ldEdge,
  });
}

export const Robot3DViewport = React.memo(function Robot3DViewport({
  height = 278,
  highContrast = false,
}: Robot3DViewportProps) {
  const isFocused = useIsFocused();
  const webRef = React.useRef<WebView>(null);
  const fullWebRef = React.useRef<WebView>(null);
  const readyInlineRef = React.useRef(false);
  const readyFullRef = React.useRef(false);
  const fullscreenRef = React.useRef(false);
  const focusedRef = React.useRef(isFocused);
  const lastInjectMsRef = React.useRef(0);
  const lastPayloadRef = React.useRef('');
  const lastPausedRef = React.useRef<boolean | null>(null);
  const pendingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchLockedRef = React.useRef(false);

  const lockSwipeFor3D = React.useCallback(() => {
    if (!touchLockedRef.current) {
      touchLockedRef.current = true;
      acquireTabSwipeLock();
    }
  }, []);

  const unlockSwipeFor3D = React.useCallback(() => {
    if (touchLockedRef.current) {
      touchLockedRef.current = false;
      releaseTabSwipeLock();
    }
  }, []);

  React.useEffect(() => unlockSwipeFor3D, [unlockSwipeFor3D]);

  const [fullscreen, setFullscreen] = React.useState(false);
  const [cam, setCam] = React.useState<CamPreset>('iso');
  const [styleMode, setStyleMode] = React.useState<VisualStyle>('tech');
  const [graphMode, setGraphMode] = React.useState<GraphMode>('deg');

  const isConnected = useSumoStore((s) => s.phase === 'connected');
  const zeroYaw = useSumoStore((s) => s.zeroYaw);
  const setStream3d = useSumoStore((s) => s.setStream3d);

  const webSource = React.useMemo(() => getSumo3DSource(), []);

  fullscreenRef.current = fullscreen;
  focusedRef.current = isFocused;

  const injectIntoActive = React.useCallback((js: string) => {
    if (fullscreenRef.current) {
      if (readyFullRef.current) fullWebRef.current?.injectJavaScript(js);
    } else if (readyInlineRef.current) {
      webRef.current?.injectJavaScript(js);
    }
  }, []);

  const pushSnapshotNow = React.useCallback(
    (snap: LiveTelemetrySnapshot, force = false) => {
      if (!focusedRef.current || !snap.appActive) return;
      const json = serializeSnapshot(snap);
      if (!force && json === lastPayloadRef.current) return;
      lastPayloadRef.current = json;
      lastInjectMsRef.current = Date.now();
      injectIntoActive(`window.__SUMO_UPDATE__ && window.__SUMO_UPDATE__(${json});true;`);
    },
    [injectIntoActive],
  );

  const syncPauseState = React.useCallback((paused: boolean, force = false) => {
    if (!force && lastPausedRef.current === paused) return;
    lastPausedRef.current = paused;
    const pauseJs = `window.__SUMO_CMD__ && window.__SUMO_CMD__('pause', '${paused ? '1' : '0'}');true;`;
    if (readyInlineRef.current) webRef.current?.injectJavaScript(pauseJs);
    if (readyFullRef.current) fullWebRef.current?.injectJavaScript(pauseJs);
  }, []);

  // Enable BLE STREAM,1* ONLY while this 3D view is mounted AND tab is focused
  React.useEffect(() => {
    void setStream3d(isFocused);
    const snap = getLiveTelemetrySnapshot();
    syncPauseState(!isFocused || !snap.appActive, true);
    if (isFocused) {
      pushSnapshotNow(snap, true);
    }
    return () => {
      void setStream3d(false);
    };
  }, [isFocused, setStream3d, pushSnapshotNow, syncPauseState]);

  // Imperative live telemetry bridge -> ZERO React re-renders per BLE packet!
  React.useEffect(() => {
    const schedulePush = (snap: LiveTelemetrySnapshot) => {
      const shouldPause = !snap.appActive || !focusedRef.current;
      syncPauseState(shouldPause);
      if (shouldPause) return;

      const now = Date.now();
      const elapsed = now - lastInjectMsRef.current;
      if (elapsed >= WEBVIEW_PUSH_INTERVAL_MS) {
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        pushSnapshotNow(snap);
      } else if (!pendingTimerRef.current) {
        pendingTimerRef.current = setTimeout(() => {
          pendingTimerRef.current = null;
          pushSnapshotNow(getLiveTelemetrySnapshot());
        }, WEBVIEW_PUSH_INTERVAL_MS - elapsed);
      }
    };

    const unsub = subscribeLiveTelemetry(schedulePush);

    return () => {
      unsub();
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [pushSnapshotNow, syncPauseState]);

  const runCmd = React.useCallback((cmd: string, arg: string) => {
    const js = `window.__SUMO_CMD__ && window.__SUMO_CMD__(${JSON.stringify(cmd)}, ${JSON.stringify(arg)});true;`;
    if (readyInlineRef.current) webRef.current?.injectJavaScript(js);
    if (readyFullRef.current) fullWebRef.current?.injectJavaScript(js);
  }, []);

  const handleCamera = (next: CamPreset) => {
    setCam(next);
    runCmd('cam', next);
  };

  const handleStyle = (next: VisualStyle) => {
    setStyleMode(next);
    runCmd('style', next);
  };

  const handleGraph = (next: GraphMode) => {
    setGraphMode(next);
    runCmd('graph', next);
  };

  const handleTareFront = () => {
    Vibration.vibrate(25);
    if (isConnected) {
      // ESP32 ZERO_YAW* resets headingDeg -> 0.0; clear local offset so both stay in exact sync
      runCmd('clearTare', '');
      void zeroYaw();
    } else {
      runCmd('tare', '');
    }
  };

  const buildInitSyncJs = () => {
    const snap = getLiveTelemetrySnapshot();
    const json = serializeSnapshot(snap);
    lastPayloadRef.current = json;
    lastInjectMsRef.current = Date.now();
    const pauseArg = focusedRef.current && snap.appActive ? '0' : '1';
    return (
      `window.__SUMO_CMD__ && window.__SUMO_CMD__('cam', ${JSON.stringify(cam)});` +
      `window.__SUMO_CMD__ && window.__SUMO_CMD__('style', ${JSON.stringify(styleMode)});` +
      `window.__SUMO_CMD__ && window.__SUMO_CMD__('graph', ${JSON.stringify(graphMode)});` +
      `window.__SUMO_CMD__ && window.__SUMO_CMD__('pause', '${pauseArg}');` +
      `window.__SUMO_UPDATE__ && window.__SUMO_UPDATE__(${json});true;`
    );
  };

  const borderCol = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.1)';

  const renderControlsBar = (isModal: boolean) => (
    <View style={[styles.toolbar, { borderTopColor: borderCol }]}>
      <View style={styles.toolGroup}>
        {(
          [
            { id: 'iso', label: '3/4' },
            { id: 'front', label: 'Frente' },
            { id: 'side', label: 'Lat' },
            { id: 'top', label: 'Topo' },
          ] as const
        ).map((c) => (
          <Pressable
            key={c.id}
            onPress={() => handleCamera(c.id)}
            style={[styles.chip, cam === c.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, cam === c.id && styles.chipTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toolGroup}>
        {(
          [
            { id: 'tech', label: 'Téc' },
            { id: 'hud', label: 'HUD' },
            { id: 'cel', label: 'Cel' },
          ] as const
        ).map((s) => (
          <Pressable
            key={s.id}
            onPress={() => handleStyle(s.id)}
            style={[styles.chip, styleMode === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, styleMode === s.id && styles.chipTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => handleGraph(graphMode === 'deg' ? 'accel' : 'deg')}
          style={[styles.chip, styles.chipGraph]}
        >
          <Text style={styles.chipTextActive}>{graphMode === 'deg' ? 'XYZ°' : 'm/s²'}</Text>
        </Pressable>

        <Pressable onPress={handleTareFront} style={[styles.chip, styles.chipTare]}>
          <RotateCcw color="#FAFAFA" size={10} />
          <Text style={styles.chipTextActive}>Frente</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!isModal) {
              readyInlineRef.current = false;
            } else {
              readyFullRef.current = false;
            }
            setFullscreen(!isModal);
          }}
          style={[styles.chip, { paddingHorizontal: 6 }]}
          hitSlop={6}
        >
          {isModal ? (
            <Minimize2 color="#D4D4D8" size={12} />
          ) : (
            <Maximize2 color="#D4D4D8" size={12} />
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.viewportBox, { height, borderColor: borderCol }]}
        onTouchStart={lockSwipeFor3D}
        onTouchEnd={unlockSwipeFor3D}
        onTouchCancel={unlockSwipeFor3D}
      >
        {!fullscreen ? (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={webSource}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            androidLayerType="hardware"
            style={styles.webview}
            onLoadEnd={() => {
              readyInlineRef.current = true;
              webRef.current?.injectJavaScript(buildInitSyncJs());
            }}
          />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>Visualização 3D em tela cheia</Text>
          </View>
        )}
      </View>

      {renderControlsBar(false)}

      {/* Fullscreen 3D Modal — mounted strictly while visible to avoid a hidden 2nd WebView */}
      {fullscreen ? (
        <Modal
          visible
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            readyFullRef.current = false;
            setFullscreen(false);
          }}
        >
          <View style={styles.modalRoot}>
            <View style={styles.modalWebWrap}>
              <WebView
                ref={fullWebRef}
                originWhitelist={['*']}
                source={webSource}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                androidLayerType="hardware"
                style={styles.webview}
                onLoadEnd={() => {
                  readyFullRef.current = true;
                  fullWebRef.current?.injectJavaScript(buildInitSyncJs());
                }}
              />
            </View>
            <View style={styles.modalControlsWrap}>{renderControlsBar(true)}</View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 10,
  },
  viewportBox: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#0B0B0E',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0B0E',
  },
  placeholderText: {
    color: '#9A9AA6',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  toolbar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  chipActive: {
    backgroundColor: '#27272A',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  chipGraph: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.35)',
  },
  chipTare: {
    backgroundColor: 'rgba(255,77,0,0.18)',
    borderColor: 'rgba(255,77,0,0.55)',
  },
  chipText: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  chipTextActive: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  modalWebWrap: {
    flex: 1,
  },
  modalControlsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 26,
    backgroundColor: '#09090B',
  },
});
