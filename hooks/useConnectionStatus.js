/**
 * File: useConnectionStatus.js
 *
 * Responsibility:
 * Custom React hook tracking real-time WebSocket connectivity status (online/offline).
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/lib/socket.js (onConnectionStatus)
 * - frontend/components/AppShell.jsx
 * - frontend/components/TopBar.jsx
 */

'use client';

import { useEffect, useState } from 'react';
import { getSocket, onConnectionStatus } from '@/lib/socket';

/**
 * React hook returning a boolean indicating whether the client Socket.IO
 * transport connection is currently established with the backend.
 *
 * @returns {boolean} True when the Socket.IO connection is live.
 */
export function useConnectionStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    getSocket();
    const off = onConnectionStatus(setOnline);
    return () => off();
  }, []);

  return online;
}
