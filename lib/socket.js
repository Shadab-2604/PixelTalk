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
 */

import { SOCKET_URL } from './config';

let socket = null;
let connected = false;
const statusListeners = new Set();

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('pixeltalk_token') || null;
  } catch {
    return null;
  }
}

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (socket) {
    // If socket exists but auth token is missing in socket options and is now available in localStorage, authenticate
    const token = getStoredToken();
    if (token && socket.connected) {
      socket.emit('authenticate', { token });
    }
    return socket;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { io } = require('socket.io-client');

  const token = getStoredToken();

  socket = io(SOCKET_URL, {
    auth: (cb) => {
      cb({ token: getStoredToken() });
    },
    query: {
      token: token || '',
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    connected = true;
    const currentToken = getStoredToken();
    if (currentToken) {
      socket.emit('authenticate', { token: currentToken });
    }
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

export function syncSocketAuth(token) {
  if (typeof window === 'undefined') return;
  const currentToken = token || getStoredToken();
  if (socket) {
    if (currentToken) {
      socket.auth = { token: currentToken };
      if (socket.connected) {
        socket.emit('authenticate', { token: currentToken });
      } else {
        socket.connect();
      }
    }
  } else if (currentToken) {
    getSocket();
  }
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
    statusListeners.forEach((fn) => fn(false));
  }
}
