'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';

type Theme = 'light' | 'dark';

// The initial theme is applied before paint by an inline script in the layout
// (from localStorage or the system setting); this button just flips and persists
// it. Rendering nothing until mounted avoids a hydration mismatch on the icon.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || 'light';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('devpulse-theme', next);
    } catch {
      /* storage blocked — theme still applies for this session */
    }
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
    </button>
  );
}
