/**
 * PixelTalk Sound System & 8-Bit WebAudio Synthesizer
 *
 * Responsibility:
 * Generates tactile retro chiptune audio feedback for UI clicks, message transmissions,
 * notification arrivals, and room membership events using zero-asset Web Audio synthesis.
 *
 * CONNECTED MODULES:
 * - Services: frontend/services/notificationService.js
 * - Hooks: frontend/hooks/useSound.js
 * - Components: frontend/components/TopBar.jsx, frontend/features/messages/MessageComposer.jsx
 * - Pages: frontend/app/settings/page.jsx (audio preference controls)
 *
 * CONCEPTS:
 * - Autoplay Policy Unlocking: Browsers suspend AudioContext until user interaction;
 *   listens for first pointerdown/keydown gesture to resume audio playback seamlessly.
 * - Semantic Event Keys: UI code triggers semantic identifiers ('chat.send', 'ui.click')
 *   abstracting away sound synthesis vs static audio asset playback.
 */

const PREF_KEY = 'pixeltalk:sound';
const LAST_PLAYED = {};
const MIN_GAP_MS = 60;

let ctx = null;
let unlocked = false;

const state = { enabled: true, volume: 75 };

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.enabled = parsed.enabled !== false;
      state.volume = typeof parsed.volume === 'number' ? Math.max(0, Math.min(100, parsed.volume)) : 75;
    }
  } catch {
    /* ignore corrupt prefs */
  }
  // Unlock audio on first user gesture
  const unlock = () => {
    unlocked = true;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function getSoundPrefs() {
  return { ...state };
}

export function setSoundPrefs(partial) {
  Object.assign(state, partial);
  if (typeof window !== 'undefined') {
    localStorage.setItem(PREF_KEY, JSON.stringify(state));
  }
  return { ...state };
}

// 8-Bit Voxel/Chiptune Synthesizer Recipes: [[freqHz, startMs, durMs, waveType]]
const RECIPES = {
  // UI
  'ui.click': [[660, 0, 35, 'square']],
  'ui.open': [[440, 0, 40, 'triangle'], [660, 35, 50, 'triangle']],
  'ui.close': [[660, 0, 40, 'triangle'], [440, 35, 50, 'triangle']],
  'ui.error': [[220, 0, 110, 'sawtooth'], [185, 100, 140, 'sawtooth']],

  // Chat
  'chat.send': [[523, 0, 45, 'square'], [784, 40, 65, 'square']],
  'chat.receive': [[392, 0, 55, 'square'], [523, 50, 75, 'triangle']],
  'chat.mention': [[587, 0, 50, 'triangle'], [880, 50, 80, 'square']],

  // Notification
  'notification.message': [[523, 0, 50, 'square'], [659, 60, 50, 'square'], [784, 120, 80, 'square']],
  'notification.privateMessage': [[440, 0, 50, 'triangle'], [554, 50, 50, 'triangle'], [659, 100, 70, 'triangle']],
  'notification.groupMessage': [[440, 0, 50, 'square'], [554, 55, 50, 'square'], [659, 110, 60, 'square'], [880, 170, 90, 'triangle']],

  // Auth
  'auth.otpSent': [[523, 0, 60, 'triangle'], [659, 60, 80, 'triangle']],
  'auth.otpSuccess': [[523, 0, 60, 'triangle'], [659, 60, 60, 'triangle'], [784, 120, 70, 'triangle'], [1046, 180, 110, 'triangle']],
  'auth.otpError': [[260, 0, 90, 'sawtooth'], [200, 80, 130, 'sawtooth']],
  'auth.welcome': [[392, 0, 80, 'square'], [523, 80, 80, 'square'], [659, 160, 90, 'square'], [784, 250, 120, 'triangle']],

  // Room
  'room.join': [[392, 0, 60, 'square'], [523, 60, 80, 'square'], [659, 140, 100, 'triangle']],
  'room.leave': [[659, 0, 60, 'triangle'], [523, 60, 70, 'triangle'], [392, 130, 90, 'triangle']],
  'room.memberAdded': [[440, 0, 50, 'square'], [660, 50, 70, 'square']],
  'room.memberRemoved': [[660, 0, 50, 'triangle'], [440, 50, 70, 'triangle']],
};

// Aliases mapping old or short names to semantic events
const ALIASES = {
  click: 'ui.click',
  open: 'ui.open',
  close: 'ui.close',
  error: 'ui.error',
  send: 'chat.send',
  'message-send': 'chat.send',
  receive: 'chat.receive',
  'message-receive': 'chat.receive',
  mention: 'chat.mention',
  notify: 'notification.message',
  notification: 'notification.message',
  'room-created': 'room.join',
  success: 'auth.otpSuccess',
};

function audioContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended' && unlocked) {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function playSynth(eventName, gain) {
  const resolved = ALIASES[eventName] || eventName;
  const recipe = RECIPES[resolved] || RECIPES['ui.click'];
  const ac = audioContext();
  if (!ac) return;

  const t = ac.currentTime;
  for (const [freq, offset, dur, wave] of recipe) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t + offset / 1000);
    g.gain.exponentialRampToValueAtTime(0.22 * gain, t + offset / 1000 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (offset + dur) / 1000);
    osc.connect(g).connect(ac.destination);
    osc.start(t + offset / 1000);
    osc.stop(t + (offset + dur) / 1000 + 0.02);
  }
}

/**
 * Primary sound dispatch function.
 * @param {string} eventName Semantic event or alias (e.g. 'chat.send', 'notification.message', 'click')
 */
export function playSound(eventName) {
  if (typeof window === 'undefined' || !state.enabled || !unlocked) return;

  const resolved = ALIASES[eventName] || eventName;

  // Anti-spam gap check
  const now = Date.now();
  if (LAST_PLAYED[resolved] && now - LAST_PLAYED[resolved] < MIN_GAP_MS) return;
  LAST_PLAYED[resolved] = now;

  const gain = Math.max(0, Math.min(100, state.volume)) / 100;
  if (gain === 0) return;

  try {
    playSynth(resolved, gain);
  } catch {
    /* ignore audio playback restrictions silently */
  }
}

export const sfx = {
  click: () => playSound('ui.click'),
  open: () => playSound('ui.open'),
  close: () => playSound('ui.close'),
  error: () => playSound('ui.error'),
  send: () => playSound('chat.send'),
  receive: () => playSound('chat.receive'),
  mention: () => playSound('chat.mention'),
  notify: () => playSound('notification.message'),
  notifyPrivate: () => playSound('notification.privateMessage'),
  notifyGroup: () => playSound('notification.groupMessage'),
  otpSent: () => playSound('auth.otpSent'),
  otpSuccess: () => playSound('auth.otpSuccess'),
  otpError: () => playSound('auth.otpError'),
  welcome: () => playSound('auth.welcome'),
  roomJoin: () => playSound('room.join'),
  roomLeave: () => playSound('room.leave'),
  roomCreated: () => playSound('room.join'),
  success: () => playSound('auth.otpSuccess'),
};
