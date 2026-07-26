import React from 'react';
import { Bluetooth, BluetoothOff, Battery, BatteryCharging, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../types/sumo';
import { btService } from '../services/BluetoothService';

interface HeaderProps {
  status: ConnectionStatus;
  vbat: number;
  isSimulated: boolean;
  onEmergencyStop: () => void;
}

export const Header: React.FC<HeaderProps> = ({ status, vbat, isSimulated }) => {
  const getBatteryPercent = (volts: number) => {
    if (volts <= 0) return 0;
    const pct = Math.round(((volts - 6.6) / (8.4 - 6.6)) * 100);
    return Math.min(100, Math.max(0, pct));
  };

  const battPct = getBatteryPercent(vbat);
  const battColor = battPct >= 60 ? 'text-emerald-400' : battPct >= 25 ? 'text-amber-400' : 'text-rose-400';

  const handleConnectToggle = () => {
    if (status === 'connected') {
      btService.disconnect();
    } else {
      btService.connect(false);
    }
  };

  const handleSimulateToggle = () => {
    if (status === 'connected') btService.disconnect();
    btService.connect(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F17]/95 backdrop-blur-lg border-b border-white/5 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        
        {/* Left: Robot name + connection */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">
              Sumô App
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="text-[11px] text-slate-400">
                {status === 'connected'
                  ? isSimulated ? 'Simulação' : 'Conectado'
                  : status === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Battery + BT button */}
        <div className="flex items-center gap-3">
          {/* Battery - clean minimal */}
          <div className={`flex items-center gap-1.5 text-xs ${battColor}`}>
            {battPct >= 80 ? (
              <BatteryCharging className="w-4 h-4" />
            ) : (
              <Battery className="w-4 h-4" />
            )}
            <span className="font-mono text-[13px] font-medium">{vbat.toFixed(1)}V</span>
          </div>

          {/* Connection toggle */}
          {status === 'connected' ? (
            <button
              onClick={handleConnectToggle}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 transition"
              title="Desconectar"
            >
              <BluetoothOff className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleConnectToggle}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 active:scale-95 transition"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                Conectar
              </button>
              <button
                onClick={handleSimulateToggle}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 active:scale-95 transition"
                title="Modo Simulação"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
