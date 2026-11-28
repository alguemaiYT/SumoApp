import { Check, HelpCircle, X } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';

import { cmdIrStartDelay, STRATEGIES, type StrategyId } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

const SHORT_SUMMARY: Record<StrategyId, string> = {
  1: 'Varredura ativa + 16 estados',
  2: 'Avanço S-curve pelo centro',
  3: 'Finta curta + snap esquerda',
  4: 'Largada plena 255 PWM',
  5: 'Investida frontal direta',
  6: 'Abertura pelo flanco esquerdo',
  7: 'Teste de borda na pista',
  8: 'Espreita 800ms + pulso 110ms + bote 255',
  9: 'Abertura pelo flanco direito',
  10: 'Finta curta + snap direita',
};

function fmtStrategyCode(id: StrategyId): string {
  return String(id).padStart(2, '0');
}

export default function StrategiesScreen() {
  const estrategia = useSumoStore((s) => s.info.estrategia);
  const irStartDelayMs = useSumoStore((s) => s.info.irStartDelayMs);
  const phase = useSumoStore((s) => s.phase);
  const highContrast = useSumoStore((s) => s.highContrast);
  const setStrategy = useSumoStore((s) => s.setStrategy);
  const sendRaw = useSumoStore((s) => s.sendRaw);

  const [rulesModalOpen, setRulesModalOpen] = React.useState(false);
  const [eepromPulse, setEepromPulse] = React.useState(false);
  const prevStratRef = React.useRef(estrategia);
  const prevIrRef = React.useRef(irStartDelayMs);

  React.useEffect(() => {
    if (
      prevStratRef.current !== estrategia ||
      prevIrRef.current !== irStartDelayMs
    ) {
      prevStratRef.current = estrategia;
      prevIrRef.current = irStartDelayMs;
      setEepromPulse(true);
      const t = setTimeout(() => setEepromPulse(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [estrategia, irStartDelayMs]);

  const handleSelectStrategy = (id: StrategyId) => {
    if (id === estrategia) return;
    Vibration.vibrate(35);
    void setStrategy(id);
    if (phase === 'connected') {
      setEepromPulse(true);
      setTimeout(() => setEepromPulse(false), 1600);
    }
  };

  const confirmIrRule = (ms: number) => {
    if (ms === irStartDelayMs) return;
    const label = ms === 0 ? '0s · Módulo Juiz (imediato)' : '+5s · Contagem Interna';
    Alert.alert(
      'Alterar regra de partida IR',
      `Gravar "${label}" na EEPROM do robô?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            Vibration.vibrate(35);
            void sendRaw(cmdIrStartDelay(ms)).then(() => sendRaw('INFO*'));
          },
        },
      ],
    );
  };

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const border = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  const PAIRED_IDS: StrategyId[] = [1, 2, 3, 10, 4, 5, 6, 9];
  const mainGrid = PAIRED_IDS.map((id) => STRATEGIES.find((s) => s.id === id)).filter(
    (s): s is (typeof STRATEGIES)[number] => Boolean(s),
  );
  const waitStrategy = STRATEGIES.find((s) => s.id === 8);
  const lineStrategy = STRATEGIES.find((s) => s.id === 7);
  const activeStrat = STRATEGIES.find((s) => s.id === estrategia) ?? STRATEGIES[0];

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.container}>
        {/* Slim Header + EEPROM Confirmation Badge + ? Rule Modal */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Estratégias</Text>
            {eepromPulse ? (
              <View style={styles.eepromBadge}>
                <Check color="#22C55E" size={11} />
                <Text style={styles.eepromBadgeText}>EEPROM OK</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={() => setRulesModalOpen(true)}
            style={[styles.helpBtn, { borderColor: border, backgroundColor: surface }]}
          >
            <HelpCircle color="#B4B4BE" size={14} />
            <Text style={styles.helpText}>Regra IR</Text>
          </Pressable>
        </View>

        {/* Single-line IR Start Delay Segmented Control (confirmation-guarded) */}
        <View style={[styles.irBar, { backgroundColor: surface, borderColor: border }]}>
          <Text style={styles.irBarLabel}>INÍCIO IR</Text>
          <View style={styles.segmented}>
            {[
              { ms: 0, label: '0s · Juiz' },
              { ms: 5000, label: '+5s · Interno' },
            ].map((opt) => {
              const active = irStartDelayMs === opt.ms;
              return (
                <Pressable
                  key={opt.ms}
                  onPress={() => confirmIrRule(opt.ms)}
                  style={[styles.segItem, active && styles.segItemActive]}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dense 2x3 Combat Strategy Grid (01..06, ZERO redundant info icons) */}
        <View style={styles.grid}>
          {mainGrid.map((st) => {
            const selected = estrategia === st.id;
            return (
              <Pressable
                key={st.id}
                onPress={() => handleSelectStrategy(st.id)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: selected ? 'rgba(255, 77, 0, 0.11)' : surface,
                    borderColor: selected ? '#FF4D00' : border,
                  },
                ]}
              >
                <View style={styles.tileTop}>
                  <Text style={[styles.tileIndex, selected && { color: '#FF4D00' }]}>
                    {fmtStrategyCode(st.id)}
                  </Text>
                  {selected ? (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ATIVO</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.tileName}>{st.name}</Text>
                <Text style={[styles.tileTag, selected && { color: '#FF4D00' }]}>
                  {st.shortTag}
                </Text>
                <Text style={styles.tileSummary} numberOfLines={2}>
                  {SHORT_SUMMARY[st.id]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Full-width Stealth Wait & Counter Strategy 08 */}
        {waitStrategy ? (
          <Pressable
            onPress={() => handleSelectStrategy(waitStrategy.id)}
            style={[
              styles.rowTile,
              {
                backgroundColor:
                  estrategia === waitStrategy.id ? 'rgba(255, 77, 0, 0.11)' : surface,
                borderColor: estrategia === waitStrategy.id ? '#FF4D00' : border,
              },
            ]}
          >
            <View style={styles.rowTileLeft}>
              <Text
                style={[
                  styles.tileIndex,
                  estrategia === waitStrategy.id && { color: '#FF4D00' },
                ]}
              >
                08
              </Text>
              <View>
                <Text style={styles.tileName}>{waitStrategy.name}</Text>
                <Text style={styles.tileSummary}>{SHORT_SUMMARY[8]}</Text>
              </View>
            </View>
            {estrategia === waitStrategy.id ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ATIVO</Text>
              </View>
            ) : (
              <Text style={styles.tileTag}>{waitStrategy.shortTag}</Text>
            )}
          </Pressable>
        ) : null}

        {/* Visually Separated Test / Calibration Strategy 07 */}
        <Text style={styles.sectionMicro}>TESTE / CALIBRAÇÃO</Text>
        {lineStrategy ? (
          <Pressable
            onPress={() => handleSelectStrategy(lineStrategy.id)}
            style={[
              styles.rowTile,
              {
                backgroundColor:
                  estrategia === lineStrategy.id ? 'rgba(255, 77, 0, 0.11)' : surface,
                borderColor: estrategia === lineStrategy.id ? '#FF4D00' : border,
              },
            ]}
          >
            <View style={styles.rowTileLeft}>
              <Text
                style={[
                  styles.tileIndex,
                  estrategia === lineStrategy.id && { color: '#FF4D00' },
                ]}
              >
                07
              </Text>
              <View>
                <Text style={styles.tileName}>{lineStrategy.name}</Text>
                <Text style={styles.tileSummary}>{SHORT_SUMMARY[7]}</Text>
              </View>
            </View>
            {estrategia === lineStrategy.id ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ATIVO</Text>
              </View>
            ) : (
              <Text style={styles.tileTag}>{lineStrategy.shortTag}</Text>
            )}
          </Pressable>
        ) : null}

        {/* Anchored Tactical Detail Footer with Left Accent Bar */}
        <View style={[styles.tacticalFooter, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.tacticalAccent} />
          <View style={styles.tacticalBody}>
            <Text style={styles.hintLabel}>
              {fmtStrategyCode(activeStrat.id)} {activeStrat.name.toUpperCase()} · IDEAL CONTRA
            </Text>
            <Text style={styles.hintPrimary}>{activeStrat.bestAgainst}</Text>
            <Text style={styles.hintDesc} numberOfLines={2}>
              {activeStrat.description}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* IR Rules Info Modal */}
      <Modal
        visible={rulesModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRulesModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRulesModalOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Partida Oficial por IR (Sony SIRC)</Text>
              <Pressable onPress={() => setRulesModalOpen(false)}>
                <X color="#A1A1AA" size={18} />
              </Pressable>
            </View>
            <Text style={styles.modalBody}>
              Pelas regras oficiais de Sumô Autônomo, o BLE é usado apenas na configuração pré-luta e desliga automaticamente ao iniciar o combate na branch exper.
            </Text>
            <View style={styles.codeTable}>
              <View style={styles.codeRow}>
                <Text style={styles.codeKey}>0x00</Text>
                <Text style={styles.codeDesc}>Ready — arma o robô no dohyō</Text>
              </View>
              <View style={styles.codeRow}>
                <Text style={styles.codeKey}>0x01</Text>
                <Text style={styles.codeDesc}>Start — inicia combate (0s ou +5s)</Text>
              </View>
              <View style={styles.codeRow}>
                <Text style={styles.codeKey}>0x02</Text>
                <Text style={styles.codeDesc}>Stop — para motores e religa BLE</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  eepromBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.14)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  eepromBadgeText: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  helpText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '600',
  },
  irBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  irBarLabel: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  segmented: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
  },
  segItemActive: {
    backgroundColor: '#FF4D00',
  },
  segText: {
    color: '#B4B4BE',
    fontSize: 11,
    fontWeight: '700',
  },
  segTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '48.6%',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 3,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  tileIndex: {
    color: '#9A9AA6',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  activePill: {
    backgroundColor: 'rgba(255,77,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    color: '#FF4D00',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tileName: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  tileTag: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tileSummary: {
    color: '#B4B4BE',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  sectionMicro: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: -4,
  },
  rowTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tacticalFooter: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 2,
  },
  tacticalAccent: {
    width: 3,
    backgroundColor: '#FF4D00',
  },
  tacticalBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  hintLabel: {
    color: '#9A9AA6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  hintPrimary: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  hintDesc: {
    color: '#B4B4BE',
    fontSize: 11,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#121215',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    color: '#D4D4D8',
    fontSize: 13,
    lineHeight: 19,
  },
  codeTable: {
    gap: 6,
    paddingTop: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeKey: {
    color: '#FF4D00',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    width: 42,
  },
  codeDesc: {
    color: '#E4E4E7',
    fontSize: 12,
    flex: 1,
  },
});
