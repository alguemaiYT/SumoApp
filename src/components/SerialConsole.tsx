import React, { useState, useEffect, useRef } from 'react';
import type { CommandLog } from '../types/sumo';
import { btService } from '../services/BluetoothService';
import { Send, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export const SerialConsole: React.FC = () => {
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [customCmd, setCustomCmd] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = btService.onLog((log) => {
      setLogs((prev) => [...prev.slice(-99), log]);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCmd.trim()) return;
    const formatted = customCmd.endsWith('*') ? customCmd.trim() : `${customCmd.trim()}*`;
    btService.sendCommand(formatted);
    setCustomCmd('');
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-140px)] space-y-3 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium text-slate-100">Console Serial</h2>
        <button
          onClick={() => setLogs([])}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
          title="Limpar logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal - 100% vertical fill */}
      <div
        ref={logContainerRef}
        data-prevent-swipe="true"
        className="flex-1 bg-[#080c14] border border-white/5 rounded-2xl p-3.5 font-mono text-xs overflow-y-auto space-y-1.5"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic">
            Aguardando tráfego serial...
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 text-[10px] select-none shrink-0">{log.time}</span>
              {log.type === 'sent' ? (
                <ArrowUpRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
              ) : (
                <ArrowDownLeft className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <span className={log.type === 'sent' ? 'text-indigo-300 font-medium' : 'text-emerald-300'}>
                {log.raw}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input - pinned at bottom */}
      <form onSubmit={handleSendCustom} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={customCmd}
          onChange={(e) => setCustomCmd(e.target.value)}
          placeholder="Comando manual..."
          className="flex-1 px-3.5 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 active:scale-95 transition"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </form>
    </div>
  );
};
