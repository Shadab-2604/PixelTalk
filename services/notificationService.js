/**
 * Notification Service & Client Notification Engine (frontend/services/notificationService.js)
 *
 * Responsibility:
 * 1. REST API gateway for persistent notification CRUD (list, getUnreadCount, markRead, markAllRead, deleteNotification).
 * 2. In-app toast event bus & desktop web notifications.
 * 3. Haptic vibration signaling.
 *
 * CONNECTED MODULES:
 * - API: frontend/lib/api.js
 * - Shell: frontend/components/AppShell.jsx, frontend/components/NotificationToastContainer.jsx
 * - Modals: frontend/features/notifications/NotificationCenterModal.jsx, frontend/features/notifications/NotificationBell.jsx
 */

import { get, patch, post, del } from '@/lib/api';
import { sfx } from '@/lib/sound';
import { avatarSrc } from '@/lib/avatars';

const toastListeners = new Set();

export function onInAppToast(fn) {
  toastListeners.add(fn);
  return () => toastListeners.delete(fn);
}

export function emitInAppToast(toast) {
  toastListeners.forEach((fn) => {
    try {
      fn(toast);
    } catch (err) {
      console.warn('Toast listener error:', err);
    }
  });
}

export function triggerVibration(pattern = [120, 80, 120]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore vibration permission error */
    }
  }
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function showDesktopNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      icon: '/logo/icon-mark.svg',
      badge: '/logo/icon-mark.svg',
      ...options,
    });
    return notif;
  } catch {
    return null;
  }
}

/**
 * Handles incoming realtime message event and triggers in-app toast, audio chime, and vibration.
 */
export function handleIncomingMessageNotification(payload, currentUser, activeConversationId) {
  if (!payload || !payload.conversationId) return;

  const convoId = String(payload.conversationId);
  const isCurrentActive = activeConversationId === convoId;
  const senderId = payload.sender?.id || payload.sender?._id || payload.message?.senderId?._id || payload.message?.senderId;
  const currentUserId = currentUser?._id || currentUser?.id;

  // Do not alert for messages sent by the user themselves
  if (currentUserId && String(senderId) === String(currentUserId)) return;

  // If chat is currently open and focused in the view, suppress audio / toast chimes
  if (isCurrentActive) return;

  const senderName = payload.sender?.displayName || payload.sender?.username || 'Player';
  const groupName = payload.conversation?.name ? `#${payload.conversation.name}` : null;
  const isPrivate = !!payload.isPrivateRoom || payload.conversation?.privacy === 'private';
  const preview = isPrivate ? 'New message' : (payload.preview || payload.messagePreview || 'Sent a message');
  const route = payload.conversation?.type === 'group' ? `/rooms/${convoId}` : `/chat/${convoId}`;
  const avatarUrl = payload.sender ? avatarSrc(payload.sender.avatarId) : '/avatars/avatar-01.png';

  // Sound chime
  sfx.message();

  // In-app toast
  emitInAppToast({
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'message',
    senderName,
    groupName,
    preview,
    route,
    avatarUrl,
    conversationId: convoId,
  });

  // Browser desktop notification
  if (getNotificationPermission() === 'granted') {
    showDesktopNotification(groupName ? `${senderName} in ${groupName}` : senderName, {
      body: preview,
      tag: `convo_${convoId}`,
    });
  }
}

/**
 * Handles incoming group invitation event.
 */
export function handleIncomingInvitationNotification(payload, currentUser) {
  if (!payload || !payload.invitation) return;
  const inv = payload.invitation;
  const inviter = payload.inviter || inv.inviterId;
  const inviterName = inviter?.displayName || inviter?.username || 'A player';
  const groupName = payload.conversation?.name || inv.conversationId?.name || 'group';

  sfx.mention();

  emitInAppToast({
    id: `inv_${inv._id || Date.now()}`,
    type: 'invitation',
    senderName: inviterName,
    groupName: `#${groupName}`,
    preview: `${inviterName} invited you to join #${groupName}`,
    route: `/rooms/${inv.conversationId?._id || inv.conversationId || ''}`,
    avatarUrl: inviter ? avatarSrc(inviter.avatarId) : '/avatars/avatar-01.png',
    invitation: inv,
  });
}

/**
 * REST API client for persistent notifications.
 */
export const notificationService = {
  async list({ category = 'all', isRead, before, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (typeof isRead === 'boolean') params.append('isRead', String(isRead));
    if (before) params.append('before', before);
    if (limit) params.append('limit', String(limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return get(`/notifications${qs}`);
  },

  async getUnreadCount() {
    return get('/notifications/unread-count');
  },

  async markRead(notificationId) {
    return patch(`/notifications/${notificationId}/read`);
  },

  async markAllRead() {
    return post('/notifications/read-all');
  },

  async deleteNotification(notificationId) {
    return del(`/notifications/${notificationId}`);
  },
};
