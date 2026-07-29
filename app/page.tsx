'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Panel from '../components/Panel';
import { SOURCES } from '../lib/feeds';

export default function Home() {
  const reloadersRef = useRef<Record<string, () => void>>({});
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoOn, setAutoOn] = useState(false);

  const registerReload = useCallback((key: string, fn: (() => void) | null) => {
    if (fn) reloadersRef.current[key] = fn;
    else delete reloadersRef.current[key];
  }, []);

  const syncNow = useCallback(() => {
    setLastSync(new Date().toLocaleTimeString([], { hour12: false }));
  }, []);

  const refreshAll = useCallback(() => {
    Object.values(reloadersRef.current).forEach((fn) => fn());
    syncNow();
  }, [syncNow]);

  // First load. Panels register in their own (child) effects, which run before
  // this parent effect, so every reloader is in place by the time this fires.
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoOn) return;
    const id = setInterval(refreshAll, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoOn, refreshAll]);

  return (
    <>
      <Header lastSync={lastSync} autoOn={autoOn} onRefreshAll={refreshAll} onToggleAuto={setAutoOn} />

      <main>
        {SOURCES.map((src) => (
          <Panel key={src.key} source={src} registerReload={registerReload} onSync={syncNow} />
        ))}
      </main>

      <footer>
        Nothing is stored. Every request goes straight to the sources below.
        <br />
        Hacker News and GitHub are called from your browser. Reddit, GamerPower, and arXiv send no CORS headers, so they
        go through <code>/api</code> on this site; if that isn&apos;t reachable they fall back to a public relay. The
        label next to each panel shows which one answered.
        <br />
        Not affiliated with Reddit, GamerPower, or arXiv. Built for personal use.
      </footer>
    </>
  );
}
