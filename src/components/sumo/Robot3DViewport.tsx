import { Maximize2, Minimize2, RotateCcw } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useSumoStore } from '@/lib/sumo/store';

import { buildSumo3DHtml } from './sumo3dHtml';

type CamPreset = 'iso' | 'front' | 'side' | 'top';
type VisualStyle = 'tech' | 'hud' | 'cel';
type GraphMode = 'deg' | 'accel';

interface Robot3DViewportProps {
  height?: number;
  highContrast?: boolean;
}

export function Robot3DViewport({ height = 278, highContrast = false }: Robot3DViewportProps) {
  const webRef = React.useRef<WebView>(null);
  const fullWebRef = React.useRef<WebView>(null);

  const [readyInline, setReadyInline] = React.useState(false);
  const [readyFull, setReadyFull] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [cam, setCam] = React.useState<CamPreset>('iso');
  const [styleMode, setStyleMode] = React.useState<VisualStyle>('tech');
  const [graphMode, setGraphMode] = React.useState<GraphMode>('deg');

  const phase = useSumoStore((s) => s.phase);
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const zeroYaw = useSumoStore((s) => s.zeroYaw);
  const setStream3d = useSumoStore((s) => s.setStream3d);

  const html = React.useMemo(() => buildSumo3DHtml(), []);
  const isConnected = phase === 'connected';

  // Enable high-rate ~16 Hz BLE stream while 3D view is mounted, stop cleanly on unmount
  React.useEffect(() => {
    void setStream3d(true);
    return () => {
      void setStream3d(false);
    };
  }, [setStream3d]);

  const payloadJson = React.useMemo(() => {
    const leEdge = telemetry.sensorLE <= info.linhaLimiarEsq;
    const ldEdge = telemetry.sensorLD <= info.linhaLimiarDir;
    return JSON.stringify({
      connected: isConnected,
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
  }, [isConnected, info, telemetry]);

  const sendToActiveWebView = React.useCallback(
    (js: string) => {
      if (fullscreen) {
        if (readyFull) fullWebRef.current?.injectJavaScript(js);
      } else if (readyInline) {
        webRef.current?.injectJavaScript(js);
      }
    },
    [fullscreen, readyFull, readyInline],
  );

  // Push live telemetry into active 3D WebView
  React.useEffect(() => {
    sendToActiveWebView(`window.__SUMO_UPDATE__ && window.__SUMO_UPDATE__(${payloadJson});true;`);
  }, [payloadJson, sendToActiveWebView]);

  const runCmd = React.useCallback(
    (cmd: string, arg: string) => {
      const js = `window.__SUMO_CMD__ && window.__SUMO_CMD__(${JSON.stringify(cmd)}, ${JSON.stringify(arg)});true;`;
      if (readyInline) webRef.current?.injectJavaScript(js);
      if (readyFull) fullWebRef.current?.injectJavaScript(js);
    },
    [readyInline, readyFull],
  );

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
          onPress={() => setFullscreen(!isModal)}
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
      <View style={[styles.viewportBox, { height, borderColor: borderCol }]}>
        {!fullscreen ? (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html }}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            androidLayerType="hardware"
            style={styles.webview}
            onLoadEnd={() => {
              setReadyInline(true);
              webRef.current?.injectJavaScript(
                `window.__SUMO_CMD__ && window.__SUMO_CMD__('cam', ${JSON.stringify(cam)});` +
                  `window.__SUMO_CMD__ && window.__SUMO_CMD__('style', ${JSON.stringify(styleMode)});` +
                  `window.__SUMO_CMD__ && window.__SUMO_CMD__('graph', ${JSON.stringify(graphMode)});` +
                  `window.__SUMO_UPDATE__ && window.__SUMO_UPDATE__(${payloadJson});true;`,
              );
            }}
          />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>Visualização 3D em tela cheia</Text>
          </View>
        )}
      </View>

      {renderControlsBar(false)}

      {/* Fullscreen 3D Modal */}
      <Modal
        visible={fullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalWebWrap}>
            <WebView
              ref={fullWebRef}
              originWhitelist={['*']}
              source={{ html }}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              androidLayerType="hardware"
              style={styles.webview}
              onLoadEnd={() => {
                setReadyFull(true);
                fullWebRef.current?.injectJavaScript(
                  `window.__SUMO_CMD__ && window.__SUMO_CMD__('cam', ${JSON.stringify(cam)});` +
                    `window.__SUMO_CMD__ && window.__SUMO_CMD__('style', ${JSON.stringify(styleMode)});` +
                    `window.__SUMO_CMD__ && window.__SUMO_CMD__('graph', ${JSON.stringify(graphMode)});` +
                    `window.__SUMO_UPDATE__ && window.__SUMO_UPDATE__(${payloadJson});true;`,
                );
              }}
            />
          </View>
          <View style={styles.modalControlsWrap}>{renderControlsBar(true)}</View>
        </View>
      </Modal>
    </View>
  );
}

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
    paddingBottom: 24,
    backgroundColor: '#09090B',
  },
});
