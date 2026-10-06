/**
 * File: useSound.js
 *
 * Responsibility:
 * Exposes audio playback triggers and volume/enablement preferences to React components.
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/lib/sound.js (Web Audio synthesizer engine)
 * - frontend/components/TopBar.jsx
 * - frontend/features/messages/MessageComposer.jsx
 * - frontend/app/settings/page.jsx
 */

'use client';

import { useState, useCallback } from 'react';
import { getSoundPrefs, setSoundPrefs, playSound, sfx } from '@/lib/sound';

export function useSound() {
  const [prefs, setPrefs] = useState(() => getSoundPrefs());

  const update = useCallback((partial) => {
    setPrefs(setSoundPrefs(partial));
  }, []);

  const toggle = useCallback(() => {
    const current = getSoundPrefs();
    const updated = setSoundPrefs({ enabled: !current.enabled });
    setPrefs(updated);
  }, []);

  const play = useCallback((name) => {
    if (!getSoundPrefs().enabled) return;
    if (typeof sfx[name] === 'function') {
      sfx[name]();
    } else {
      playSound(name);
    }
  }, []);

  return { ...prefs, update, toggle, play };
}
