import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  const updateResolved = (m: ThemeMode) => {
    if (m === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolved(prefersDark ? 'dark' : 'light');
    } else {
      setResolved(m);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') as ThemeMode | null;
    if (saved) setMode(saved);
    updateResolved(saved ?? 'system');
  }, []);

  useEffect(() => {
    updateResolved(mode);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.setAttribute('data-theme', resolved);
    localStorage.setItem('theme', mode);
  }, [mode, resolved]);

  const value = { mode, resolved, setMode };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
