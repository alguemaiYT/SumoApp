import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Send,
  Share2,
  Square,
  Target,
  Trash2,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';

import { type ConsoleEntry, useSumoStore } from '@/lib/sumo/store';

export type BenchTab = 'controle' | 'calibracao' | 'ficha';

const QUICK_CMDS = ['INFO*', 'dados*', 'CAL*', 'PARADA*'] as const;

function logLineColor(entry: ConsoleEntry): string {
  const lower = entry.text.toLowerCase();
  if (
    lower.includes('erro') ||
    lower.includes('falha') ||
    lower.includes('sem conexão') ||
    lower.includes('negada')
  ) {
    return '#EF4444';
  }
  if (entry.dir === 'tx') return '#38BDF8';
  if (entry.dir === 'rx') return '#22C55E';
  return '#A1A1AA';
}

function SpecRow({
  label,
  value,
  unit,
  placeholder,
  onChangeText,
  dividerColor,
}: {
  label: string;
  value: string;
  unit?: string;
  placeholder: string;
  onChangeText: (v: string) => void;
  dividerColor: string;
}) {
  return (
    <View style={[styles.specRow, { borderBottomColor: dividerColor }]}>
      <Text style={styles.specLabel}>{label}</Text>
      <View style={styles.specInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#71717A"
          style={styles.specInput}
        />
        {unit ? <Text style={styles.specUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function BenchView({ initialTab = 'controle' }: { initialTab?: BenchTab }) {
  const [subTab, setSubTab] = React.useState<BenchTab>(initialTab);
  const [rawCmd, setRawCmd] = React.useState('');
  const [cmdFocused, setCmdFocused] = React.useState(false);
  const [calFeedback, setCalFeedback] = React.useState<string | null>(null);
  const logScrollRef = React.useRef<ScrollView>(null);

  const logs = useSumoStore((s) => s.logs);
  const telemetry = useSumoStore((s) => s.telemetry);
  const info = useSumoStore((s) => s.info);
  const highContrast = useSumoStore((s) => s.highContrast);
  const measurements = useSumoStore((s) => s.measurements);

  const emergencyStop = useSumoStore((s) => s.emergencyStop);
  const calibrateAll = useSumoStore((s) => s.calibrateAll);
  const calibrateImu = useSumoStore((s) => s.calibrateImu);
  const benchJog = useSumoStore((s) => s.benchJog);
  const sendRaw = useSumoStore((s) => s.sendRaw);
  const clearLogs = useSumoStore((s) => s.clearLogs);
  const updateMeasurement = useSumoStore((s) => s.updateMeasurement);
  const exportMeasurementsMarkdown = useSumoStore((s) => s.exportMeasurementsMarkdown);

  // Chronological terminal order: oldest on top, newest anchored at bottom next to input
  const chronologicalLogs = React.useMemo(() => [...logs.slice(0, 30)].reverse(), [logs]);

  React.useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => setCmdFocused(false));
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    logScrollRef.current?.scrollToEnd({ animated: false });
  }, [chronologicalLogs.length]);

  const handleSendRaw = () => {
    const clean = rawCmd.trim();
    if (!clean) return;
    const withStar = clean.endsWith('*') ? clean : `${clean}*`;
    void sendRaw(withStar);
    setRawCmd('');
  };

  const handleShareMeasurements = async () => {
    const report = exportMeasurementsMarkdown();
    await Share.share({ message: report, title: 'Ficha Técnica Sumo_Auto_ESP32' });
  };

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const divider = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      {/* Top 3-Way Context Segmented Control */}
      <View style={[styles.segWrap, { borderBottomColor: divider }]}>
        <View style={[styles.segTrack, { backgroundColor: surface, borderColor: divider }]}>
          {[
            { id: 'controle' as const, label: 'Controle' },
            { id: 'calibracao' as const, label: 'Calibração' },
            { id: 'ficha' as const, label: 'Ficha Técnica' },
          ].map((t) => {
            const active = subTab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setSubTab(t.id)}
                style={[styles.segBtn, active && styles.segBtnActive]}
              >
                <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* SUB-TAB 1: CONTROLE (Split View: Chronological Terminal + Quick Chips + Thumb D-Pad) */}
      {subTab === 'controle' ? (
        <View style={styles.splitWrap}>
          {/* Live BLE NUS Console */}
          <View style={[styles.consolePane, { backgroundColor: surface, borderColor: divider }]}>
            <View style={[styles.consoleHeader, { borderBottomColor: divider }]}>
              <Text style={styles.microLabel}>CONSOLE BLE NUS</Text>
              <Pressable onPress={clearLogs} hitSlop={8}>
                <Trash2 color="#9A9AA6" size={14} />
              </Pressable>
            </View>

            <ScrollView
              ref={logScrollRef}
              style={styles.logList}
              contentContainerStyle={styles.logListContent}
            >
              {chronologicalLogs.map((item) => (
                <Text
                  key={item.id}
                  style={[styles.logLine, { color: logLineColor(item) }]}
                >
                  [{item.time}] {item.dir.toUpperCase()} {item.text}
                </Text>
              ))}
            </ScrollView>

            {/* Quick Command Shortcut Chips */}
            <View style={[styles.quickChipRow, { borderTopColor: divider }]}>
              {QUICK_CMDS.map((cmd) => (
                <Pressable
                  key={cmd}
                  onPress={() => {
                    Vibration.vibrate(15);
                    void sendRaw(cmd);
                  }}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>{cmd}</Text>
                </Pressable>
              ))}
            </View>

            {/* Command Input Row */}
            <View style={[styles.cmdBar, { borderTopColor: divider }]}>
              <TextInput
                value={rawCmd}
                onChangeText={setRawCmd}
                onFocus={() => setCmdFocused(true)}
                onBlur={() => setCmdFocused(false)}
                placeholder="Comando serial (ex: EST,6*)"
                placeholderTextColor="#71717A"
                autoCapitalize="characters"
                onSubmitEditing={handleSendRaw}
                style={styles.cmdInput}
              />
              <Pressable onPress={handleSendRaw} style={styles.cmdSendBtn}>
                <Send color="#FFFFFF" size={14} />
              </Pressable>
            </View>
          </View>

          {/* Ergonomic Thumb-Zone D-Pad (auto-hides while keyboard is open) */}
          {!cmdFocused ? (
            <View style={styles.dpadPane}>
              <Text style={styles.safetyNote}>
                Rodas suspensas · segure para acionar · soltar envia parada
              </Text>

              <View style={styles.dpadGrid}>
                <View style={styles.dpadRow}>
                  <Pressable
                    onPressIn={() => {
                      Vibration.vibrate(20);
                      void benchJog('FRENTE');
                    }}
                    onPressOut={() => void emergencyStop()}
                    style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
                  >
                    <ArrowUp color="#FAFAFA" size={26} />
                  </Pressable>
                </View>

                <View style={styles.dpadRow}>
                  <Pressable
                    onPressIn={() => {
                      Vibration.vibrate(20);
                      void benchJog('ESQ');
                    }}
                    onPressOut={() => void emergencyStop()}
                    style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
                  >
                    <ArrowLeft color="#FAFAFA" size={26} />
                  </Pressable>

                  {/* Softened graphite stop key with subtle red border (global STOP owns red fill) */}
                  <Pressable
                    onPress={() => {
                      Vibration.vibrate(90);
                      void emergencyStop();
                    }}
                    style={styles.dpadStop}
                  >
                    <Square color="#EF4444" size={18} fill="#EF4444" />
                  </Pressable>

                  <Pressable
                    onPressIn={() => {
                      Vibration.vibrate(20);
                      void benchJog('DIR');
                    }}
                    onPressOut={() => void emergencyStop()}
                    style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
                  >
                    <ArrowRight color="#FAFAFA" size={26} />
                  </Pressable>
                </View>

                <View style={styles.dpadRow}>
                  <Pressable
                    onPressIn={() => {
                      Vibration.vibrate(20);
                      void benchJog('RE');
                    }}
                    onPressOut={() => void emergencyStop()}
                    style={[styles.dpadKey, { backgroundColor: surface, borderColor: divider }]}
                  >
                    <ArrowDown color="#FAFAFA" size={26} />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* SUB-TAB 2: CALIBRAÇÃO */}
      {subTab === 'calibracao' ? (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>ROTINAS DE CALIBRAÇÃO</Text>

          <Pressable
            onPress={() => {
              Vibration.vibrate(35);
              setCalFeedback('Calibrando sensores de linha (pista preta) e offsets da IMU...');
              void calibrateAll();
            }}
            style={[styles.calAction, { backgroundColor: surface, borderColor: divider }]}
          >
            <Target color="#FF4D00" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.calTitle}>Calibrar Linha + IMU</Text>
              <Text style={styles.calSub}>
                Posicione o robô imóvel sobre a área preta do dohyō
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Vibration.vibrate(35);
              setCalFeedback('Recalibrando bias do acelerômetro e giroscópio (mantenha imóvel)...');
              void calibrateImu();
            }}
            style={[styles.calAction, { backgroundColor: surface, borderColor: divider }]}
          >
            <Compass color="#FAFAFA" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.calTitle}>Calibrar Somente IMU</Text>
              <Text style={styles.calSub}>
                Zera drift do giroscópio (Z) e referencial de aceleração
              </Text>
            </View>
          </Pressable>

          {calFeedback ? (
            <View style={[styles.feedbackRow, { borderColor: 'rgba(255,77,0,0.4)' }]}>
              <Text style={styles.feedbackText}>{calFeedback}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>LEITURA E LIMIARES ATUAIS</Text>
          <View style={[styles.readoutTable, { borderTopColor: divider }]}>
            {[
              { k: 'Linha Esq (LE)', cur: `${telemetry.sensorLE}`, ref: `limiar ≤ ${info.linhaLimiarEsq}` },
              { k: 'Linha Dir (LD)', cur: `${telemetry.sensorLD}`, ref: `limiar ≤ ${info.linhaLimiarDir}` },
              { k: 'Aceleração (ax / ay)', cur: `${info.ax.toFixed(2)} / ${info.ay.toFixed(2)}`, ref: 'm/s²' },
              { k: 'Giroscópio (gz / Yaw)', cur: `${info.gz.toFixed(1)} °/s`, ref: `hdg ${info.headingDeg.toFixed(1)}°` },
            ].map((row) => (
              <View key={row.k} style={[styles.readoutRow, { borderBottomColor: divider }]}>
                <Text style={styles.specLabel}>{row.k}</Text>
                <View style={styles.readoutRight}>
                  <Text style={styles.readoutVal}>{row.cur}</Text>
                  <Text style={styles.readoutRef}>{row.ref}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {/* SUB-TAB 3: FICHA TÉCNICA */}
      {subTab === 'ficha' ? (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
          <View style={styles.fichaHeader}>
            <Text style={styles.sectionTitleInline}>CHASSI & DRIVER</Text>
            <Pressable
              onPress={() => void handleShareMeasurements()}
              style={[styles.exportBtn, { borderColor: divider, backgroundColor: surface }]}
            >
              <Share2 color="#FAFAFA" size={13} />
              <Text style={styles.exportText}>Exportar</Text>
            </Pressable>
          </View>

          <View style={[styles.readoutTable, { borderTopColor: divider }]}>
            <SpecRow
              label="Massa total"
              value={measurements.massKg}
              unit="kg"
              placeholder="0.50"
              onChangeText={(v) => updateMeasurement('massKg', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Bitola entre rodas"
              value={measurements.trackWidthCm}
              unit="cm"
              placeholder="9.0"
              onChangeText={(v) => updateMeasurement('trackWidthCm', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="CI Ponte H"
              value={measurements.hbridgeModel}
              placeholder="TB6612FNG"
              onChangeText={(v) => updateMeasurement('hbridgeModel', v)}
              dividerColor={divider}
            />
            <View style={[styles.specRow, { borderBottomColor: divider }]}>
              <Text style={styles.specLabel}>Suporta Short-Brake</Text>
              <Switch
                value={measurements.supportsShortBrake}
                onValueChange={(v) => updateMeasurement('supportsShortBrake', v)}
                trackColor={{ false: '#27272A', true: '#FF4D00' }}
                thumbColor="#FAFAFA"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>SENSORES & BATERIA</Text>
          <View style={[styles.readoutTable, { borderTopColor: divider }]}>
            <SpecRow
              label="Vbat (multímetro)"
              value={measurements.vbatMultimeterV}
              unit="V"
              placeholder="8.20"
              onChangeText={(v) => updateMeasurement('vbatMultimeterV', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Alcance IR (alvo claro)"
              value={measurements.irRangeWhiteCm}
              unit="cm"
              placeholder="45"
              onChangeText={(v) => updateMeasurement('irRangeWhiteCm', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Alcance IR (stealth preto)"
              value={measurements.irRangeStealthCm}
              unit="cm"
              placeholder="22"
              onChangeText={(v) => updateMeasurement('irRangeStealthCm', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="ADC Preto (LD)"
              value={measurements.adcBlackLd}
              placeholder="2050"
              onChangeText={(v) => updateMeasurement('adcBlackLd', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="ADC Branco (LD)"
              value={measurements.adcWhiteLd}
              placeholder="130"
              onChangeText={(v) => updateMeasurement('adcWhiteLd', v)}
              dividerColor={divider}
            />
          </View>

          <Text style={styles.sectionTitle}>DINÂMICA</Text>
          <View style={[styles.readoutTable, { borderTopColor: divider }]}>
            <SpecRow
              label="Tempo reta 50 cm"
              value={measurements.sprint50cmSec}
              unit="s"
              placeholder="0.55"
              onChangeText={(v) => updateMeasurement('sprint50cmSec', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Distância parada borda"
              value={measurements.edgeStopDistCm}
              unit="cm"
              placeholder="3.5"
              onChangeText={(v) => updateMeasurement('edgeStopDistCm', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Atrito estático"
              value={measurements.muStaticForceN}
              unit="N"
              placeholder="8.0"
              onChangeText={(v) => updateMeasurement('muStaticForceN', v)}
              dividerColor={divider}
            />
            <SpecRow
              label="Força stall (PWM 255)"
              value={measurements.stallForceN}
              unit="N"
              placeholder="9.5"
              onChangeText={(v) => updateMeasurement('stallForceN', v)}
              dividerColor={divider}
            />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

export default function BenchScreen() {
  return <BenchView initialTab="controle" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  segWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segTrack: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  segBtnActive: {
    backgroundColor: '#27272A',
  },
  segBtnText: {
    color: '#9A9AA6',
    fontSize: 12,
    fontWeight: '600',
  },
  segBtnTextActive: {
    color: '#FAFAFA',
    fontWeight: '700',
  },
  splitWrap: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  consolePane: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 190,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  microLabel: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logList: {
    flex: 1,
    backgroundColor: '#050507',
  },
  logListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
  },
  quickChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    backgroundColor: '#0E0E11',
  },
  quickChip: {
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickChipText: {
    color: '#D4D4D8',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  cmdBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  cmdInput: {
    flex: 1,
    height: 34,
    color: '#FAFAFA',
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  cmdSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FF4D00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadPane: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  safetyNote: {
    color: '#9A9AA6',
    fontSize: 11,
    fontWeight: '500',
  },
  dpadGrid: {
    gap: 9,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dpadKey: {
    width: 72,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadStop: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#18181B',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  sectionTitle: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 6,
  },
  sectionTitleInline: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  calAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  calTitle: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
  },
  calSub: {
    color: '#B4B4BE',
    fontSize: 11,
    marginTop: 2,
  },
  feedbackRow: {
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,77,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  feedbackText: {
    color: '#FAFAFA',
    fontSize: 12,
  },
  readoutTable: {
    borderTopWidth: 1,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  readoutRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  readoutVal: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  readoutRef: {
    color: '#9A9AA6',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  fichaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  exportText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '600',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  specLabel: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '500',
  },
  specInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specInput: {
    color: '#FAFAFA',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    minWidth: 92,
    height: 30,
    paddingVertical: 0,
    paddingHorizontal: 8,
    textAlignVertical: 'center',
    backgroundColor: '#161619',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  specUnit: {
    color: '#9A9AA6',
    fontFamily: 'monospace',
    fontSize: 11,
    width: 24,
  },
});
