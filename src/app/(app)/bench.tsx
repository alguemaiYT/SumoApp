import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  OctagonAlert,
  Send,
  Share2,
  Square,
  Target,
  Terminal,
  Trash2,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSumoStore } from '@/lib/sumo/store';

function MeasureField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View className="flex-1 min-w-[45%] gap-1">
      <Text className="text-[10px] font-semibold text-slate-400">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#475569"
        className="h-9 rounded-lg border border-slate-700 bg-[#090D16] px-2.5 font-mono text-xs text-slate-100"
      />
    </View>
  );
}

export default function BenchScreen() {
  const logs = useSumoStore((s) => s.logs);
  const measurements = useSumoStore((s) => s.measurements);
  const emergencyStop = useSumoStore((s) => s.emergencyStop);
  const calibrateAll = useSumoStore((s) => s.calibrateAll);
  const calibrateImu = useSumoStore((s) => s.calibrateImu);
  const benchJog = useSumoStore((s) => s.benchJog);
  const sendRaw = useSumoStore((s) => s.sendRaw);
  const clearLogs = useSumoStore((s) => s.clearLogs);
  const updateMeasurement = useSumoStore((s) => s.updateMeasurement);
  const exportMeasurementsMarkdown = useSumoStore((s) => s.exportMeasurementsMarkdown);

  const [rawCmd, setRawCmd] = React.useState('');

  const handleSendRaw = () => {
    const clean = rawCmd.trim();
    if (!clean) return;
    const withStar = clean.endsWith('*') ? clean : `${clean}*`;
    void sendRaw(withStar);
    setRawCmd('');
  };

  const handleShareMeasurements = async () => {
    const report = exportMeasurementsMarkdown();
    await Share.share({ message: report, title: 'Medições Sumo_Auto_ESP32' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090D16' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 32 }}
        contentContainerClassName="pb-8 gap-3.5"
      >
        <View>
          <Text className="text-xl font-bold text-slate-50">Bancada & Medições</Text>
          <Text className="text-xs text-slate-400">
            Calibração, teste seguro de motores (rodas suspensas) e ficha técnica real
          </Text>
        </View>

        {/* Emergency + Calibration */}
        <Pressable
          onPress={() => {
            Vibration.vibrate(120);
            void emergencyStop();
          }}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-rose-600 py-4 active:opacity-80"
        >
          <OctagonAlert color="#FFF" size={20} />
          <Text className="text-sm font-extrabold text-white">PARADA IMEDIATA (PARADA*)</Text>
        </Pressable>

        <View className="flex-row gap-2.5">
          <Pressable
            onPress={() => {
              Vibration.vibrate(40);
              void calibrateAll();
            }}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#111827] py-3 active:opacity-75"
          >
            <Target color="#38BDF8" size={16} />
            <Text className="text-xs font-bold text-slate-100">Calibrar Linha+IMU</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Vibration.vibrate(40);
              void calibrateImu();
            }}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#111827] py-3 active:opacity-75"
          >
            <Compass color="#34D399" size={16} />
            <Text className="text-xs font-bold text-slate-100">Calibrar Só IMU</Text>
          </Pressable>
        </View>

        {/* Motor Bench D-Pad */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 items-center gap-3">
          <View className="w-full">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Teste de Motores em Bancada (Pré-Partida)
            </Text>
            <Text className="text-[11px] text-amber-400">
              Use somente com rodas suspensas. Soltar ou tocar no centro envia PARADA*.
            </Text>
          </View>

          <View className="gap-2">
            <View className="flex-row justify-center">
              <Pressable
                onPressIn={() => void benchJog('FRENTE')}
                onPressOut={() => void emergencyStop()}
                className="h-14 w-16 items-center justify-center rounded-xl bg-slate-800 active:bg-orange-600"
              >
                <ArrowUp color="#F8FAFC" size={24} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPressIn={() => void benchJog('ESQ')}
                onPressOut={() => void emergencyStop()}
                className="h-14 w-16 items-center justify-center rounded-xl bg-slate-800 active:bg-orange-600"
              >
                <ArrowLeft color="#F8FAFC" size={24} />
              </Pressable>
              <Pressable
                onPress={() => void emergencyStop()}
                className="h-14 w-16 items-center justify-center rounded-xl bg-rose-600 active:opacity-80"
              >
                <Square color="#FFF" size={20} fill="#FFF" />
              </Pressable>
              <Pressable
                onPressIn={() => void benchJog('DIR')}
                onPressOut={() => void emergencyStop()}
                className="h-14 w-16 items-center justify-center rounded-xl bg-slate-800 active:bg-orange-600"
              >
                <ArrowRight color="#F8FAFC" size={24} />
              </Pressable>
            </View>
            <View className="flex-row justify-center">
              <Pressable
                onPressIn={() => void benchJog('RE')}
                onPressOut={() => void emergencyStop()}
                className="h-14 w-16 items-center justify-center rounded-xl bg-slate-800 active:bg-orange-600"
              >
                <ArrowDown color="#F8FAFC" size={24} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Physical Measurements Checklist (Synced with README Unified Guide) */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Guia Unificado de Medições (Salvo no Celular)
              </Text>
              <Text className="text-[10px] text-slate-400">
                Anote na bancada/dohyō e exporte para calibrar firmware e simulador
              </Text>
            </View>
            <Pressable
              onPress={() => void handleShareMeasurements()}
              className="flex-row items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 active:opacity-80"
            >
              <Share2 color="#FFF" size={14} />
              <Text className="text-xs font-bold text-white">Exportar</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            <MeasureField
              label="Massa (kg)"
              value={measurements.massKg}
              placeholder="0.50"
              onChangeText={(v) => updateMeasurement('massKg', v)}
            />
            <MeasureField
              label="Bitola rodas (cm)"
              value={measurements.trackWidthCm}
              placeholder="9.0"
              onChangeText={(v) => updateMeasurement('trackWidthCm', v)}
            />
            <MeasureField
              label="CI Ponte H"
              value={measurements.hbridgeModel}
              placeholder="TB6612 / DRV8833"
              onChangeText={(v) => updateMeasurement('hbridgeModel', v)}
            />
            <MeasureField
              label="Vbat Multímetro (V)"
              value={measurements.vbatMultimeterV}
              placeholder="8.20"
              onChangeText={(v) => updateMeasurement('vbatMultimeterV', v)}
            />
            <MeasureField
              label="Alcance IR Claro (cm)"
              value={measurements.irRangeWhiteCm}
              placeholder="45"
              onChangeText={(v) => updateMeasurement('irRangeWhiteCm', v)}
            />
            <MeasureField
              label="Alcance IR Stealth (cm)"
              value={measurements.irRangeStealthCm}
              placeholder="22"
              onChangeText={(v) => updateMeasurement('irRangeStealthCm', v)}
            />
            <MeasureField
              label="ADC Preto (LD / LE)"
              value={`${measurements.adcBlackLd}`}
              placeholder="2050"
              onChangeText={(v) => updateMeasurement('adcBlackLd', v)}
            />
            <MeasureField
              label="ADC Branco (LD / LE)"
              value={`${measurements.adcWhiteLd}`}
              placeholder="130"
              onChangeText={(v) => updateMeasurement('adcWhiteLd', v)}
            />
            <MeasureField
              label="Reta 50cm (s)"
              value={measurements.sprint50cmSec}
              placeholder="0.55"
              onChangeText={(v) => updateMeasurement('sprint50cmSec', v)}
            />
            <MeasureField
              label="Parada Borda (cm)"
              value={measurements.edgeStopDistCm}
              placeholder="3.5"
              onChangeText={(v) => updateMeasurement('edgeStopDistCm', v)}
            />
            <MeasureField
              label="Atrito Estático (N)"
              value={measurements.muStaticForceN}
              placeholder="8.0"
              onChangeText={(v) => updateMeasurement('muStaticForceN', v)}
            />
            <MeasureField
              label="Força Stall 255 (N)"
              value={measurements.stallForceN}
              placeholder="9.5"
              onChangeText={(v) => updateMeasurement('stallForceN', v)}
            />
          </View>

          <View className="flex-row items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
            <Text className="text-xs text-slate-300">Ponte H suporta Short-Brake?</Text>
            <Switch
              value={measurements.supportsShortBrake}
              onValueChange={(v) => updateMeasurement('supportsShortBrake', v)}
              trackColor={{ false: '#334155', true: '#16A34A' }}
              thumbColor="#F8FAFC"
            />
          </View>
        </View>

        {/* BLE Raw Console */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Terminal color="#94A3B8" size={16} />
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Console BLE NUS
              </Text>
            </View>
            <Pressable onPress={clearLogs} className="p-1 active:opacity-70">
              <Trash2 color="#64748B" size={16} />
            </Pressable>
          </View>

          <View className="flex-row gap-2">
            <TextInput
              value={rawCmd}
              onChangeText={setRawCmd}
              placeholder="Comando (ex: INFO* ou EST,6*)"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              onSubmitEditing={handleSendRaw}
              className="h-10 flex-1 rounded-xl border border-slate-700 bg-[#090D16] px-3 font-mono text-xs text-slate-100"
            />
            <Pressable
              onPress={handleSendRaw}
              className="h-10 w-12 items-center justify-center rounded-xl bg-orange-600 active:opacity-80"
            >
              <Send color="#FFF" size={16} />
            </Pressable>
          </View>

          <View className="max-h-48 rounded-xl bg-[#060911] p-2.5 gap-1">
            {logs.slice(0, 14).map((item) => (
              <Text
                key={item.id}
                className={`font-mono text-[11px] ${
                  item.dir === 'tx'
                    ? 'text-orange-400'
                    : item.dir === 'rx'
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                }`}
              >
                [{item.time}] {item.dir.toUpperCase()}: {item.text}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
