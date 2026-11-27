import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  OctagonAlert,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConnectionPhase } from '@/lib/sumo/ble-transport';
import { lipo2sStatus } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

const DRAGONBOTZ_LOGO = require('../../../assets/dragonbotz-logo.png');

function statusMeta(phase: ConnectionPhase): { dot: string; label: string } {
  switch (phase) {
    case 'connected':
      return { dot: '#22C55E', label: 'Conectado' };
    case 'scanning':
      return { dot: '#FF4D00', label: 'Buscando...' };
    case 'connecting':
      return { dot: '#FF4D00', label: 'Conectando...' };
    case 'in_combat':
      return { dot: '#FF4D00', label: 'Em Combate' };
    case 'bluetooth_off':
      return { dot: '#EF4444', label: 'BT Desligado' };
    case 'permissions_denied':
      return { dot: '#EF4444', label: 'Sem Permissão' };
    case 'error':
      return { dot: '#EF4444', label: 'Erro BLE' };
    default:
      return { dot: '#8E8E98', label: 'Desconectado' };
  }
}

export function GlobalTopBar() {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const phase = useSumoStore((s) => s.phase);
  const statusDetail = useSumoStore((s) => s.statusDetail);
  const isSimulation = useSumoStore((s) => s.isSimulation);
  const autoConnect = useSumoStore((s) => s.autoConnect);
  const highContrast = useSumoStore((s) => s.highContrast);
  const connectedDevice = useSumoStore((s) => s.connectedDevice);
  const discoveredDevices = useSumoStore((s) => s.discoveredDevices);
  const vbat = useSumoStore((s) => Math.round(s.telemetry.Vbat * 10) / 10);
  const fwBranch = useSumoStore((s) => s.info.firmwareBranch);

  const startAutoConnect = useSumoStore((s) => s.startAutoConnect);
  const connectDevice = useSumoStore((s) => s.connectDevice);
  const disconnect = useSumoStore((s) => s.disconnect);
  const setAutoConnect = useSumoStore((s) => s.setAutoConnect);
  const toggleSimulation = useSumoStore((s) => s.toggleSimulation);
  const setHighContrast = useSumoStore((s) => s.setHighContrast);
  const emergencyStop = useSumoStore((s) => s.emergencyStop);

  const meta = statusMeta(phase);
  const isConnected = phase === 'connected';
  const bat = lipo2sStatus(vbat);
  const vbatPct = bat.level === 'usb' ? 100 : bat.pct;
  const vbatBarColor =
    bat.level === 'none'
      ? '#3F3F46'
      : bat.level === 'usb'
        ? '#38BDF8'
        : bat.level === 'ok'
          ? '#22C55E'
          : bat.level === 'low'
            ? '#F59E0B'
            : '#EF4444';
  const vbatTextColor =
    bat.level === 'none'
      ? '#8E8E98'
      : bat.level === 'critical'
        ? '#EF4444'
        : bat.level === 'low'
          ? '#F59E0B'
          : '#FAFAFA';
  const deviceLabel = connectedDevice?.name ?? (isSimulation ? 'Simulador' : 'Madinboo_BT');

  const bgBar = highContrast ? '#000000' : '#09090B';
  const borderCol = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  return (
    <>
      <View
        style={[
          styles.bar,
          {
            paddingTop: Math.max(insets.top, 8),
            backgroundColor: bgBar,
            borderBottomColor: borderCol,
          },
        ]}
      >
        {/* Left: Minimal single-encoded status pill (dot + name, neutral fill) */}
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[
            styles.pill,
            { backgroundColor: highContrast ? '#18181B' : '#141416' },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: meta.dot }]} />
          <Text style={styles.pillName} numberOfLines={1}>
            {isSimulation ? `${deviceLabel} · SIM` : deviceLabel}
          </Text>
          {!isConnected && !isSimulation ? (
            <Text style={styles.pillSub} numberOfLines={1}>
              {meta.label}
            </Text>
          ) : null}
        </Pressable>

        {/* Right: Vbat + generous breathing room before STOP */}
        <View style={styles.rightCluster}>
          <View style={styles.vbatBox}>
            <Text style={[styles.vbatText, { color: vbatTextColor }]}>
              {vbat > 0 ? `${vbat.toFixed(1)}V` : '--.-V'}
            </Text>
            <View style={styles.vbatTrack}>
              <View
                style={[
                  styles.vbatFill,
                  { width: `${vbatPct}%`, backgroundColor: vbatBarColor },
                ]}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              Vibration.vibrate(120);
              void emergencyStop();
            }}
            style={[
              styles.stopBtn,
              isConnected ? styles.stopBtnActive : styles.stopBtnMuted,
            ]}
          >
            <OctagonAlert color={isConnected ? '#FFFFFF' : '#8E8E98'} size={14} />
            <Text style={[styles.stopLabel, { color: isConnected ? '#FFFFFF' : '#8E8E98' }]}>
              STOP
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Connection, Firmware & Display Preferences Bottom Sheet */}
      {sheetOpen ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSheetOpen(false)}
        >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSheetOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                {isConnected ? (
                  <BluetoothConnected color="#22C55E" size={18} />
                ) : phase === 'bluetooth_off' ? (
                  <BluetoothOff color="#EF4444" size={18} />
                ) : (
                  <Bluetooth color="#FAFAFA" size={18} />
                )}
                <Text style={styles.sheetTitle}>Conexão BLE</Text>
              </View>
              <Pressable onPress={() => setSheetOpen(false)} style={styles.closeBtn}>
                <X color="#A1A1AA" size={18} />
              </Pressable>
            </View>

            <View style={styles.sheetStatusRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.sheetDeviceRow}>
                  <Text style={styles.sheetDevice}>{deviceLabel}</Text>
                  {fwBranch !== 'unknown' ? (
                    <View style={styles.fwBadge}>
                      <Text style={styles.fwBadgeText}>fw:{fwBranch}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.sheetDetail} numberOfLines={2}>
                  {statusDetail || meta.label}
                  {bat.level !== 'none'
                    ? bat.level === 'usb'
                      ? ` · USB (${vbat.toFixed(2)}V)`
                      : ` · 2S ${bat.cellV.toFixed(2)}V/cél (${bat.pct}%)`
                    : ''}
                </Text>
              </View>
              {isConnected ? (
                <Pressable onPress={() => void disconnect()} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Desconectar</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => void startAutoConnect()} style={styles.primaryBtn}>
                  <RefreshCw color="#FFFFFF" size={13} />
                  <Text style={styles.primaryBtnText}>Buscar</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.hairline} />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Auto-reconectar ao robô</Text>
              <Switch
                value={autoConnect}
                onValueChange={setAutoConnect}
                trackColor={{ false: '#27272A', true: '#FF4D00' }}
                thumbColor="#FAFAFA"
              />
            </View>

            <View style={styles.hairline} />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Modo Simulador (offline)</Text>
              <Switch
                value={isSimulation}
                onValueChange={toggleSimulation}
                trackColor={{ false: '#27272A', true: '#FF4D00' }}
                thumbColor="#FAFAFA"
              />
            </View>

            <View style={styles.hairline} />

            <View style={styles.toggleRow}>
              <View style={styles.sheetTitleRow}>
                <Sun color="#A1A1AA" size={15} />
                <Text style={styles.toggleLabel}>Alto contraste (ginásio)</Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={setHighContrast}
                trackColor={{ false: '#27272A', true: '#FF4D00' }}
                thumbColor="#FAFAFA"
              />
            </View>

            {discoveredDevices.length > 0 && !isConnected ? (
              <>
                <View style={styles.hairline} />
                <Text style={styles.sectionMicro}>DISPOSITIVOS ENCONTRADOS</Text>
                <ScrollView style={{ maxHeight: 150 }}>
                  {discoveredDevices.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        void connectDevice(d);
                        setSheetOpen(false);
                      }}
                      style={styles.deviceRow}
                    >
                      <Text style={styles.deviceRowName}>{d.name}</Text>
                      <Text style={styles.deviceRowRssi}>
                        {d.rssi !== null ? `${d.rssi} dBm` : 'Conectar'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={styles.brandSheetFooter}>
              <Image source={DRAGONBOTZ_LOGO} style={styles.brandSheetLogo} resizeMode="contain" />
              <Text style={styles.brandSheetSub}>SUMO_AUTO_ESP32 · BLE NUS</Text>
            </View>
          </View>
        </View>
      </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: '52%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  pillName: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  pillSub: {
    color: '#9A9AA6',
    fontSize: 11,
    fontWeight: '600',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  vbatBox: {
    alignItems: 'flex-end',
    gap: 3,
    minWidth: 48,
  },
  vbatText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    lineHeight: 15,
  },
  vbatTrack: {
    width: 46,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  vbatFill: {
    height: '100%',
    borderRadius: 2,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  stopBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  stopBtnMuted: {
    backgroundColor: '#141416',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stopLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121215',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  sheetStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetDevice: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
  },
  fwBadge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fwBadgeText: {
    color: '#D4D4D8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sheetDetail: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF4D00',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
  },
  secondaryBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '600',
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  toggleLabel: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionMicro: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  deviceRowName: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '600',
  },
  deviceRowRssi: {
    color: '#A1A1AA',
    fontSize: 12,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  brandSheetFooter: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    gap: 4,
  },
  brandSheetLogo: {
    width: 112,
    height: 32,
    opacity: 0.9,
  },
  brandSheetSub: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: 'monospace',
  },
});
