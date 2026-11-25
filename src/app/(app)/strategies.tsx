import { HelpCircle, Info, X } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';

import { cmdIrStartDelay, STRATEGIES, type StrategyDefinition, type StrategyId } from '@/lib/sumo/protocol';
import { useSumoStore } from '@/lib/sumo/store';

const SHORT_SUMMARY: Record<StrategyId, string> = {
  1: 'Varredura ativa + 16 estados',
  2: 'Avanço S-curve pelo centro',
  3: 'Finta curta + contra-flanco',
  4: 'Largada plena 255 PWM',
  5: 'Investida frontal direta',
  6: 'Abertura de flanco lateral',
  7: 'Teste de borda na pista',
};

export default function StrategiesScreen() {
  const info = useSumoStore((s) => s.info);
  const highContrast = useSumoStore((s) => s.highContrast);
  const setStrategy = useSumoStore((s) => s.setStrategy);
  const sendRaw = useSumoStore((s) => s.sendRaw);

  const [rulesModalOpen, setRulesModalOpen] = React.useState(false);
  const [detailStrat, setDetailStrat] = React.useState<StrategyDefinition | null>(null);

  const selectIrRule = async (ms: number) => {
    Vibration.vibrate(25);
    await sendRaw(cmdIrStartDelay(ms));
    await sendRaw('INFO*');
  };

  const bg = highContrast ? '#000000' : '#09090B';
  const surface = highContrast ? '#111114' : '#121215';
  const border = highContrast ? '#3F3F46' : 'rgba(255,255,255,0.09)';

  const mainGrid = STRATEGIES.slice(0, 6);
  const lineStrategy = STRATEGIES[6];
  const activeStrat = STRATEGIES.find((s) => s.id === info.estrategia) ?? STRATEGIES[0];

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.container}>
        {/* Slim Header + ? Rules Button */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Estratégias</Text>
          <Pressable
            onPress={() => setRulesModalOpen(true)}
            style={[styles.helpBtn, { borderColor: border, backgroundColor: surface }]}
          >
            <HelpCircle color="#A1A1AA" size={14} />
            <Text style={styles.helpText}>Regra IR</Text>
          </Pressable>
        </View>

        {/* Single-line IR Start Delay Segmented Control */}
        <View style={[styles.irBar, { backgroundColor: surface, borderColor: border }]}>
          <Text style={styles.irBarLabel}>INÍCIO IR</Text>
          <View style={styles.segmented}>
            {[
              { ms: 0, label: '0s · Juiz' },
              { ms: 5000, label: '+5s · Interno' },
            ].map((opt) => {
              const active = info.irStartDelayMs === opt.ms;
              return (
                <Pressable
                  key={opt.ms}
                  onPress={() => void selectIrRule(opt.ms)}
                  style={[
                    styles.segItem,
                    active && styles.segItemActive,
                  ]}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dense 2x3 Strategy Grid (Strategies 01..06) */}
        <View style={styles.grid}>
          {mainGrid.map((st) => {
            const selected = info.estrategia === st.id;
            return (
              <Pressable
                key={st.id}
                onPress={() => {
                  Vibration.vibrate(35);
                  void setStrategy(st.id);
                }}
                onLongPress={() => setDetailStrat(st)}
                style={[
                  styles.tile,
                  {
                    backgroundColor: selected ? 'rgba(255, 77, 0, 0.10)' : surface,
                    borderColor: selected ? '#FF4D00' : border,
                  },
                ]}
              >
                <View style={styles.tileTop}>
                  <Text style={[styles.tileIndex, selected && { color: '#FF4D00' }]}>
                    0{st.id}
                  </Text>
                  <Pressable
                    onPress={() => setDetailStrat(st)}
                    hitSlop={8}
                    style={styles.infoIconBtn}
                  >
                    <Info color={selected ? '#FF4D00' : '#52525B'} size={14} />
                  </Pressable>
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

        {/* Compact Full-Width Row for Strategy 07 (Line Test) */}
        {lineStrategy ? (
          <Pressable
            onPress={() => {
              Vibration.vibrate(35);
              void setStrategy(lineStrategy.id);
            }}
            onLongPress={() => setDetailStrat(lineStrategy)}
            style={[
              styles.rowTile,
              {
                backgroundColor:
                  info.estrategia === lineStrategy.id ? 'rgba(255, 77, 0, 0.10)' : surface,
                borderColor: info.estrategia === lineStrategy.id ? '#FF4D00' : border,
              },
            ]}
          >
            <View style={styles.rowTileLeft}>
              <Text
                style={[
                  styles.tileIndex,
                  info.estrategia === lineStrategy.id && { color: '#FF4D00' },
                ]}
              >
                07
              </Text>
              <View>
                <Text style={styles.tileName}>{lineStrategy.name}</Text>
                <Text style={styles.tileSummary}>{SHORT_SUMMARY[7]}</Text>
              </View>
            </View>
            <View style={styles.rowTileRight}>
              <Text style={styles.tileTag}>{lineStrategy.shortTag}</Text>
              <Pressable onPress={() => setDetailStrat(lineStrategy)} hitSlop={8}>
                <Info color="#52525B" size={14} />
              </Pressable>
            </View>
          </Pressable>
        ) : null}

        {/* Active Strategy Quick Tactical Note */}
        <View style={[styles.activeHint, { borderTopColor: border }]}>
          <Text style={styles.hintLabel}>IDEAL CONTRA ({activeStrat.name.toUpperCase()})</Text>
          <Text style={styles.hintText}>{activeStrat.bestAgainst}</Text>
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

      {/* Strategy Detail Modal */}
      <Modal
        visible={detailStrat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailStrat(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailStrat(null)} />
          {detailStrat ? (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  0{detailStrat.id} · {detailStrat.name}
                </Text>
                <Pressable onPress={() => setDetailStrat(null)}>
                  <X color="#A1A1AA" size={18} />
                </Pressable>
              </View>
              <Text style={styles.modalBody}>{detailStrat.description}</Text>
              <View style={styles.hairline} />
              <Text style={styles.hintLabel}>IDEAL CONTRA</Text>
              <Text style={styles.modalBody}>{detailStrat.bestAgainst}</Text>
            </View>
          ) : null}
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
    paddingBottom: 20,
    gap: 10,
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
    color: '#A1A1AA',
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
    color: '#71717A',
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
    color: '#A1A1AA',
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
    padding: 12,
    gap: 3,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tileIndex: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  infoIconBtn: {
    padding: 2,
  },
  tileName: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  tileTag: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tileSummary: {
    color: '#A1A1AA',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  rowTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rowTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowTileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeHint: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 2,
  },
  hintLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  hintText: {
    color: '#D4D4D8',
    fontSize: 12,
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
  hairline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
