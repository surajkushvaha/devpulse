'use client';

import { useEffect, useState } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';

interface HeaderProps {
  lastSync: string | null;
  autoOn: boolean;
  onRefreshAll: () => void;
  onToggleAuto: (on: boolean) => void;
}

// Isolated so the once-a-second tick only re-renders the clock, not the header.
function Clock() {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span id="clock">{time}</span>;
}

export default function Header({ lastSync, autoOn, onRefreshAll, onToggleAuto }: HeaderProps) {
  return (
    <header>
      <div className="island">
        <div className="brand">
          <span className="dot" />
          <span className="wordmark">DevPulse</span>
          <span className="eyebrow">personal feed</span>
        </div>
        <div className="island-right">
          <div className="status">
            <Clock />
            <span className="sep-dot" />
            <span>{lastSync ? 'synced ' + lastSync : 'not synced yet'}</span>
          </div>
          <button className="refresh-all" onClick={onRefreshAll}>
            <span>refresh all</span>
            <span className="btn-icon" aria-hidden="true">
              <ArrowClockwise size={14} weight="bold" />
            </span>
          </button>
          <label className="auto">
            <input type="checkbox" checked={autoOn} onChange={(e) => onToggleAuto(e.target.checked)} />
            auto 15m
          </label>
        </div>
      </div>
    </header>
  );
}
