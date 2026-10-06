'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * File: usePresence.js
 *
 * Responsibility:
 * Listens for global WebSocket presence events (`user_online`, `user_offline`, `presence_updated`)
 * and maintains an active dictionary of user presence states and `lastSeen` timestamps.
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/lib/socket.js
 * - frontend/features/conversations/ConversationSidebar.jsx
 * - frontend/features/rooms/RoomMembersPanel.jsx
 * - backend/src/sockets/index.js
 */

export function usePresence() {
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const apply = (userId, presence, lastSeen) =>
      setPresenceMap((prev) => ({ ...prev, [userId]: { presence, lastSeen: lastSeen || prev[userId]?.lastSeen } }));

    const onOnline = (p) => apply(p.userId, 'online');
    const onOffline = (p) => apply(p.userId, 'offline', p.lastSeen);
    const onPresence = (p) => apply(p.userId, p.presence, p.lastSeen);

    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('presence_updated', onPresence);

    return () => {
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('presence_updated', onPresence);
    };
  }, []);

  const isOnline = (userId) => presenceMap[userId]?.presence === 'online';
  return { presenceMap, isOnline };
}
