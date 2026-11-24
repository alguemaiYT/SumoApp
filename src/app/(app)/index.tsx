import {
  BatteryCharging,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Compass,
  OctagonAlert,
  Radio,
  RefreshCw,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ConnectionPhase } from '@/lib/sumo/ble-transport';
import { MATCH_STATE_LABELS, STRATEGIES } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

function phaseBadge(phase: ConnectionPhase): { label: string; bg: string; fg: string } {
  switch (phase) {
    case 'connected':
      return { label: 'CONECTADO', bg: 'bg-emerald-500/20', fg: 'text-emerald-400' };
    case 'scanning':
      return { label: 'BUSCANDO BLE...', bg: 'bg-sky-500/20', fg: 'text-sky-400' };
    case 'connecting':
      return { label: 'CONECTANDO...', bg: 'bg-amber-500/20', fg: 'text-amber-400' };
    case 'in_combat':
      return { label: 'EM COMBATE (BLE OFF)', bg: 'bg-orange-500/20', fg: 'text-orange-400' };
    case 'bluetooth_off':
      return { label: 'BLUETOOTH DESLIGADO', bg: 'bg-rose-500/20', fg: 'text-rose-400' };
    case 'permissions_denied':
      return { label: 'SEM PERMISSÃO', bg: 'bg-rose-500/20', fg: 'text-rose-400' };
    case 'error':
      return { label: 'ERRO BLE', bg: 'bg-rose-500/20', fg: 'text-rose-400' };
    default:
      return { label: 'DESCONECTADO', bg: 'bg-slate-700/60', fg: 'text-slate-300' };
  }
}

