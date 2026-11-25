import { RotateCcw, Save } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';

import { TOURNAMENT_PRESETS, type TournamentPreset } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

function ParamRow({
  label,
  code,
  unit,
  value,
  savedValue,
  onChange,
  step,
  min,
  max,
  decimals = 0,
  dividerColor,
}: {
  label: string;
  code: string;
  unit: string;
  value: number;
  savedValue: number;
  onChange: (next: number) => void;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  dividerColor: string;
}) {
  const clamp = (n: number) => {
    const c = Math.max(min, Math.min(max, n));
    return decimals > 0 ? Number(c.toFixed(decimals)) : Math.round(c);
  };

  const dirty = Math.abs(value - savedValue) > (decimals > 0 ? 0.001 : 0);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const stepLabel = decimals > 0 ? `±${step.toFixed(decimals)}` : `±${step}`;

  return (
    <View style={[styles.paramRow, { borderBottomColor: dividerColor }]}>
      <View style={styles.paramTop}>
        <View style={styles.paramLabelWrap}>
          {dirty ? <View style={styles.dirtyDot} /> : null}
          <Text style={styles.paramLabel}>{label}</Text>
          <Text style={styles.paramCode}>{code}</Text>
        </View>

        <View style={styles.valueInputWrap}>
          <TextInput
            value={decimals > 0 ? value.toFixed(decimals) : String(value)}
            keyboardType="numbers-and-punctuation"
            onChangeText={(txt) => {
              const parsed = Number.parseFloat(txt.replace(',', '.'));
              if (Number.isFinite(parsed)) onChange(clamp(parsed));
            }}
            style={[styles.valueInput, dirty && { color: '#FF4D00' }]}
          />
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>

        <View style={styles.barWrap}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${pct}%`, backgroundColor: dirty ? '#FF4D00' : '#FAFAFA' },
              ]}
            />
          </View>
          <View style={styles.barTicks}>
            <Text style={styles.tickText}>{decimals > 0 ? min.toFixed(decimals) : min}</Text>
            <Text style={styles.tickStep}>{stepLabel}</Text>
            <Text style={styles.tickText}>{decimals > 0 ? max.toFixed(decimals) : max}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => onChange(clamp(value + step))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const PRESET_SHORT: Record<string, string> = {
  balanced: 'Padrão',
  'anti-charger': 'Anti-Charger',
  'anti-stealth': 'Anti-Stealth',
  blitz: 'Blitz 255',
};

export default function TuningScreen() {
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const highContrast = useSumoStore((s) => s.highContrast);
  const saveTuning = useSumoStore((s) => s.saveTuning);
  const resetRobotConfig = useSumoStore((s) => s.resetRobotConfig);

  const [velocreta, setVelocreta] = React.useState(telemetry.velocreta);
  const [velocgiro, setVelocgiro] = React.useState(telemetry.velocgiro);
  const [hbevasao, setHbevasao] = React.useState(telemetry.HBEvasao);
  const [limiarParado, setLimiarParado] = React.useState(telemetry.limiarParado);
  const [limiarEmpurrado, setLimiarEmpurrado] = React.useState(telemetry.limiarEmpurrado);

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

  const changesCount =
    (velocreta !== telemetry.velocreta ? 1 : 0) +
    (velocgiro !== telemetry.velocgiro ? 1 : 0) +
    (hbevasao !== telemetry.HBEvasao ? 1 : 0) +
    (Math.abs(limiarParado - telemetry.limiarParado) > 0.001 ? 1 : 0) +
    (Math.abs(limiarEmpurrado - telemetry.limiarEmpurrado) > 0.001 ? 1 : 0);

  const isDirty = changesCount > 0;

  const loadPresetIntoDraft = (preset: TournamentPreset) => {
    Vibration.vibrate(25);
    setVelocreta(preset.velocreta);
    setVelocgiro(preset.velocgiro);
    setHbevasao(preset.HBEvasao);
    setLimiarParado(preset.limiarParado);
    setLimiarEmpurrado(preset.limiarEmpurrado);
  };

  const discardDraft = () => {
    setVelocreta(telemetry.velocreta);
    setVelocgiro(telemetry.velocgiro);
    setHbevasao(telemetry.HBEvasao);
    setLimiarParado(telemetry.limiarParado);
    setLimiarEmpurrado(telemetry.limiarEmpurrado);
  };

  const confirmReset = () => {
    Alert.alert(
      'Restaurar padrões de fábrica',
      'Isso sobrescreve as velocidades, limiares IMU e calibração na EEPROM do robô. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            Vibration.vibrate(60);
            void resetRobotConfig();
          },
        },
      ],
    );
  };

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const divider = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.08)';

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.container}>
        {/* Header + Subtle Factory Reset Action */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ajustes</Text>
          <Pressable onPress={confirmReset} style={styles.resetLink}>
            <RotateCcw color="#71717A" size={13} />
            <Text style={styles.resetText}>Padrões</Text>
          </Pressable>
        </View>

        {/* Compact 2x2 Preset Chips (fills draft so user sees dirty diff before saving) */}
        <View style={styles.presetGrid}>
          {TOURNAMENT_PRESETS.map((preset) => {
            const matches =
              velocreta === preset.velocreta &&
              velocgiro === preset.velocgiro &&
              hbevasao === preset.HBEvasao &&
              Math.abs(limiarParado - preset.limiarParado) < 0.005 &&
              Math.abs(limiarEmpurrado - preset.limiarEmpurrado) < 0.005;
            return (
              <Pressable
                key={preset.id}
                onPress={() => loadPresetIntoDraft(preset)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: matches ? 'rgba(255, 77, 0, 0.12)' : surface,
                    borderColor: matches ? '#FF4D00' : divider,
                  },
                ]}
              >
                <Text style={[styles.presetName, matches && { color: '#FF4D00' }]}>
                  {PRESET_SHORT[preset.id] ?? preset.name}
                </Text>
                <Text style={styles.presetMeta}>
                  VR {preset.velocreta} · VG {preset.velocgiro}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Group 1: VELOCIDADE */}
        <Text style={styles.sectionTitle}>VELOCIDADE</Text>
        <View style={[styles.groupBlock, { borderTopColor: divider }]}>
          <ParamRow
            label="Reta"
            code="VR"
            unit="PWM"
            value={velocreta}
            savedValue={telemetry.velocreta}
            onChange={setVelocreta}
            step={5}
            min={0}
            max={255}
            dividerColor={divider}
          />
          <ParamRow
            label="Giro"
            code="VG"
            unit="PWM"
            value={velocgiro}
            savedValue={telemetry.velocgiro}
            onChange={setVelocgiro}
            step={5}
            min={0}
            max={255}
            dividerColor={divider}
          />
        </View>

        {/* Group 2: IMU & EVASÃO */}
        <Text style={styles.sectionTitle}>IMU & EVASÃO</Text>
        <View style={[styles.groupBlock, { borderTopColor: divider }]}>
          <View style={[styles.switchRow, { borderBottomColor: divider }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.paramLabelWrap}>
                {hbevasao !== telemetry.HBEvasao ? <View style={styles.dirtyDot} /> : null}
                <Text style={styles.paramLabel}>Evasão por Impasse / Impacto</Text>
                <Text style={styles.paramCode}>HBE</Text>
              </View>
              <Text style={styles.switchSub}>Corner-break e giro contra pancada lateral</Text>
            </View>
            <Switch
              value={hbevasao}
              onValueChange={setHbevasao}
              trackColor={{ false: '#27272A', true: '#FF4D00' }}
              thumbColor="#FAFAFA"
            />
          </View>

          <ParamRow
            label="Limiar Parado"
            code="LIP"
            unit="m/s²"
            value={limiarParado}
            savedValue={telemetry.limiarParado}
            onChange={setLimiarParado}
            step={0.05}
            min={0.02}
            max={2.0}
            decimals={2}
            dividerColor={divider}
          />
          <ParamRow
            label="Limiar Empurrado"
            code="LIE"
            unit="m/s²"
            value={limiarEmpurrado}
            savedValue={telemetry.limiarEmpurrado}
            onChange={setLimiarEmpurrado}
            step={0.05}
            min={-3.0}
            max={-0.05}
            decimals={2}
            dividerColor={divider}
          />
        </View>
      </ScrollView>

      {/* Contextual Dirty-State Save Bar pinned above tab bar */}
      <View
        style={[
          styles.saveBar,
          {
            backgroundColor: isDirty ? '#121215' : bg,
            borderTopColor: isDirty ? 'rgba(255,77,0,0.4)' : divider,
          },
        ]}
      >
        {isDirty ? (
          <>
            <Pressable onPress={discardDraft} style={styles.discardBtn}>
              <Text style={styles.discardText}>Descartar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Vibration.vibrate(45);
                void saveTuning({
                  velocreta,
                  velocgiro,
                  HBEvasao: hbevasao,
                  limiarParado,
                  limiarEmpurrado,
                  irStartDelayMs: info.irStartDelayMs,
                });
              }}
              style={styles.saveBtnActive}
            >
              <Save color="#FFFFFF" size={15} />
              <Text style={styles.saveBtnText}>
                {changesCount === 1 ? '1 alteração' : `${changesCount} alterações`} · Salvar EEPROM
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.syncedBar}>
            <Text style={styles.syncedText}>Sincronizado com EEPROM do robô</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    width: '48.6%',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 2,
  },
  presetName: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  presetMeta: {
    color: '#71717A',
    fontSize: 10,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 4,
    marginBottom: -4,
  },
  groupBlock: {
    borderTopWidth: 1,
  },
  paramRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  paramTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paramLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D00',
  },
  paramLabel: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '600',
  },
  paramCode: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  valueInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  valueInput: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 56,
    height: 28,
    paddingVertical: 0,
    paddingHorizontal: 4,
    textAlignVertical: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  valueUnit: {
    color: '#71717A',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 34,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  barWrap: {
    flex: 1,
    gap: 4,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tickText: {
    color: '#52525B',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tickStep: {
    color: '#71717A',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchSub: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  discardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  discardText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtnActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FF4D00',
    paddingVertical: 10,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  syncedBar: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  syncedText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
});
