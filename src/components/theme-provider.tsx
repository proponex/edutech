'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import { ThemeMode } from '@/types';

interface ThemeContextType {
  theme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribeTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('edutech-theme-change', callback);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('edutech-theme-change', callback);
    mq.removeEventListener('change', callback);
  };
}

function getThemeSnapshot(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('edutech-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // Ignore
  }
  return 'light';
}

function getServerThemeSnapshot(): 'light' | 'dark' {
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const applyThemeToDOM = useCallback((newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('edutech-theme', newTheme);
      window.dispatchEvent(new Event('edutech-theme-change'));
    } catch {
      // Ignore
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: 'light' | 'dark' | ThemeMode) => {
      const targetTheme: 'light' | 'dark' = newTheme === 'dark' ? 'dark' : 'light';
      applyThemeToDOM(targetTheme);
    },
    [applyThemeToDOM]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyThemeToDOM(nextTheme);
  }, [theme, applyThemeToDOM]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme: theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
