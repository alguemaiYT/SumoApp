import { RotateCcw, Save, Sparkles } from 'lucide-react-native';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TOURNAMENT_PRESETS } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

function StepperRow({
  label,
  unit,
  value,
  onChange,
  step,
  min,
  max,
  decimals = 0,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (next: number) => void;
  step: number;
  min: number;
  max: number;
  decimals?: number;
}) {
  const clamp = (n: number) => {
    const c = Math.max(min, Math.min(max, n));
    return decimals > 0 ? Number(c.toFixed(decimals)) : Math.round(c);
  };

  return (
    <View className="rounded-xl border border-slate-800 bg-slate-900 p-3 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-slate-200">{label}</Text>
        <Text className="text-[11px] font-mono text-slate-400">{unit}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          className="h-10 w-12 items-center justify-center rounded-lg bg-slate-800 active:opacity-75"
        >
          <Text className="text-lg font-bold text-slate-100">-</Text>
        </Pressable>
        <TextInput
          value={String(value)}
          keyboardType="numbers-and-punctuation"
          onChangeText={(txt) => {
            const parsed = Number.parseFloat(txt.replace(',', '.'));
            if (Number.isFinite(parsed)) onChange(clamp(parsed));
          }}
          className="h-10 flex-1 rounded-lg border border-slate-700 bg-[#090D16] text-center font-mono text-sm font-bold text-slate-100"
        />
        <Pressable
          onPress={() => onChange(clamp(value + step))}
          className="h-10 w-12 items-center justify-center rounded-lg bg-slate-800 active:opacity-75"
        >
          <Text className="text-lg font-bold text-slate-100">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function TuningScreen() {
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const saveTuning = useSumoStore((s) => s.saveTuning);
  const applyPreset = useSumoStore((s) => s.applyPreset);
  const resetRobotConfig = useSumoStore((s) => s.resetRobotConfig);

  const [velocreta, setVelocreta] = React.useState(telemetry.velocreta);
  const [velocgiro, setVelocgiro] = React.useState(telemetry.velocgiro);
  const [hbevasao, setHbevasao] = React.useState(telemetry.HBEvasao);
  const [limiarParado, setLimiarParado] = React.useState(telemetry.limiarParado);
  const [limiarEmpurrado, setLimiarEmpurrado] = React.useState(telemetry.limiarEmpurrado);
  const [irDelay, setIrDelay] = React.useState(info.irStartDelayMs);

  React.useEffect(() => {
    setVelocreta(telemetry.velocreta);
    setVelocgiro(telemetry.velocgiro);
    setHbevasao(telemetry.HBEvasao);
    setLimiarParado(telemetry.limiarParado);
    setLimiarEmpurrado(telemetry.limiarEmpurrado);
  }, [
    telemetry.velocreta,
    telemetry.velocgiro,
    telemetry.HBEvasao,
    telemetry.limiarParado,
    telemetry.limiarEmpurrado,
  ]);

  React.useEffect(() => {
    setIrDelay(info.irStartDelayMs);
  }, [info.irStartDelayMs]);

  return (
    <SafeAreaView className="flex-1 bg-[#090D16]" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-2" contentContainerClassName="pb-8 gap-3.5">
        <View>
          <Text className="text-xl font-bold text-slate-50">Ajustes & Perfis</Text>
          <Text className="text-xs text-slate-400">
            Parâmetros gravados em EEPROM com suporte completo a floats (LIP/LIE)
          </Text>
        </View>

        {/* Presets */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-2.5">
          <View className="flex-row items-center gap-2">
            <Sparkles color="#FB923C" size={16} />
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Perfis Rápidos de Competição
            </Text>
          </View>
          <View className="gap-2">
            {TOURNAMENT_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => {
                  Vibration.vibrate(35);
                  void applyPreset(preset);
                }}
                className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 active:opacity-75"
              >
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-100">{preset.name}</Text>
                  <Text className="text-[11px] text-slate-400">{preset.subtitle}</Text>
                </View>
                <Text className="font-mono text-[10px] text-orange-400">
                  EST {preset.estrategia} • VR {preset.velocreta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Fine Parameters */}
        <View className="rounded-2xl border border-slate-800 bg-[#111827] p-4 gap-3">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Ajuste Fino
          </Text>

          <StepperRow
            label="Velocidade Reta (VR)"
            unit="0..255 PWM"
            value={velocreta}
            onChange={setVelocreta}
            step={5}
            min={0}
            max={255}
          />
          <StepperRow
            label="Velocidade Giro (VG)"
            unit="0..255 PWM"
            value={velocgiro}
            onChange={setVelocgiro}
            step={5}
            min={0}
            max={255}
          />

          <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-semibold text-slate-100">
                Evasão IMU — Stalemate & Impacto (HBE)
              </Text>
              <Text className="text-[11px] text-slate-400">
                Ativa corner-break em impasse e giro contra pancada lateral
              </Text>
            </View>
            <Switch
              value={hbevasao}
              onValueChange={setHbevasao}
              trackColor={{ false: '#334155', true: '#EA580C' }}
              thumbColor="#F8FAFC"
            />
          </View>

          <StepperRow
            label="Limiar Parado (LIP)"
            unit="m/s² (float)"
            value={limiarParado}
            onChange={setLimiarParado}
            step={0.05}
            min={0.02}
            max={2.0}
            decimals={2}
          />
          <StepperRow
            label="Limiar Empurrado (LIE)"
            unit="m/s² (negativo)"
            value={limiarEmpurrado}
            onChange={setLimiarEmpurrado}
            step={0.05}
            min={-3.0}
            max={-0.05}
            decimals={2}
          />
        </View>

        {/* Actions */}
        <Pressable
          onPress={() => {
            Vibration.vibrate(50);
            void saveTuning({
              velocreta,
              velocgiro,
              HBEvasao: hbevasao,
              limiarParado,
              limiarEmpurrado,
              irStartDelayMs: irDelay,
            });
          }}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-orange-600 py-4 active:opacity-80"
        >
          <Save color="#FFF" size={18} />
          <Text className="text-sm font-bold text-white">Salvar Tudo na EEPROM do Robô</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Vibration.vibrate(60);
            void resetRobotConfig();
          }}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 py-3.5 active:opacity-75"
        >
          <RotateCcw color="#94A3B8" size={16} />
          <Text className="text-xs font-semibold text-slate-300">
            Restaurar Padrões de Fábrica (RESET_CFG*)
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
