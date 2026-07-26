import type { StrategyMode } from '../types/sumo';

export const STRATEGY_REGISTRY: Record<number, StrategyMode> = {
  1: {
    id: 1,
    name: 'Radar',
    code: 'EST,1*',
    description: 'Varredura rotacional com travamento e ataque automático ao detectar oponente.',
    details: 'Gira no eixo (180 PWM) até detectar oponente na frente/lados e acelera a 245 PWM.',
    dangerLevel: 'balanced',
    iconName: 'Radar'
  },
  2: {
    id: 2,
    name: 'Caçador',
    code: 'EST,2*',
    description: 'Avanço contínuo escaneando laterais e ajustando vetor de ataque.',
    details: 'Move para frente a 170 PWM enquanto varre com sensores de distância.',
    dangerLevel: 'safe',
    iconName: 'Crosshair'
  },
  3: {
    id: 3,
    name: 'Firula',
    code: 'EST,3*',
    description: 'Rotina visual de provocação / aquecimento com LEDs de sinalização.',
    details: 'Aciona LEDs em pulsos de 300ms sem acionamento dos motores.',
    dangerLevel: 'safe',
    iconName: 'Sparkles'
  },
  4: {
    id: 4,
    name: 'Suicida',
    code: 'EST,4*',
    description: 'Modo ultra-agressivo de alta frequência e engajamento total.',
    details: 'Pulsos rápidos de LED (100ms) e aceleração de força total imediata.',
    dangerLevel: 'extreme',
    iconName: 'Skull'
  },
  5: {
    id: 5,
    name: 'Só Vai',
    code: 'EST,5*',
    description: 'Ataque frontal em linha reta em velocidade máxima com recuo de arena.',
    details: 'Avança a 200 PWM direto; se detectar linha branca, executa ré a VeloCreta.',
    dangerLevel: 'aggressive',
    iconName: 'Flame'
  },
  6: {
    id: 6,
    name: 'Contorno',
    code: 'EST,6*',
    description: 'Manobra de flanqueamento e esquiva lateral para curva no oponente.',
    details: 'Posicionamento tático lateral com sinalização alternada.',
    dangerLevel: 'balanced',
    iconName: 'MoveRight'
  },
  7: {
    id: 7,
    name: 'Segue Linha',
    code: 'EST,7*',
    description: 'Rotina de calibração e teste de alinhamento com a borda do dojo.',
    details: 'Utiliza os sensores de linha LD (35) e LE (39) para seguir pista.',
    dangerLevel: 'safe',
    iconName: 'Compass'
  }
};

export const STRATEGY_LIST: StrategyMode[] = Object.values(STRATEGY_REGISTRY);
