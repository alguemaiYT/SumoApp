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

import { DynamicSlider } from '@/components/sumo/DynamicSlider';
import {
  isLineEdgeDetected,
  type LineBorderMode,
  TOURNAMENT_PRESETS,
  type TournamentPreset,
} from '@/lib/sumo/protocol';
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
  fillFromRight = false,
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
  fillFromRight?: boolean;
  dividerColor: string;
}) {
  const clampExact = (n: number) => {
    const c = Math.max(min, Math.min(max, n));
    return decimals > 0 ? Number(c.toFixed(decimals)) : Math.round(c);
  };

  const dirty = Math.abs(value - savedValue) > (decimals > 0 ? 0.001 : 0);
  const stepLabel = decimals > 0 ? `±${step.toFixed(decimals)}` : `±${step}`;
  const accentCol = dirty ? '#FF4D00' : '#FAFAFA';

  return (
    <View style={[styles.paramRow, { borderBottomColor: dividerColor }]}>
      <View style={styles.paramTop}>
        <View style={styles.paramLabelWrap}>
          {dirty ? <View style={styles.dirtyDot} /> : null}
          <Text style={styles.paramLabel}>{label}</Text>
          <Text style={styles.paramCode}>{code}</Text>
        </View>

        <View style={styles.valueInputWrap}>
          <View
            style={[
              styles.inputPill,
              dirty && { borderColor: 'rgba(255,77,0,0.55)' },
            ]}
          >
            <TextInput
              value={decimals > 0 ? value.toFixed(decimals) : String(value)}
              keyboardType="numbers-and-punctuation"
              onChangeText={(txt) => {
                const parsed = Number.parseFloat(txt.replace(',', '.'));
                if (Number.isFinite(parsed)) onChange(clampExact(parsed));
              }}
              style={[styles.valueInput, dirty && { color: '#FF4D00' }]}
            />
          </View>
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Pressable
          onPress={() => onChange(clampExact(value - step))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>

        <View style={styles.barWrap}>
          <DynamicSlider
            value={value}
            min={min}
            max={max}
            step={step}
            decimals={decimals}
            fillFromRight={fillFromRight}
            accentColor={accentCol}
            onChange={onChange}
          />

          <View style={styles.barTicks}>
            <Text style={styles.tickText}>{decimals > 0 ? min.toFixed(decimals) : min}</Text>
            <Text style={styles.tickStep}>{stepLabel}</Text>
            <Text style={styles.tickText}>{decimals > 0 ? max.toFixed(decimals) : max}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => onChange(clampExact(value + step))}
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
  const savedVelocreta = useSumoStore((s) => s.telemetry.velocreta);
  const savedVelocgiro = useSumoStore((s) => s.telemetry.velocgiro);
  const savedHbevasao = useSumoStore((s) => s.telemetry.HBEvasao);
  const savedLimiarParado = useSumoStore((s) => s.telemetry.limiarParado);
  const savedLimiarEmpurrado = useSumoStore((s) => s.telemetry.limiarEmpurrado);
  const irStartDelayMs = useSumoStore((s) => s.info.irStartDelayMs);
  const lineSensorMode = useSumoStore((s) => s.info.lineSensorMode);
  const linhaLimiarDir = useSumoStore((s) => s.info.linhaLimiarDir);
  const linhaLimiarEsq = useSumoStore((s) => s.info.linhaLimiarEsq);
  const lineWhiteIsLow = useSumoStore((s) => s.info.lineWhiteIsLow);
  const lineCalFlags = useSumoStore((s) => s.info.lineCalFlags);
  const nvsOk = useSumoStore((s) => s.info.nvsOk);
  const sensorLD = useSumoStore((s) => s.telemetry.sensorLD);
  const sensorLE = useSumoStore((s) => s.telemetry.sensorLE);
  const lastLineCalEvent = useSumoStore((s) => s.lastLineCalEvent);
  const lineSweep = useSumoStore((s) => s.lineSweep);
  const highContrast = useSumoStore((s) => s.highContrast);
  const saveTuning = useSumoStore((s) => s.saveTuning);
  const setLineBorderMode = useSumoStore((s) => s.setLineBorderMode);
  const startLineSweep = useSumoStore((s) => s.startLineSweep);
  const cancelLineSweep = useSumoStore((s) => s.cancelLineSweep);
  const calibrateBlack = useSumoStore((s) => s.calibrateBlack);
  const calibrateWhite = useSumoStore((s) => s.calibrateWhite);
  const resetRobotConfig = useSumoStore((s) => s.resetRobotConfig);

  const lastNonZeroModeRef = React.useRef<Exclude<LineBorderMode, 0>>(3);
  React.useEffect(() => {
    if (lineSensorMode !== 0) {
      lastNonZeroModeRef.current = lineSensorMode;
    }
  }, [lineSensorMode]);

  const applyLineMode = (mode: LineBorderMode) => {
    Vibration.vibrate(25);
    if (mode !== 0) {
      lastNonZeroModeRef.current = mode;
    }
    void setLineBorderMode(mode);
  };

  const leEnabled = (lineSensorMode & 2) !== 0;
  const ldEnabled = (lineSensorMode & 1) !== 0;
  const leEdge = leEnabled && isLineEdgeDetected(sensorLE, linhaLimiarEsq, lineWhiteIsLow);
  const ldEdge = ldEnabled && isLineEdgeDetected(sensorLD, linhaLimiarDir, lineWhiteIsLow);
  const thrOp = lineWhiteIsLow ? '≤' : '≥';

  const [velocreta, setVelocreta] = React.useState(savedVelocreta);
  const [velocgiro, setVelocgiro] = React.useState(savedVelocgiro);
  const [hbevasao, setHbevasao] = React.useState(savedHbevasao);
  const [limiarParado, setLimiarParado] = React.useState(savedLimiarParado);
  const [limiarEmpurrado, setLimiarEmpurrado] = React.useState(savedLimiarEmpurrado);
  const isEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditingRef.current) return;
    setVelocreta(savedVelocreta);
    setVelocgiro(savedVelocgiro);
    setHbevasao(savedHbevasao);
    setLimiarParado(savedLimiarParado);
    setLimiarEmpurrado(savedLimiarEmpurrado);
  }, [
    savedVelocreta,
    savedVelocgiro,
    savedHbevasao,
    savedLimiarParado,
    savedLimiarEmpurrado,
  ]);

  const editVelocreta = (v: number) => {
    isEditingRef.current = true;
    setVelocreta(v);
  };
  const editVelocgiro = (v: number) => {
    isEditingRef.current = true;
    setVelocgiro(v);
  };
  const editHbevasao = (v: boolean) => {
    isEditingRef.current = true;
    setHbevasao(v);
  };
  const editLimiarParado = (v: number) => {
    isEditingRef.current = true;
    setLimiarParado(v);
  };
  const editLimiarEmpurrado = (v: number) => {
    isEditingRef.current = true;
    setLimiarEmpurrado(v);
  };

  const changesCount =
    (velocreta !== savedVelocreta ? 1 : 0) +
    (velocgiro !== savedVelocgiro ? 1 : 0) +
    (hbevasao !== savedHbevasao ? 1 : 0) +
    (Math.abs(limiarParado - savedLimiarParado) > 0.001 ? 1 : 0) +
    (Math.abs(limiarEmpurrado - savedLimiarEmpurrado) > 0.001 ? 1 : 0);

  const isDirty = changesCount > 0;
  if (!isDirty) {
    isEditingRef.current = false;
  }

  const loadPresetIntoDraft = (preset: TournamentPreset) => {
    Vibration.vibrate(25);
    isEditingRef.current = true;
    setVelocreta(preset.velocreta);
    setVelocgiro(preset.velocgiro);
    setHbevasao(preset.HBEvasao);
    setLimiarParado(preset.limiarParado);
    setLimiarEmpurrado(preset.limiarEmpurrado);
  };

  const discardDraft = () => {
    isEditingRef.current = false;
    setVelocreta(savedVelocreta);
    setVelocgiro(savedVelocgiro);
    setHbevasao(savedHbevasao);
    setLimiarParado(savedLimiarParado);
    setLimiarEmpurrado(savedLimiarEmpurrado);
  };

  const confirmReset = () => {
    Alert.alert(
      'Resetar EEPROM de fábrica',
      'Isso sobrescreve as velocidades, limiares IMU e calibração na memória do robô. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: () => {
            Vibration.vibrate(60);
            isEditingRef.current = false;
            void resetRobotConfig();
          },
        },
      ],
    );
  };

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const divider = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.container}>
        {/* Header + Unambiguous Resetar Action */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Ajustes</Text>
          <Pressable onPress={confirmReset} style={styles.resetLink}>
            <RotateCcw color="#9A9AA6" size={13} />
            <Text style={styles.resetText}>Resetar</Text>
          </Pressable>
        </View>

        {/* Compact 2x2 Preset Chips */}
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
            savedValue={savedVelocreta}
            onChange={editVelocreta}
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
            savedValue={savedVelocgiro}
            onChange={editVelocgiro}
            step={5}
            min={0}
            max={255}
            dividerColor={divider}
          />
        </View>

        {/* Group 2: BORDA BRANCA (SENSOR DE LINHA) */}
        <Text style={styles.sectionTitle}>BORDA BRANCA (SENSOR DE LINHA)</Text>
        <View style={[styles.groupBlock, { borderTopColor: divider }]}>
          <View style={[styles.switchRow, { borderBottomColor: divider }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.paramLabelWrap}>
                <Text style={styles.paramLabel}>Evasão por Borda Branca</Text>
                <Text style={styles.paramCode}>LBM</Text>
              </View>
              <Text style={styles.switchSub}>
                Recua na faixa branca · auto-isola em 1.2s se sensor travar (salva na NVS)
              </Text>
            </View>
            <Switch
              value={lineSensorMode !== 0}
              onValueChange={(on) => applyLineMode(on ? lastNonZeroModeRef.current : 0)}
              trackColor={{ false: '#27272A', true: '#FF4D00' }}
              thumbColor="#FAFAFA"
            />
          </View>

          <View style={[styles.linePanel, { borderBottomColor: divider }]}>
            <View style={styles.lineModeRow}>
              {(
                [
                  { mode: 0 as LineBorderMode, label: 'OFF' },
                  { mode: 3 as LineBorderMode, label: 'AMBOS' },
                  { mode: 2 as LineBorderMode, label: 'SÓ ESQ' },
                  { mode: 1 as LineBorderMode, label: 'SÓ DIR' },
                ] as const
              ).map((opt) => {
                const active = lineSensorMode === opt.mode;
                const isOff = opt.mode === 0;
                return (
                  <Pressable
                    key={opt.mode}
                    onPress={() => applyLineMode(opt.mode)}
                    style={[
                      styles.lineModePill,
                      {
                        backgroundColor: active
                          ? isOff
                            ? 'rgba(239,68,68,0.16)'
                            : 'rgba(255,77,0,0.16)'
                          : surface,
                        borderColor: active ? (isOff ? '#EF4444' : '#FF4D00') : divider,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lineModePillText,
                        active && { color: isOff ? '#FCA5A5' : '#FF4D00' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.lineLiveStrip, { backgroundColor: surface, borderColor: divider }]}>
              <View style={styles.lineLiveCell}>
                <Text style={styles.lineLiveLabel}>LE · 39</Text>
                <Text style={[styles.lineLiveVal, !leEnabled && { color: '#71717A' }]}>
                  {sensorLE}
                </Text>
                <Text
                  style={[
                    styles.lineLiveBadge,
                    !leEnabled
                      ? { color: '#71717A' }
                      : leEdge
                        ? { color: '#F59E0B' }
                        : { color: '#22C55E' },
                  ]}
                >
                  {!leEnabled ? 'OFF' : leEdge ? 'BORDA' : `PISTA (${thrOp}${linhaLimiarEsq})`}
                </Text>
              </View>
              <View style={[styles.lineLiveDivider, { backgroundColor: divider }]} />
              <View style={styles.lineLiveCell}>
                <Text style={styles.lineLiveLabel}>LD · 26</Text>
                <Text style={[styles.lineLiveVal, !ldEnabled && { color: '#71717A' }]}>
                  {sensorLD}
                </Text>
                <Text
                  style={[
                    styles.lineLiveBadge,
                    !ldEnabled
                      ? { color: '#71717A' }
                      : ldEdge
                        ? { color: '#F59E0B' }
                        : { color: '#22C55E' },
                  ]}
                >
                  {!ldEnabled ? 'OFF' : ldEdge ? 'BORDA' : `PISTA (${thrOp}${linhaLimiarDir})`}
                </Text>
              </View>
            </View>

            {lineSweep?.active ? (
              <View style={[styles.sweepCard, { backgroundColor: surface }]}>
                <View style={styles.sweepTopRow}>
                  <Text style={styles.sweepTitle}>
                    Varrendo Branco ↔ Preto ({(lineSweep.remainingMs / 1000).toFixed(1)}s)
                  </Text>
                  <Pressable
                    onPress={() => {
                      Vibration.vibrate(20);
                      void cancelLineSweep();
                    }}
                    style={styles.sweepCancelBtn}
                  >
                    <Text style={styles.sweepCancelText}>Cancelar</Text>
                  </Pressable>
                </View>
                <View style={styles.sweepBarTrack}>
                  <View
                    style={[
                      styles.sweepBarFill,
                      {
                        width: `${Math.max(
                          4,
                          Math.min(
                            100,
                            ((lineSweep.durationMs - lineSweep.remainingMs) /
                              Math.max(1, lineSweep.durationMs)) *
                              100,
                          ),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.sweepRangeText}>
                  LE:{' '}
                  {lineSweep.leMin <= lineSweep.leMax
                    ? `${lineSweep.leMin}..${lineSweep.leMax} (Δ${lineSweep.leMax - lineSweep.leMin})`
                    : 'mova sobre a linha'}{' '}
                  · LD:{' '}
                  {lineSweep.ldMin <= lineSweep.ldMax
                    ? `${lineSweep.ldMin}..${lineSweep.ldMax} (Δ${lineSweep.ldMax - lineSweep.ldMin})`
                    : 'mova sobre a linha'}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Vibration.vibrate(40);
                  void startLineSweep(8000);
                }}
                style={styles.sweepStartBtn}
              >
                <Text style={styles.sweepStartTitle}>
                  Calibrar 8s estilo QTR (Branco ↔ Preto)
                </Text>
                <Text style={styles.sweepStartSub}>
                  Passe os sensores entre a pista preta e a faixa branca por 8s
                </Text>
              </Pressable>
            )}

            <View style={styles.lineCalRow}>
              <Pressable
                onPress={() => {
                  Vibration.vibrate(35);
                  void calibrateBlack();
                }}
                style={[styles.lineCalBtn, { backgroundColor: surface, borderColor: divider }]}
              >
                <Text style={styles.lineCalBtnText}>Manual: 1. PRETO</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Vibration.vibrate(35);
                  void calibrateWhite();
                }}
                style={[
                  styles.lineCalBtn,
                  {
                    backgroundColor: surface,
                    borderColor: lineCalFlags === 3 ? 'rgba(34,197,94,0.5)' : divider,
                  },
                ]}
              >
                <Text style={[styles.lineCalBtnText, { color: '#FAFAFA' }]}>
                  Manual: 2. BRANCO
                </Text>
              </Pressable>
            </View>

            {lastLineCalEvent ? (
              <Text
                style={[
                  styles.lineCalHint,
                  {
                    color:
                      lastLineCalEvent.ok && lastLineCalEvent.nvsOk ? '#22C55E' : '#F59E0B',
                  },
                ]}
              >
                {lastLineCalEvent.kind === 'sweep'
                  ? lastLineCalEvent.ok
                    ? `QTR 8s salvo: LE ${lastLineCalEvent.leMin ?? 0}↔${lastLineCalEvent.leMax ?? 0} (thr ${lastLineCalEvent.leThr}) · LD ${lastLineCalEvent.ldMin ?? 0}↔${lastLineCalEvent.ldMax ?? 0} (thr ${lastLineCalEvent.ldThr})`
                    : `QTR 8s contraste parcial (ΔLE=${lastLineCalEvent.cEsq ?? 0}, ΔLD=${lastLineCalEvent.cDir ?? 0}) → thr LE=${lastLineCalEvent.leThr} / LD=${lastLineCalEvent.ldThr}`
                  : lastLineCalEvent.kind === 'preto'
                    ? `Preto salvo: LD=${lastLineCalEvent.ld} · LE=${lastLineCalEvent.le} → limiares ${lastLineCalEvent.ldThr}/${lastLineCalEvent.leThr}`
                    : lastLineCalEvent.ok
                      ? `Branco 2P salvo: LD=${lastLineCalEvent.ld} · LE=${lastLineCalEvent.le} → limiares ${lastLineCalEvent.ldThr}/${lastLineCalEvent.leThr}`
                      : 'Contraste baixo no branco! Posicione os sensores sobre a faixa branca e repita.'}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Group 3: IMU & EVASÃO */}
        <Text style={styles.sectionTitle}>IMU & EVASÃO</Text>
        <View style={[styles.groupBlock, { borderTopColor: divider }]}>
          <View style={[styles.switchRow, { borderBottomColor: divider }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.paramLabelWrap}>
                {hbevasao !== savedHbevasao ? <View style={styles.dirtyDot} /> : null}
                <Text style={styles.paramLabel}>Evasão por Impasse / Impacto</Text>
                <Text style={styles.paramCode}>HBE</Text>
              </View>
              <Text style={styles.switchSub}>Corner-break e giro contra pancada lateral</Text>
            </View>
            <Switch
              value={hbevasao}
              onValueChange={editHbevasao}
              trackColor={{ false: '#27272A', true: '#FF4D00' }}
              thumbColor="#FAFAFA"
            />
          </View>

          <ParamRow
            label="Limiar Parado"
            code="LIP"
            unit="m/s²"
            value={limiarParado}
            savedValue={savedLimiarParado}
            onChange={editLimiarParado}
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
            savedValue={savedLimiarEmpurrado}
            onChange={editLimiarEmpurrado}
            step={0.05}
            min={-3.0}
            max={-0.05}
            decimals={2}
            fillFromRight
            dividerColor={divider}
          />
        </View>
      </ScrollView>

      {/* Contextual Dirty-State Save Bar */}
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
                isEditingRef.current = false;
                void saveTuning({
                  velocreta,
                  velocgiro,
                  HBEvasao: hbevasao,
                  limiarParado,
                  limiarEmpurrado,
                  irStartDelayMs,
                });
              }}
              style={styles.saveBtnActive}
            >
              <Save color="#FFFFFF" size={15} />
              <Text style={styles.saveBtnText}>
                {changesCount === 1 ? '1 alteração' : `${changesCount} alterações`} · Salvar NVS
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.syncedBar}>
            <Text style={[styles.syncedText, !nvsOk && { color: '#EF4444' }]}>
              {nvsOk ? 'Sincronizado com NVS/EEPROM do robô' : 'Alerta: falha ao gravar na NVS do robô'}
            </Text>
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
    gap: 11,
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
    color: '#B4B4BE',
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
    color: '#9A9AA6',
    fontSize: 10,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 2,
    marginBottom: -4,
  },
  groupBlock: {
    borderTopWidth: 1,
  },
  paramRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 9,
  },
  paramTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paramLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  valueInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  inputPill: {
    backgroundColor: '#161619',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 30,
    justifyContent: 'center',
  },
  valueInput: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 50,
    height: 28,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
  },
  valueUnit: {
    color: '#9A9AA6',
    fontSize: 11,
    fontFamily: 'monospace',
    width: 34,
    textAlign: 'left',
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
    backgroundColor: '#161619',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    gap: 2,
  },
  sliderHit: {
    height: 18,
    justifyContent: 'center',
    position: 'relative',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272A',
    overflow: 'hidden',
    position: 'relative',
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
    top: 1,
    width: 4,
    height: 16,
    marginLeft: -2,
    borderRadius: 2,
  },
  barTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tickText: {
    color: '#8E8E98',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tickStep: {
    color: '#9A9AA6',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  switchSub: {
    color: '#9A9AA6',
    fontSize: 11,
    marginTop: 2,
  },
  linePanel: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  lineModeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  lineModePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  lineModePillText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  lineLiveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  lineLiveCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  lineLiveDivider: {
    width: 1,
    height: 18,
    marginHorizontal: 8,
  },
  lineLiveLabel: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  lineLiveVal: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  lineLiveBadge: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  lineCalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineCalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  lineCalBtnText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '700',
  },
  lineCalHint: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  sweepStartBtn: {
    backgroundColor: 'rgba(255,77,0,0.14)',
    borderColor: '#FF4D00',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  sweepStartTitle: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
  sweepStartSub: {
    color: '#D4D4D8',
    fontSize: 10,
  },
  sweepCard: {
    borderColor: '#FF4D00',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 6,
  },
  sweepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sweepTitle: {
    color: '#FF4D00',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sweepCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sweepCancelText: {
    color: '#D4D4D8',
    fontSize: 10,
    fontWeight: '700',
  },
  sweepBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  sweepBarFill: {
    height: '100%',
    backgroundColor: '#FF4D00',
    borderRadius: 3,
  },
  sweepRangeText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
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
    borderColor: 'rgba(255,255,255,0.14)',
  },
  discardText: {
    color: '#D4D4D8',
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
    color: '#9A9AA6',
    fontSize: 11,
    fontWeight: '600',
  },
});
