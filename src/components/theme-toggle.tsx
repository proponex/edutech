'use client';

import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label="Toggle light or dark theme"
      title="Toggle light or dark theme"
      className={`relative inline-flex items-center h-8 w-16 p-1 rounded-full border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 cursor-pointer select-none shrink-0 ${className}`}
    >
      {/* Sun Icon */}
      <span className="absolute left-1.5 text-amber-500 flex items-center justify-center pointer-events-none">
        <Sun className="w-3.5 h-3.5" />
      </span>

      {/* Moon Icon */}
      <span className="absolute right-1.5 text-primary-400 flex items-center justify-center pointer-events-none">
        <Moon className="w-3.5 h-3.5" />
      </span>

      {/* Sliding Knob */}
      <span
        className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-neutral-950 shadow-md border border-neutral-200/60 dark:border-neutral-800 transform transition-transform duration-200 ease-in-out translate-x-0 dark:translate-x-8 text-amber-500 dark:text-primary-400"
      >
        <Sun className="w-3.5 h-3.5 fill-current block dark:hidden" />
        <Moon className="w-3.5 h-3.5 fill-current hidden dark:block" />
      </span>
    </button>
  );
}
