export interface TelemetryData {
  velocreta: number;
  velocgiro: number;
  HBEvasao: boolean;
  limiarParado: number;
  limiarEmpurrado: number;
  Vbat: number;
  sen_dir: number; // 0 or 1
  sen_centro_dir: number; // 0 or 1
  sen_centro_esq: number; // 0 or 1
  sen_esq: number; // 0 or 1
  sensorLD: number; // 0..4095
  sensorLE: number; // 0..4095
  timestamp: number;
}

export interface RobotConfig {
  velocreta: number;
  velocgiro: number;
  HBEvasao: boolean;
  limiarParado: number;
  limiarEmpurrado: number;
}

export interface StrategyMode {
  id: number;
  name: string;
  code: string;
  description: string;
  details: string;
  dangerLevel: 'safe' | 'balanced' | 'aggressive' | 'extreme';
  iconName: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CommandLog {
  id: string;
  type: 'sent' | 'received';
  raw: string;
  time: string;
}
