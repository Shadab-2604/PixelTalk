/*
 * ============================================================
 * PIXELTALK — FRONTEND WEBSOCKET SINGLETON (socket.js)
 * ============================================================
 *
 * WHAT:
 * Manages the real-time, bi-directional Socket.IO connection between the user's browser
 * and the PixelTalk server.
 *
 * WHY:
 * Real-time messaging needs instant updates (0-millisecond delivery) without refreshing
 * the browser. Instead of opening a new WebSocket connection in every component, `socket.js`
 * maintains ONE single connection (Singleton pattern) shared across the entire app.
 *
 * HOW IT WORKS:
 * 1. `getSocket()` checks if a socket already exists. If not, it creates a new Socket.IO connection.
 * 2. Passes `withCredentials: true` so authentication cookies are validated by the backend.
 * 3. Tracks connection health (`connect`, `disconnect`, `connect_error`) and updates UI pips.
 * 4. `disconnectSocket()` cleans up the connection when a player logs out.
 *
 * USED BY:
 * - frontend/components/AppShell.jsx (global incoming message toast listener)
 * - frontend/app/chat/[conversationId]/page.jsx (1-on-1 direct messaging)
 * - frontend/app/rooms/[conversationId]/page.jsx (community lounge room messages)
 * - frontend/hooks/usePresence.js (online/offline player presence tracking)
 * - frontend/hooks/useTyping.js (real-time typing indicator events)
 * - frontend/hooks/useConnectionStatus.js (top bar online pip status indicator)
 *
 * SOCKET EVENTS:
 * - Emits: `join_conversation`, `leave_conversation`, `send_message`, `edit_message`, `typing_start`, `typing_stop`
 * - Listens: `new_message`, `message_updated`, `message_deleted`, `message_read`, `message_delivered`, `presence_change`
 * ============================================================
 */

import { SOCKET_URL } from './config';

let socket = null;
let connected = false;
const statusListeners = new Set();

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  // Safe client-side resolution of socket.io-client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('socket.io-client');

  let token = null;
  try {
    token = localStorage.getItem('pixeltalk_token');
  } catch {}

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    connected = true;
    statusListeners.forEach((fn) => fn(true));
  });
  socket.on('disconnect', () => {
    connected = false;
    statusListeners.forEach((fn) => fn(false));
  });
  socket.on('connect_error', () => {
    connected = false;
    statusListeners.forEach((fn) => fn(false));
  });

  return socket;
}

export function onConnectionStatus(fn) {
  statusListeners.add(fn);
  fn(connected);
  return () => statusListeners.delete(fn);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
  }
}
