import React, { useState, useEffect, useRef } from 'react';
import type { TelemetryData, ConnectionStatus } from './types/sumo';
import { btService } from './services/BluetoothService';
import { Header } from './components/Header';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { StrategySelector } from './components/StrategySelector';
import { CalibrationPanel } from './components/CalibrationPanel';
import { SerialConsole } from './components/SerialConsole';
import { Activity, Swords, Sliders, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { key: 'telemetry' as const, label: 'Telemetria', Icon: Activity },
  { key: 'strategies' as const, label: 'Estratégias', Icon: Swords },
  { key: 'calibration' as const, label: 'Calibração', Icon: Sliders },
  { key: 'console' as const, label: 'Console', Icon: Terminal },
] as const;

export type TabKey = typeof TABS[number]['key'];

export const App: React.FC = () => {
  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(0); // 1 = left (next), -1 = right (prev)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  // Touch gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; prevent: boolean } | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    velocreta: 220,
    velocgiro: 180,
    HBEvasao: true,
    limiarParado: 0.1,
    limiarEmpurrado: -0.25,
    Vbat: 8.24,
    sen_dir: 0,
    sen_centro_dir: 1,
    sen_centro_esq: 1,
    sen_esq: 0,
    sensorLD: 120,
    sensorLE: 145,
    timestamp: Date.now()
  });

  useEffect(() => {
    const unsubStatus = btService.onStatusChange((s) => {
      setStatus(s);
      setIsSimulated(btService.isSimulated());
    });
    const unsubTelemetry = btService.onTelemetry((t) => setTelemetry(t));
    btService.connect(true);
    return () => { unsubStatus(); unsubTelemetry(); };
  }, []);

  const handleEmergencyStop = () => btService.emergencyStop();

  const handleTabChange = (newIdx: number) => {
    if (newIdx === activeTabIdx) return;
    setSlideDirection(newIdx > activeTabIdx ? 1 : -1);
    setActiveTabIdx(newIdx);
  };

  // Helper to detect interactive horizontal elements that should prevent page swipe
  const isPreventSwipeTarget = (target: HTMLElement | null): boolean => {
    let el: HTMLElement | null = target;
    while (el && el !== document.body) {
      if (
        el.getAttribute('data-prevent-swipe') === 'true' ||
        el.classList.contains('no-swipe') ||
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.getAttribute('role') === 'slider'
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const prevent = isPreventSwipeTarget(target);

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      prevent
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const { x: startX, y: startY, prevent } = touchStartRef.current;
    touchStartRef.current = null;

    if (prevent || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Minimum displacement threshold: 70px, with horizontal dominance check (deltaX > 1.5 * deltaY)
    const minSwipeDistance = 70;
    if (Math.abs(deltaX) >= minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe Left: Next Tab
        if (activeTabIdx < TABS.length - 1) {
          handleTabChange(activeTabIdx + 1);
        }
      } else {
        // Swipe Right: Previous Tab
        if (activeTabIdx > 0) {
          handleTabChange(activeTabIdx - 1);
        }
      }
    }
  };

  // Motion variants for smooth horizontal page transition
  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? '100%' : direction < 0 ? '-100%' : '0%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeInOut' as const }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : direction < 0 ? '100%' : '0%',
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeInOut' as const }
    })
  };

  const currentTab = TABS[activeTabIdx];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col max-w-md mx-auto relative antialiased overflow-x-hidden select-none"
    >
      <Header
        status={status}
        vbat={telemetry.Vbat}
        isSimulated={isSimulated}
        onEmergencyStop={handleEmergencyStop}
      />

      <main className="flex-1 px-4 pt-3 pb-24 overflow-y-auto relative flex flex-col">
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentTab.key}
            custom={slideDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex-1 flex flex-col"
          >
            {currentTab.key === 'telemetry' && (
              <TelemetryDashboard telemetry={telemetry} onEmergencyStop={handleEmergencyStop} />
            )}
            {currentTab.key === 'strategies' && <StrategySelector />}
            {currentTab.key === 'calibration' && <CalibrationPanel telemetry={telemetry} />}
            {currentTab.key === 'console' && <SerialConsole />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav - unified indigo accent */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0B0F17]/95 backdrop-blur-xl border-t border-white/5 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around z-50">
        {TABS.map(({ key, label, Icon }, idx) => (
          <button
            key={key}
            onClick={() => handleTabChange(idx)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTabIdx === idx
                ? 'text-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className={`text-[10px] font-medium ${
              activeTabIdx === idx ? 'text-indigo-400' : ''
            }`}>{label}</span>
            {activeTabIdx === idx && (
              <motion.div
                layoutId="activeTabIndicator"
                className="w-4 h-0.5 rounded-full bg-indigo-500 mt-0.5"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
