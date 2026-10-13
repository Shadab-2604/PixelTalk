/**
 * File: useTheme.js
 *
 * Responsibility:
 * Custom React hook managing application color theme (light, dark, or system).
 * Observes OS color scheme media queries, persists user theme preferences in localStorage,
 * keeps the `<html class="dark">` attribute in sync (the only thing CSS keys off), and
 * mirrors theme changes made in other browser tabs.
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/app/settings/page.jsx (full theme picker)
 * - frontend/components/TopBar.jsx (quick header toggle)
 * - frontend/app/layout.jsx (pre-paint script reads the same localStorage key)
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

const KEY = 'pixeltalk:theme'; // 'light' | 'dark' | 'system'

/** Resolve whether dark should be active for a given stored preference. */
function resolve(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // 'system' → follow OS preference
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Single place that mutates the DOM theme class — CSS does the rest. */
function applyDom(dark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY) || 'system';
    setThemeState(stored);
    const dark = resolve(stored);
    setIsDark(dark);
    applyDom(dark); // Re-assert after hydration in case another tab changed it

    // Follow OS changes while preference is 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if ((localStorage.getItem(KEY) || 'system') === 'system') {
        const d = mq.matches;
        setIsDark(d);
        applyDom(d);
      }
    };
    mq.addEventListener('change', onSystemChange);

    // Mirror changes from other tabs
    const onStorage = (e) => {
      if (e.key !== KEY) return;
      const next = e.newValue || 'system';
      setThemeState(next);
      const d = resolve(next);
      setIsDark(d);
      applyDom(d);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mq.removeEventListener('change', onSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setTheme = useCallback((next) => {
    localStorage.setItem(KEY, next);
    setThemeState(next);
    const d = resolve(next);
    setIsDark(d);
    applyDom(d);
  }, []);

  /** Convenience: flip between explicit light and dark (used by the quick toggle). */
  const toggleTheme = useCallback(() => {
    setTheme(resolve(localStorage.getItem(KEY) || 'system') ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, isDark, setTheme, toggleTheme };
}