export default function DashboardScreen() {
  const phase = useSumoStore((s) => s.phase);
  const statusDetail = useSumoStore((s) => s.statusDetail);
  const isSimulation = useSumoStore((s) => s.isSimulation);
  const autoConnect = useSumoStore((s) => s.autoConnect);
  const connectedDevice = useSumoStore((s) => s.connectedDevice);
  const discoveredDevices = useSumoStore((s) => s.discoveredDevices);
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);

  const startAutoConnect = useSumoStore((s) => s.startAutoConnect);
  const connectDevice = useSumoStore((s) => s.connectDevice);
  const disconnect = useSumoStore((s) => s.disconnect);
  const setAutoConnect = useSumoStore((s) => s.setAutoConnect);
  const toggleSimulation = useSumoStore((s) => s.toggleSimulation);
  const emergencyStop = useSumoStore((s) => s.emergencyStop);

  const badge = phaseBadge(phase);
  const vbat = telemetry.Vbat;
  const vbatPct = Math.max(0, Math.min(100, ((vbat - 6.4) / (8.4 - 6.4)) * 100));
  const vbatColor =
    vbat === 0 ? 'text-slate-400' : vbat >= 7.6 ? 'text-emerald-400' : vbat >= 7.2 ? 'text-amber-400' : 'text-rose-400';

  const ldOnWhite = telemetry.sensorLD <= info.linhaLimiarDir;
  const leOnWhite = telemetry.sensorLE <= info.linhaLimiarEsq;
  const currentStrat = STRATEGIES.find((s) => s.id === info.estrategia) ?? STRATEGIES[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090D16' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 32 }}
        contentContainerClassName="pb-8 gap-3.5"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-50">SumoApp BLE</Text>
            <Text className="text-xs text-slate-400">
              Sumo_Auto_ESP32 • {info.firmwareBranch !== 'unknown' ? `branch ${info.firmwareBranch}` : 'BLE NUS Android & iOS'}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${badge.bg}`}>
            <Text className={`text-[11px] font-bold ${badge.fg}`}>{badge.label}</Text>
          </View>
        </View>

        {/* Connection Card */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1">
              {phase === 'connected' ? (
                <BluetoothConnected color="#34D399" size={22} />
              ) : phase === 'bluetooth_off' ? (
                <BluetoothOff color="#F87171" size={22} />
              ) : (
                <Bluetooth color="#38BDF8" size={22} />
              )}
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-100">
                  {connectedDevice ? connectedDevice.name : 'Madinboo_BT (BLE)'}
                </Text>
                <Text className="text-xs text-slate-400" numberOfLines={2}>
                  {statusDetail || 'Conexão automática por serviço Nordic UART'}
                </Text>
              </View>
            </View>
            {phase === 'connected' ? (
              <Pressable
                onPress={() => void disconnect()}
                className="rounded-xl bg-slate-800 px-3 py-2 active:opacity-75"
              >
                <Text className="text-xs font-semibold text-slate-200">Desconectar</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void startAutoConnect()}
                className="flex-row items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 active:opacity-80"
              >
                <RefreshCw color="#FFF" size={14} />
                <Text className="text-xs font-bold text-white">Conectar</Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center justify-between border-t border-slate-800 pt-2.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-slate-300">Auto-reconectar</Text>
              <Switch
                value={autoConnect}
                onValueChange={setAutoConnect}
                trackColor={{ false: '#334155', true: '#EA580C' }}
                thumbColor="#F8FAFC"
              />
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-slate-300">Simulador</Text>
              <Switch
                value={isSimulation}
                onValueChange={toggleSimulation}
                trackColor={{ false: '#334155', true: '#0284C7' }}
                thumbColor="#F8FAFC"
              />
            </View>
          </View>

          {discoveredDevices.length > 0 && phase !== 'connected' ? (
            <View className="gap-1.5 border-t border-slate-800 pt-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Dispositivos BLE encontrados
              </Text>
              {discoveredDevices.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => void connectDevice(d)}
                  className="flex-row items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5 active:opacity-75"
                >
                  <Text className="text-xs font-semibold text-slate-100">{d.name}</Text>
                  <Text className="text-xs font-mono text-slate-400">
                    {d.rssi !== null ? `${d.rssi} dBm` : 'Toque para conectar'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Match State & Battery Row */}
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-3.5 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <BatteryCharging color="#34D399" size={16} />
              <Text className="text-xs font-semibold text-slate-400">Bateria (Vbat)</Text>
            </View>
            <Text className={`text-2xl font-bold font-mono ${vbatColor}`}>
              {vbat > 0 ? `${vbat.toFixed(2)} V` : '--.- V'}
            </Text>
            <View className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <View
                className={`h-full rounded-full ${vbat >= 7.6 ? 'bg-emerald-500' : vbat >= 7.2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${vbatPct}%` }}
              />
            </View>
            <Text className="text-[10px] text-slate-500">2S LiPo: 6.4 V mín • 8.4 V cheia</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-3.5 justify-between">
            <View className="flex-row items-center gap-1.5">
              <Radio color="#FB923C" size={16} />
              <Text className="text-xs font-semibold text-slate-400">Estado / Tática</Text>
            </View>
            <Text className="text-xs font-bold text-orange-400">
              {MATCH_STATE_LABELS[info.matchState]}
            </Text>
            <View>
              <Text className="text-sm font-bold text-slate-100">
                #{currentStrat.id} {currentStrat.name}
              </Text>
              <Text className="text-[10px] text-slate-400">
                VR {telemetry.velocreta} • VG {telemetry.velocgiro} • IR {info.irStartDelayMs / 1000}s
              </Text>
            </View>
          </View>
        </View>

        {/* Visual Robot Sensor Map */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sensores de Oponente (IR) & Borda (ADC)
          </Text>

          {/* 4 Opponent IR Sensors */}
          <View className="flex-row justify-between gap-2">
            {[
              { label: 'SE (32)', active: telemetry.sen_esq === 1 },
              { label: 'SCE (33)', active: telemetry.sen_centro_esq === 1 },
              { label: 'SCD (25)', active: telemetry.sen_centro_dir === 1 },
              { label: 'SD (26)', active: telemetry.sen_dir === 1 },
            ].map((s) => (
              <View
                key={s.label}
                className={`flex-1 items-center rounded-xl border py-3 ${
                  s.active
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <View
                  className={`mb-1.5 h-3 w-3 rounded-full ${
                    s.active ? 'bg-orange-400' : 'bg-slate-700'
                  }`}
                />
                <Text className="text-[11px] font-bold text-slate-200">{s.label}</Text>
                <Text className={`text-[10px] font-mono ${s.active ? 'text-orange-300' : 'text-slate-500'}`}>
                  {s.active ? 'ALVO' : 'LIVRE'}
                </Text>
              </View>
            ))}
          </View>

          {/* 2 Line Sensors */}
          <View className="flex-row gap-3">
            {[
              {
                label: 'Linha Esq (LE • GPIO 35)',
                value: telemetry.sensorLE,
                thr: info.linhaLimiarEsq,
                white: leOnWhite,
              },
              {
                label: 'Linha Dir (LD • GPIO 27)',
                value: telemetry.sensorLD,
                thr: info.linhaLimiarDir,
                white: ldOnWhite,
              },
            ].map((ls) => (
              <View
                key={ls.label}
                className={`flex-1 rounded-xl border p-3 ${
                  ls.white ? 'border-rose-500 bg-rose-500/15' : 'border-slate-800 bg-slate-900'
                }`}
              >
                <Text className="text-[10px] font-semibold text-slate-400">{ls.label}</Text>
                <View className="mt-1 flex-row items-baseline justify-between">
                  <Text className="text-lg font-bold font-mono text-slate-100">{ls.value}</Text>
                  <Text className={`text-[10px] font-bold ${ls.white ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {ls.white ? 'BORDA!' : 'PRETO'}
                  </Text>
                </View>
                <Text className="text-[10px] font-mono text-slate-500">Limiar ≤ {ls.thr}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* IMU Live Card */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Compass color="#38BDF8" size={18} />
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
                IMU 6-DOF (MPU6050)
              </Text>
            </View>
            <View
              className={`rounded-full px-2.5 py-0.5 ${
                info.imuOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  info.imuOnline ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {info.imuOnline ? 'ONLINE (0x68)' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between gap-2">
            {[
              { k: 'ax', v: `${info.ax.toFixed(2)} m/s²` },
              { k: 'ay', v: `${info.ay.toFixed(2)} m/s²` },
              { k: 'gz', v: `${info.gz.toFixed(1)} °/s` },
              { k: 'Yaw', v: `${info.headingDeg.toFixed(1)}°` },
            ].map((item) => (
              <View key={item.k} className="flex-1 rounded-xl bg-slate-900 p-2.5 items-center">
                <Text className="text-[10px] text-slate-500">{item.k}</Text>
                <Text className="text-xs font-bold font-mono text-slate-100">{item.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Emergency Stop */}
        <Pressable
          onPress={() => {
            Vibration.vibrate(120);
            void emergencyStop();
          }}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 active:opacity-80"
        >
          <OctagonAlert color="#FFF" size={20} />
          <Text className="text-sm font-extrabold tracking-wide text-white">
            PARADA DE EMERGÊNCIA (PARADA*)
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
