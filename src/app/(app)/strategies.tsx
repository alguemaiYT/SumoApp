import { CheckCircle2, Info, ShieldAlert } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cmdIrStartDelay, STRATEGIES } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

export default function StrategiesScreen() {
  const info = useSumoStore((s) => s.info);
  const setStrategy = useSumoStore((s) => s.setStrategy);
  const sendRaw = useSumoStore((s) => s.sendRaw);

  const selectIrRule = async (ms: number) => {
    Vibration.vibrate(30);
    await sendRaw(cmdIrStartDelay(ms));
    await sendRaw('INFO*');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#090D16' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 32 }}
        contentContainerClassName="pb-8 gap-3"
      >
        <View>
          <Text className="text-xl font-bold text-slate-50">Estratégias & Regra IR</Text>
          <Text className="text-xs text-slate-400">
            Selecione a tática antes da luta — gravada automaticamente na EEPROM
          </Text>
        </View>

        {/* Official Tournament Rule Banner */}
        <View className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 gap-2">
          <View className="flex-row items-center gap-2">
            <ShieldAlert color="#FBBF24" size={18} />
            <Text className="text-xs font-bold text-amber-300">
              Início Oficial Somente por Infravermelho (Sony SIRC)
            </Text>
          </View>
          <Text className="text-xs leading-5 text-slate-300">
            Pelas regras oficiais de Sumô Autônomo, o Bluetooth é usado apenas na configuração pré-luta e desliga ao iniciar o combate. Use o módulo do juiz: 0x00 (Ready) → 0x01 (Start) → 0x02 (Stop).
          </Text>

          <View className="mt-1 flex-row gap-2">
            {[
              { ms: 0, title: 'IR 0 s (Imediato)', sub: 'RoboCore / Módulo Juiz' },
              { ms: 5000, title: 'IR + 5 s (Contagem)', sub: 'Torneios sem delay no juiz' },
            ].map((opt) => {
              const active = info.irStartDelayMs === opt.ms;
              return (
                <Pressable
                  key={opt.ms}
                  onPress={() => void selectIrRule(opt.ms)}
                  className={`flex-1 rounded-xl border p-2.5 ${
                    active
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-slate-700 bg-slate-900/80'
                  }`}
                >
                  <Text className={`text-xs font-bold ${active ? 'text-orange-300' : 'text-slate-200'}`}>
                    {opt.title}
                  </Text>
                  <Text className="text-[10px] text-slate-400">{opt.sub}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 7 Strategy Cards */}
        {STRATEGIES.map((st) => {
          const isSelected = info.estrategia === st.id;
          return (
            <Pressable
              key={st.id}
              onPress={() => {
                Vibration.vibrate(40);
                void setStrategy(st.id);
              }}
              className={`rounded-2xl border p-4 active:opacity-80 ${
                isSelected
                  ? 'border-orange-500 bg-orange-500/15'
                  : 'border-slate-800 bg-[#111827]'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-lg bg-slate-800 px-2 py-1">
                    <Text className="text-xs font-bold font-mono text-orange-400">
                      EST,{st.id}*
                    </Text>
                  </View>
                  <Text className="text-base font-bold text-slate-100">{st.name}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[10px] font-bold uppercase text-slate-400">
                    {st.shortTag}
                  </Text>
                  {isSelected ? <CheckCircle2 color="#FB923C" size={18} /> : null}
                </View>
              </View>

              <Text className="mt-2 text-xs leading-5 text-slate-300">{st.description}</Text>

              <View className="mt-2.5 flex-row items-center gap-1.5">
                <Info color="#94A3B8" size={13} />
                <Text className="text-[11px] font-medium text-slate-400">
                  Ideal contra: {st.bestAgainst}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
