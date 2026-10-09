/**
 * Notification Center Modal & Drawer (features/notifications/NotificationCenterModal.jsx)
 *
 * Responsibility:
 * Dedicated notification management view supporting categorized filtering, date-based grouping,
 * instant read/unread actions, single dismiss, bulk mark-all-as-read, and validated navigation.
 *
 * CONNECTED MODULES:
 * - Services: frontend/services/notificationService.js
 * - Sockets: frontend/lib/socket.js
 * - UI: frontend/components/ui
 * - Avatars: frontend/lib/avatars.js
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { notificationService } from '@/services/notificationService';
import { getSocket } from '@/lib/socket';
import { Avatar } from '@/components/ui';
import { getUserAvatar } from '@/lib/avatars';

const TABS = [
  { id: 'all', label: 'All', icon: 'notifications' },
  { id: 'unread', label: 'Unread', icon: 'mark_email_unread' },
  { id: 'messages', label: 'Messages', icon: 'chat' },
  { id: 'social', label: 'Social', icon: 'group' },
  { id: 'groups', label: 'Groups', icon: 'forum' },
  { id: 'calls', label: 'Calls', icon: 'call' },
];

export function NotificationCenterModal({ isOpen, onClose, onCountChange }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchNotifications = useCallback(async (isInitial = true, cursor = null) => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const isUnreadFilter = activeTab === 'unread';
      const categoryFilter = isUnreadFilter ? 'all' : activeTab;
      const data = await notificationService.list({
        category: categoryFilter,
        isRead: isUnreadFilter ? false : undefined,
        before: cursor,
        limit: 20,
      });

      if (isInitial) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      }

      setHasMore(!!data.hasMore);
      setNextCursor(data.nextCursor || null);
      if (typeof onCountChange === 'function' && typeof data.totalUnread === 'number') {
        onCountChange(data.totalUnread);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab, onCountChange]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, activeTab, fetchNotifications]);

  // Realtime Socket updates
  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    if (!socket) return;

    const handleReceived = (payload) => {
      if (payload?.notification) {
        setNotifications((prev) => [payload.notification, ...prev]);
      }
    };

    const handleRead = (payload) => {
      if (payload?.notificationId) {
        setNotifications((prev) =>
          prev.map((n) => (String(n._id || n.id) === String(payload.notificationId) ? { ...n, isRead: true } : n))
        );
      }
    };

    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const handleDeleted = (payload) => {
      if (payload?.notificationId) {
        setNotifications((prev) => prev.filter((n) => String(n._id || n.id) !== String(payload.notificationId)));
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
  }, [isOpen]);

  const handleMarkAsRead = async (e, notification) => {
    e.stopPropagation();
    const id = notification._id || notification.id;
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (String(n._id || n.id) === String(id) ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn('Failed to mark notification read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (typeof onCountChange === 'function') onCountChange(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err.message);
    }
  };

  const handleDelete = async (e, notification) => {
    e.stopPropagation();
    const id = notification._id || notification.id;
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => String(n._id || n.id) !== String(id)));
    } catch (err) {
      console.warn('Failed to delete notification:', err.message);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead({ stopPropagation: () => {} }, notification);
    }

    onClose();

    // Canonical navigation
    const { targetType, targetId, category } = notification;
    if (targetType === 'conversation' && targetId) {
      router.push(`/chat?conversationId=${targetId}`);
    } else if (targetType === 'group' && targetId) {
      router.push(`/chat?conversationId=${targetId}`);
    } else if (targetType === 'profile' && targetId) {
      router.push(`/profile?userId=${targetId}`);
    } else if (targetType === 'settings') {
      router.push('/settings');
    } else if (category === 'social') {
      router.push('/profile');
    } else {
      router.push('/dashboard');
    }
  };

  // Group notifications by date (TODAY, YESTERDAY, OLDER)
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      TODAY: [],
      YESTERDAY: [],
      OLDER: [],
    };

    for (const item of notifications) {
      const itemDate = new Date(item.createdAt || Date.now());
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        groups.TODAY.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups.YESTERDAY.push(item);
      } else {
        groups.OLDER.push(item);
      }
    }

    return groups;
  }, [notifications]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-scrim/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-xl bg-surface-container-lowest border-0 sm:border-[2px] border-tertiary rounded-none sm:rounded-2xl shadow-pixel-xl flex flex-col overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-surface-container border-b-[2px] border-tertiary/25 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary-container text-surface-container rounded-lg border border-tertiary shadow-pixel-sm">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </span>
            <div>
              <h2 className="font-display text-title-md font-bold text-on-surface">Notifications</h2>
              <p className="font-mono text-[11px] text-tertiary">Real-time alerts & activity</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-mono font-bold text-primary hover:bg-secondary-container/40 rounded-md border border-primary/30 transition-colors cursor-pointer"
              title="Mark all notifications as read"
            >
              <span className="material-symbols-outlined text-[15px]">done_all</span>
              <span>Mark all ✓</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-tertiary/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Close notification center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 py-2 bg-surface-container-low border-b border-tertiary/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-mono text-[12px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary border border-tertiary shadow-pixel-sm'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface hover:text-on-surface border border-tertiary/20'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-surface-container-low rounded-xl animate-pulse border border-tertiary/10">
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-container rounded w-1/3" />
                    <div className="h-3 bg-surface-container rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-error-container/40 text-error flex items-center justify-center border border-error/30">
                <span className="material-symbols-outlined text-[24px]">error</span>
              </div>
              <p className="font-display font-bold text-on-surface text-body-md mb-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchNotifications(true)}
                className="mt-2 px-3 py-1.5 bg-primary-container text-surface-container font-mono text-[12px] font-bold rounded-lg border border-tertiary shadow-pixel-sm cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface-container text-tertiary/60 flex items-center justify-center border-[1.5px] border-tertiary/20 shadow-pixel-sm">
                <span className="material-symbols-outlined text-[28px]">notifications_off</span>
              </div>
              <p className="font-display font-bold text-on-surface text-title-sm mb-1">No notifications</p>
              <p className="font-mono text-[12px] text-tertiary max-w-xs mx-auto">
                {activeTab === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'Activity like messages, invites, and call alerts will show up here.'}
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedNotifications).map(([label, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={label} className="space-y-2">
                    <div className="px-1 font-mono text-[11px] font-bold text-tertiary tracking-wider uppercase">
                      {label}
                    </div>
                    <div className="space-y-1.5">
                      {items.map((n) => (
                        <NotificationRow
                          key={n._id || n.id}
                          notification={n}
                          onClick={() => handleNotificationClick(n)}
                          onMarkRead={(e) => handleMarkAsRead(e, n)}
                          onDelete={(e) => handleDelete(e, n)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => fetchNotifications(false, nextCursor)}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-surface-container text-on-surface font-mono text-[12px] font-bold rounded-lg border border-tertiary/30 hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMore ? 'Loading older...' : 'Load more notifications'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({ notification, onClick, onMarkRead, onDelete }) {
  const isUnread = !notification.isRead;
  const actor = notification.actorId;
  const timeStr = formatNotificationTime(notification.createdAt);

  const getCategoryIcon = (category, type) => {
    if (type?.includes('call')) return 'call';
    if (type?.includes('follow')) return 'person_add';
    if (type?.includes('invitation')) return 'mail';
    if (category === 'messages') return 'chat';
    if (category === 'groups') return 'forum';
    if (category === 'calls') return 'call';
    if (category === 'social') return 'group';
    return 'notifications';
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
        isUnread
          ? 'bg-surface-container-lowest border-primary/40 shadow-pixel-sm'
          : 'bg-surface-container-low/60 border-tertiary/15 hover:bg-surface-container hover:border-tertiary/30'
      }`}
    >
      {/* Avatar or Category Icon */}
      <div className="relative flex-shrink-0">
        {actor ? (
          <Avatar src={getUserAvatar(actor)} alt={actor.displayName || 'user'} size={38} />
        ) : (
          <div className="w-[38px] h-[38px] rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center border border-tertiary/30 shadow-pixel-sm">
            <span className="material-symbols-outlined text-[20px]">
              {getCategoryIcon(notification.category, notification.type)}
            </span>
          </div>
        )}
        {isUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-[1.5px] border-surface shadow-pixel-sm animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`font-display text-[13px] truncate ${isUnread ? 'font-bold text-on-surface' : 'font-semibold text-on-surface-variant'}`}>
            {notification.title}
          </p>
          <span className="font-mono text-[10px] text-tertiary whitespace-nowrap flex-shrink-0">
            {timeStr}
          </span>
        </div>
        <p className="font-body text-[12px] text-on-surface-variant line-clamp-2 mt-0.5 break-words">
          {notification.body}
        </p>
      </div>

      {/* Actions (visible on hover / touch) */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button
            type="button"
            onClick={onMarkRead}
            className="w-7 h-7 flex items-center justify-center rounded-md text-tertiary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            title="Mark as read"
            aria-label="Mark notification as read"
          >
            <span className="material-symbols-outlined text-[16px]">done</span>
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-md text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          title="Dismiss notification"
          aria-label="Delete notification"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  );
}

function formatNotificationTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
