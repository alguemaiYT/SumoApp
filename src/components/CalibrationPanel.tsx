import React, { useState, useEffect } from 'react';
import type { TelemetryData } from '../types/sumo';
import { btService } from '../services/BluetoothService';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Send, Shield, Gauge } from 'lucide-react';

interface CalibrationPanelProps {
  telemetry: TelemetryData;
}

export const CalibrationPanel: React.FC<CalibrationPanelProps> = ({ telemetry }) => {
  const [velocreta, setVelocreta] = useState<number>(telemetry.velocreta || 220);
  const [velocgiro, setVelocgiro] = useState<number>(telemetry.velocgiro || 180);
  const [hbevasao, setHbevasao] = useState<boolean>(telemetry.HBEvasao);
  const [limiarParado, setLimiarParado] = useState<number>(telemetry.limiarParado || 0.1);
  const [limiarEmpurrado, setLimiarEmpurrado] = useState<number>(telemetry.limiarEmpurrado || -0.25);
  const [activeMotorState, setActiveMotorState] = useState<string>('parado');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setVelocreta(telemetry.velocreta);
    setVelocgiro(telemetry.velocgiro);
    setHbevasao(telemetry.HBEvasao);
    setLimiarParado(telemetry.limiarParado);
    setLimiarEmpurrado(telemetry.limiarEmpurrado);
  }, [telemetry.velocreta, telemetry.velocgiro, telemetry.HBEvasao, telemetry.limiarParado, telemetry.limiarEmpurrado]);

  const markChanged = () => setHasChanges(true);

  const handleToggleHbevasao = () => {
    const nextVal = !hbevasao;
    setHbevasao(nextVal);
    btService.setEvasion(nextVal);
  };

  const handleMotorAction = (action: 'frente' | 're' | 'esquerda' | 'direita' | 'parado') => {
    setActiveMotorState(action);
    if (action === 'parado') {
      btService.emergencyStop();
    } else if (action === 'frente' || action === 're') {
      btService.sendCommand(`VR,${velocreta}*`);
    } else {
      btService.sendCommand(`VG,${velocgiro}*`);
    }
  };

  const handleSaveAll = () => {
    btService.setStraightSpeed(velocreta);
    btService.setTurnSpeed(velocgiro);
    btService.setStalledThreshold(limiarParado);
    btService.setPushedThreshold(limiarEmpurrado);
    setHasChanges(false);
  };

  // Motor PWM percentage calculations
  const getMotorPwm = (side: 'left' | 'right') => {
    if (activeMotorState === 'parado') return 0;
    if (activeMotorState === 'frente' || activeMotorState === 're') return Math.round((velocreta / 255) * 100);
    if (activeMotorState === 'esquerda') return side === 'left' ? 30 : Math.round((velocgiro / 255) * 100);
    if (activeMotorState === 'direita') return side === 'right' ? 30 : Math.round((velocgiro / 255) * 100);
    return 0;
  };

  const dpadBtnBase = "w-13 h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90";
  const dpadActive = (state: string) =>
    activeMotorState === state
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]';

  return (
    <div className="space-y-4 pb-28">

      {/* Speed Controls Card */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-medium text-slate-100">Velocidades dos Motores</h2>
        </div>

        {/* Velocidade de Reta */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Velocidade de Reta</span>
            <input
              type="number"
              min="0"
              max="255"
              value={velocreta}
              onChange={(e) => { setVelocreta(Math.min(255, Math.max(0, Number(e.target.value) || 0))); markChanged(); }}
              className="w-16 px-2 py-1 bg-white/[0.04] border border-white/5 rounded-lg text-indigo-300 font-mono text-sm text-center focus:outline-none focus:border-indigo-500/40 transition"
            />
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={velocreta}
            data-prevent-swipe="true"
            onChange={(e) => { setVelocreta(Number(e.target.value)); markChanged(); }}
            className="w-full"
          />
        </div>

        {/* Velocidade de Giro */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Velocidade de Giro</span>
            <input
              type="number"
              min="0"
              max="255"
              value={velocgiro}
              data-prevent-swipe="true"
              onChange={(e) => { setVelocreta(Math.min(255, Math.max(0, Number(e.target.value) || 0))); markChanged(); }}
              className="w-16 px-2 py-1 bg-white/[0.04] border border-white/5 rounded-lg text-indigo-300 font-mono text-sm text-center focus:outline-none focus:border-indigo-500/40 transition"
            />
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={velocgiro}
            data-prevent-swipe="true"
            onChange={(e) => { setVelocgiro(Number(e.target.value)); markChanged(); }}
            className="w-full"
          />
        </div>
      </div>

      {/* Evasion & Thresholds Card */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-slate-100">Evasão & Limiares</h3>
          </div>
          <button
            onClick={handleToggleHbevasao}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hbevasao ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              hbevasao ? 'left-[22px]' : 'left-0.5'
            }`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block mb-1.5">Sensibilidade de Parada</span>
            <input
              type="number"
              step="0.05"
              value={limiarParado}
              onChange={(e) => { setLimiarParado(Number(e.target.value)); markChanged(); }}
              className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/5 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-indigo-500/40 transition"
            />
            <span className="text-[10px] text-slate-600 mt-1 block">m/s²</span>
          </div>
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-500 block mb-1.5">Sensibilidade de Empurrão</span>
            <input
              type="number"
              step="0.05"
              value={limiarEmpurrado}
              onChange={(e) => { setLimiarEmpurrado(Number(e.target.value)); markChanged(); }}
              className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/5 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:border-indigo-500/40 transition"
            />
            <span className="text-[10px] text-slate-600 mt-1 block">m/s²</span>
          </div>
        </div>
      </div>

      {/* Motor D-Pad & PWM Indicators Card */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-100">Teste de Motores</h3>
          <span className="text-[10px] text-slate-500 capitalize font-mono">
            {activeMotorState === 'parado' ? 'Parado' : activeMotorState}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Left Motor PWM Indicator */}
          <div className="flex flex-col items-center gap-1.5 w-16">
            <span className="text-[10px] text-slate-400 font-medium">Esq</span>
            <div className="w-3 h-24 bg-white/[0.04] rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-white/5">
              <div
                className="w-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{ height: `${getMotorPwm('left')}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-indigo-300 font-medium">{getMotorPwm('left')}%</span>
          </div>

          {/* Center D-Pad */}
          <div className="grid grid-cols-3 gap-1.5" data-prevent-swipe="true">
            <div />
            <button onClick={() => handleMotorAction('frente')}
              className={`${dpadBtnBase} ${dpadActive('frente')}`} title="Frente">
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />

            <button onClick={() => handleMotorAction('esquerda')}
              className={`${dpadBtnBase} ${dpadActive('esquerda')}`} title="Esquerda">
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button onClick={() => handleMotorAction('parado')}
              className={`${dpadBtnBase} ${
                activeMotorState === 'parado'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`} title="Parar">
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button onClick={() => handleMotorAction('direita')}
              className={`${dpadBtnBase} ${dpadActive('direita')}`} title="Direita">
              <ArrowRight className="w-5 h-5" />
            </button>

            <div />
            <button onClick={() => handleMotorAction('re')}
              className={`${dpadBtnBase} ${dpadActive('re')}`} title="Ré">
              <ArrowDown className="w-5 h-5" />
            </button>
            <div />
          </div>

          {/* Right Motor PWM Indicator */}
          <div className="flex flex-col items-center gap-1.5 w-16">
            <span className="text-[10px] text-slate-400 font-medium">Dir</span>
            <div className="w-3 h-24 bg-white/[0.04] rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-white/5">
              <div
                className="w-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{ height: `${getMotorPwm('right')}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-indigo-300 font-medium">{getMotorPwm('right')}%</span>
          </div>
        </div>
      </div>

      {/* Save FAB */}
      <button
        onClick={handleSaveAll}
        className={`fixed bottom-20 left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto z-40 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          hasChanges
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'bg-white/[0.06] text-slate-400 border border-white/5'
        }`}
      >
        <Send className="w-4 h-4" />
        Salvar Parâmetros no Robô
      </button>
    </div>
  );
};
