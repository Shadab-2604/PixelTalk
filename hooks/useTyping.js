'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

/**
 * File: useTyping.js
 *
 * Responsibility:
 * Manages active typing state for the current conversation, broadcasting start/stop
 * signals to peers and rendering peer typing banners.
 *
 * Layer:
 * Frontend / Custom Hooks
 *
 * Connected to:
 * - frontend/lib/socket.js (WebSocket connection)
 * - frontend/features/messages/MessageComposer.jsx
 * - frontend/app/chat/[conversationId]/page.jsx
 * - backend/src/sockets/index.js (typing_start, typing_stop event handlers)
 *
 * Important behavior:
 * - Keystroke Throttling: Emits typing_start at most once every 1500ms while user types.
 * - Inactivity Debouncing: Automatically broadcasts typing_stop after 2500ms of typing inactivity.
 * - Cleanup: Listener unbinding on unmount prevents memory leaks.
 */

export function useTyping(conversationId) {
  const [typingUsers, setTypingUsers] = useState({});
  const timerRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return undefined;

    const onStart = (p) => {
      if (String(p.conversationId) !== String(conversationId)) return;
      setTypingUsers((prev) => ({ ...prev, [p.userId]: p.user }));
    };
    const onStop = (p) => {
      if (String(p.conversationId) !== String(conversationId)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[p.userId];
        return next;
      });
    };

    socket.on('typing_start', onStart);
    socket.on('typing_stop', onStop);
    return () => {
      socket.off('typing_start', onStart);
      socket.off('typing_stop', onStop);
    };
  }, [conversationId]);

  const signal = () => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    const now = Date.now();
    if (now - lastSentRef.current > 1500) {
      socket.emit('typing_start', { conversationId });
      lastSentRef.current = now;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId });
      lastSentRef.current = 0;
    }, 2500);
  };

  const stop = () => {
    const socket = getSocket();
    if (socket && conversationId) {
      socket.emit('typing_stop', { conversationId });
      lastSentRef.current = 0;
    }
    clearTimeout(timerRef.current);
  };

  return { typingUsers, signal, stop };
}
