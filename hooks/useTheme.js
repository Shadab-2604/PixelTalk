/**
 * File: useTheme.js
 *
 * Responsibility:
 * Custom React hook managing application color theme (light, dark, or system).
 * Observes OS color scheme media queries and persists user theme preferences in localStorage.
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/app/settings/page.jsx
 * - frontend/app/providers.jsx
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

const KEY = 'pixeltalk:theme';

function resolve(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) || 'system';
    setTheme(stored);
    setIsDark(resolve(stored));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((localStorage.getItem(KEY) || 'system') === 'system') setIsDark(mq.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const change = useCallback((next) => {
    localStorage.setItem(KEY, next);
    setTheme(next);
    setIsDark(resolve(next));
    document.documentElement.classList.toggle('dark', resolve(next));
  }, []);

  return { theme, isDark, setTheme: change };
}
