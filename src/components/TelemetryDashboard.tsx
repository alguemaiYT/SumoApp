import React from 'react';
import type { TelemetryData } from '../types/sumo';
import { Zap, Activity } from 'lucide-react';

interface TelemetryDashboardProps {
  telemetry: TelemetryData;
  onEmergencyStop: () => void;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ telemetry, onEmergencyStop }) => {
  const opponentDetected =
    telemetry.sen_esq === 1 ||
    telemetry.sen_centro_esq === 1 ||
    telemetry.sen_centro_dir === 1 ||
    telemetry.sen_dir === 1;

  const isLeftLineActive = telemetry.sensorLE <= 400;
  const isRightLineActive = telemetry.sensorLD <= 400;

  // Artificial Horizon / IMU Tilt calculations for visualization
  // Simulated pitch and roll offsets derived from telemetry metrics
  const pitchOffset = Math.sin(Date.now() / 800) * (telemetry.HBEvasao ? 12 : 3);
  const rollOffset = Math.cos(Date.now() / 1000) * (telemetry.HBEvasao ? 8 : 2);

  return (
    <div className="space-y-5 pb-20 relative">

      {/* Radar Section */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-100">Radar de Oponente</h2>
          <span
            className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
              opponentDetected
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-white/5 text-slate-500'
            }`}
          >
            {opponentDetected ? 'Detectado' : 'Varrendo'}
          </span>
        </div>

        <div className="relative aspect-square max-w-[220px] mx-auto flex items-center justify-center">
          {/* Subtle radar rings */}
          <div className="absolute inset-4 rounded-full border border-white/[0.04] animate-radar pointer-events-none" />
          <div className="absolute inset-10 rounded-full border border-white/[0.06] pointer-events-none" />
          <div className="absolute inset-16 rounded-full border border-white/[0.04] pointer-events-none" />

          <svg viewBox="0 0 300 300" className="w-full h-full relative z-10 overflow-visible">
            <defs>
              <filter id="glow-sensor" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <radialGradient id="beam-active" cx="50%" cy="100%" r="90%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Front-Left IR */}
            <path
              d="M 125 70 L 95 20 A 45 45 0 0 1 140 15 Z"
              fill={telemetry.sen_centro_esq === 1 ? 'url(#beam-active)' : 'transparent'}
              stroke={telemetry.sen_centro_esq === 1 ? '#f59e0b' : '#1e293b'}
              strokeWidth="1"
              opacity={telemetry.sen_centro_esq === 1 ? 0.9 : 0.2}
              filter={telemetry.sen_centro_esq === 1 ? 'url(#glow-sensor)' : undefined}
              className="transition-all duration-300"
            />
            <circle cx="125" cy="70" r={telemetry.sen_centro_esq === 1 ? '4' : '2.5'}
              fill={telemetry.sen_centro_esq === 1 ? '#fbbf24' : '#334155'} className="transition-all duration-200" />

            {/* Front-Right IR */}
            <path
              d="M 175 70 L 160 15 A 45 45 0 0 1 205 20 Z"
              fill={telemetry.sen_centro_dir === 1 ? 'url(#beam-active)' : 'transparent'}
              stroke={telemetry.sen_centro_dir === 1 ? '#f59e0b' : '#1e293b'}
              strokeWidth="1"
              opacity={telemetry.sen_centro_dir === 1 ? 0.9 : 0.2}
              filter={telemetry.sen_centro_dir === 1 ? 'url(#glow-sensor)' : undefined}
              className="transition-all duration-300"
            />
            <circle cx="175" cy="70" r={telemetry.sen_centro_dir === 1 ? '4' : '2.5'}
              fill={telemetry.sen_centro_dir === 1 ? '#fbbf24' : '#334155'} className="transition-all duration-200" />

            {/* Lateral-Left IR */}
            <path
              d="M 95 145 L 30 115 A 50 50 0 0 0 30 175 Z"
              fill={telemetry.sen_esq === 1 ? 'url(#beam-active)' : 'transparent'}
              stroke={telemetry.sen_esq === 1 ? '#f59e0b' : '#1e293b'}
              strokeWidth="1"
              opacity={telemetry.sen_esq === 1 ? 0.9 : 0.2}
              filter={telemetry.sen_esq === 1 ? 'url(#glow-sensor)' : undefined}
              className="transition-all duration-300"
            />
            <circle cx="95" cy="145" r={telemetry.sen_esq === 1 ? '4' : '2.5'}
              fill={telemetry.sen_esq === 1 ? '#fbbf24' : '#334155'} className="transition-all duration-200" />

            {/* Lateral-Right IR */}
            <path
              d="M 205 145 L 270 115 A 50 50 0 0 1 270 175 Z"
              fill={telemetry.sen_dir === 1 ? 'url(#beam-active)' : 'transparent'}
              stroke={telemetry.sen_dir === 1 ? '#f59e0b' : '#1e293b'}
              strokeWidth="1"
              opacity={telemetry.sen_dir === 1 ? 0.9 : 0.2}
              filter={telemetry.sen_dir === 1 ? 'url(#glow-sensor)' : undefined}
              className="transition-all duration-300"
            />
            <circle cx="205" cy="145" r={telemetry.sen_dir === 1 ? '4' : '2.5'}
              fill={telemetry.sen_dir === 1 ? '#fbbf24' : '#334155'} className="transition-all duration-200" />

            {/* Chassis silhouette */}
            <rect x="78" y="170" width="13" height="42" rx="4" fill="#0B0F17" stroke="#1e293b" strokeWidth="1" />
            <rect x="209" y="170" width="13" height="42" rx="4" fill="#0B0F17" stroke="#1e293b" strokeWidth="1" />
            <rect x="95" y="90" width="110" height="130" rx="14" fill="#0B0F17" stroke="#1e293b" strokeWidth="1.5" />
            <rect x="105" y="102" width="90" height="106" rx="10" fill="#131927" stroke="#1e293b" strokeWidth="0.5" />
            <polygon points="85,90 215,90 202,70 98,70" fill="#131927" stroke="#1e293b" strokeWidth="1" />

            {/* Line sensor pads on blade tips */}
            <circle
              cx="102"
              cy="76"
              r="5"
              className={
                isLeftLineActive
                  ? "fill-red-500 stroke-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse transition-all duration-200"
                  : "fill-slate-800 stroke-slate-700/60 opacity-40 transition-all duration-200"
              }
            />
            <circle
              cx="198"
              cy="76"
              r="5"
              className={
                isRightLineActive
                  ? "fill-red-500 stroke-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse transition-all duration-200"
                  : "fill-slate-800 stroke-slate-700/60 opacity-40 transition-all duration-200"
              }
            />
          </svg>
        </div>
      </div>

      {/* Line Sensors Card */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <h3 className="text-xs font-medium text-slate-400 mb-3">Sensores de Linha</h3>
        <div className="space-y-3">
          {/* Left */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-300">Esquerdo</span>
              <span className={`text-xs font-mono ${isLeftLineActive ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                {telemetry.sensorLE}
              </span>
            </div>
            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLeftLineActive ? 'bg-amber-400' : 'bg-indigo-500/40'
                }`}
                style={{ width: `${Math.min(100, (telemetry.sensorLE / 4095) * 100)}%` }}
              />
            </div>
          </div>

          {/* Right */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-300">Direito</span>
              <span className={`text-xs font-mono ${isRightLineActive ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
                {telemetry.sensorLD}
              </span>
            </div>
            <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isRightLineActive ? 'bg-amber-400' : 'bg-indigo-500/40'
                }`}
                style={{ width: `${Math.min(100, (telemetry.sensorLD / 4095) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Artificial Horizon & IMU Telemetry (Fills bottom area) */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-medium text-slate-200">Horizonte Artificial & Inercial (IMU)</h3>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              telemetry.HBEvasao
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-slate-500'
            }`}
          >
            {telemetry.HBEvasao ? 'Evasão Ativa' : 'Evasão Inativa'}
          </span>
        </div>

        {/* Dynamic Artificial Horizon / Tilt Crosshair Widget */}
        <div className="flex items-center justify-around gap-4 py-2">
          {/* 2D Gyro Tilt Crosshair SVG */}
          <div className="relative w-28 h-28 bg-[#080c14] rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden">
            {/* Pitch Horizon Line */}
            <div
              className="absolute w-full h-[1.5px] bg-indigo-500/60 transition-transform duration-200"
              style={{ transform: `translateY(${pitchOffset}px) rotate(${rollOffset}deg)` }}
            />
            {/* Crosshair grid */}
            <div className="absolute inset-0 border border-dashed border-white/10 rounded-2xl" />
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
              {/* Dynamic Gyro Bubble */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.7)] transition-transform duration-150"
                style={{ transform: `translate(${rollOffset * 1.8}px, ${pitchOffset * 1.5}px)` }}
              />
            </div>
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">2D GYRO</span>
          </div>

          {/* G-Force & Threshold Indicators */}
          <div className="flex-1 space-y-2">
            <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Sensibilidade Parada</span>
                <span className="font-mono text-indigo-300 font-medium">{telemetry.limiarParado} m/s²</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Sensibilidade Empurrão</span>
                <span className="font-mono text-amber-400 font-medium">{telemetry.limiarEmpurrado} m/s²</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500/60 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Emergency Stop Button */}
      <button
        onClick={onEmergencyStop}
        className="fixed bottom-20 right-4 max-w-md z-40 w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-90 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center transition-all"
        title="Parada de Emergência"
      >
        <Zap className="w-6 h-6 fill-white" />
      </button>
    </div>
  );
};
