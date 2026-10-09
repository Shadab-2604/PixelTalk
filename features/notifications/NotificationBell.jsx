/**
 * Notification Bell Button (features/notifications/NotificationBell.jsx)
 *
 * Responsibility:
 * Header entry point for notifications displaying real-time unread count badge (capped at 99+)
 * and triggering the Notification Center modal/drawer.
 *
 * CONNECTED MODULES:
 * - Services: frontend/services/notificationService.js
 * - Sockets: frontend/lib/socket.js
 * - Modal: frontend/features/notifications/NotificationCenterModal.jsx
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenterModal } from './NotificationCenterModal';

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // Ignored if offline or unauthorized
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    const handleReceived = (payload) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleRead = (payload) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      } else {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleAllRead = () => {
      setUnreadCount(0);
    };

    const handleDeleted = (payload) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      }
    };

    socket.on('notification_received', handleReceived);
    socket.on('notification_read', handleRead);
    socket.on('notification_all_read', handleAllRead);
    socket.on('notification_deleted', handleDeleted);

    return () => {
      socket.off('notification_received', handleReceived);
      socket.off('notification_read', handleRead);
      socket.off('notification_all_read', handleAllRead);
      socket.off('notification_deleted', handleDeleted);
    };
  }, [user]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-tertiary/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all press shadow-pixel-sm cursor-pointer"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notification Center'}
        aria-label="Open notifications"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center border-[1.5px] border-surface shadow-pixel-sm animate-pulse">
            {displayCount}
          </span>
        )}
      </button>

      <NotificationCenterModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCountChange={setUnreadCount}
      />
    </>
  );
}
