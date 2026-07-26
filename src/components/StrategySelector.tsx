import React, { useState } from 'react';
import type { StrategyMode } from '../types/sumo';
import { STRATEGY_LIST } from '../config/strategies';
import { btService } from '../services/BluetoothService';
import { Radar, Crosshair, Sparkles, Skull, Flame, MoveRight, Compass, Check } from 'lucide-react';

export const StrategySelector: React.FC = () => {
  const [activeStrategy, setActiveStrategy] = useState<number | null>(1);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  const getIcon = (iconName: string) => {
    const cls = "w-5 h-5";
    switch (iconName) {
      case 'Radar': return <Radar className={cls} />;
      case 'Crosshair': return <Crosshair className={cls} />;
      case 'Sparkles': return <Sparkles className={cls} />;
      case 'Skull': return <Skull className={cls} />;
      case 'Flame': return <Flame className={cls} />;
      case 'MoveRight': return <MoveRight className={cls} />;
      case 'Compass': return <Compass className={cls} />;
      default: return <Radar className={cls} />;
    }
  };

  const getDangerStyle = (danger: StrategyMode['dangerLevel']) => {
    switch (danger) {
      case 'safe': return 'text-slate-400';
      case 'balanced': return 'text-slate-400';
      case 'aggressive': return 'text-amber-400/80';
      case 'extreme': return 'text-rose-400/80';
    }
  };

  const getDangerLabel = (danger: StrategyMode['dangerLevel']) => {
    switch (danger) {
      case 'safe': return 'Seguro';
      case 'balanced': return 'Balanceado';
      case 'aggressive': return 'Agressivo';
      case 'extreme': return 'Extremo';
    }
  };

  const handleSelectStrategy = (id: number) => {
    if (isTransmitting) return;
    setIsTransmitting(true);
    btService.setStrategy(id);
    setActiveStrategy(id);
    setTimeout(() => setIsTransmitting(false), 350);
  };

  return (
    <div className="space-y-4 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-100">Estratégias de Combate</h2>
        {activeStrategy && (
          <span className="text-[10px] font-medium text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            <Check className="w-3 h-3 text-indigo-400" />
            Estratégia #{activeStrategy} Ativa
          </span>
        )}
      </div>

      {/* Strategy Cards */}
      <div className="space-y-2.5">
        {STRATEGY_LIST.map((strat) => {
          const isActive = activeStrategy === strat.id;

          return (
            <button
              key={strat.id}
              onClick={() => handleSelectStrategy(strat.id)}
              disabled={isTransmitting}
              className={`w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-indigo-500/10 border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-white/[0.04] text-slate-400'
                }`}>
                  {getIcon(strat.iconName)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-medium ${isActive ? 'text-indigo-200 font-semibold' : 'text-slate-100'}`}>
                      {strat.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${getDangerStyle(strat.dangerLevel)}`}>
                        {getDangerLabel(strat.dangerLevel)}
                      </span>
                      {isActive && (
                        <span className="text-[9px] px-2 py-0.5 bg-indigo-500 text-white rounded-full font-semibold tracking-wide shadow-sm shadow-indigo-500/40">
                          SELECIONADA
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{strat.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
