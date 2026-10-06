/**
 * File: notificationService.js
 *
 * Responsibility:
 * Centralized notification, audio, and haptic feedback orchestrator:
 * - Desktop system notifications (HTML5 Notification API)
 * - In-app pixel toast alerts with direct route navigation
 * - Hardware haptic vibration patterns (navigator.vibrate)
 * - Mute suppression and private room message content protection
 *
 * Layer:
 * Frontend / Services
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/components/NotificationToastContainer.jsx
 * - frontend/lib/sound.js
 * - frontend/lib/avatars.js
 * - frontend/app/settings/page.jsx
 *
 * Important behavior:
 * - Strictly respects conversation-level and user-level mute settings.
 * - Suppresses notifications for messages originated by the authenticated user.
 * - Obfuscates message previews for passcode-protected or private group rooms.
 */

import { playSound } from '@/lib/sound';
import { avatarSrc } from '@/lib/avatars';

// Global in-app toast listeners
const toastListeners = new Set();

export function onInAppToast(listener) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

function dispatchInAppToast(toastData) {
  toastListeners.forEach((fn) => {
    try {
      fn(toastData);
    } catch {
      /* ignore listener error */
    }
  });
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function triggerVibration(pattern = [100, 50, 100]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore vibration errors gracefully */
    }
  }
}

export function showDesktopNotification(titleOrOptions, maybeOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  let title = 'PixelTalk';
  let body = 'New message';
  let icon = '/logo/icon-mark.svg';
  let tag = 'pixeltalk-msg';
  let onClick = null;

  if (typeof titleOrOptions === 'string') {
    title = titleOrOptions;
    if (maybeOptions && typeof maybeOptions === 'object') {
      if (maybeOptions.body) body = maybeOptions.body;
      if (maybeOptions.icon) icon = maybeOptions.icon;
      if (maybeOptions.tag) tag = maybeOptions.tag;
      if (maybeOptions.onClick) onClick = maybeOptions.onClick;
    }
  } else if (titleOrOptions && typeof titleOrOptions === 'object') {
    if (titleOrOptions.title) title = titleOrOptions.title;
    if (titleOrOptions.body) body = titleOrOptions.body;
    if (titleOrOptions.icon) icon = titleOrOptions.icon;
    if (titleOrOptions.tag) tag = titleOrOptions.tag;
    if (titleOrOptions.onClick) onClick = titleOrOptions.onClick;
  }

  if (Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon,
        badge: '/logo/icon-mark.svg',
        tag: tag || 'pixeltalk-msg',
        silent: true, // Audio handled by PixelTalk sound engine according to mode
      });
      if (onClick) {
        n.onclick = (e) => {
          e.preventDefault();
          window.focus();
          onClick();
          n.close();
        };
      }
      return n;
    } catch (err) {
      console.warn('Desktop notification trigger error:', err);
    }
  }
  return null;
}

/**
 * Master notification handler for incoming messages across Socket.IO.
 * Enforces mute state, privacy rule, notification mode, sound/vibration, and UI toasts.
 */
export function handleIncomingMessageNotification({
  eventData,
  currentUser,
  activeConversationId,
  onNavigate,
}) {
  if (!eventData || !currentUser) return;

  const currentUserId = currentUser._id || currentUser.id;
  const msg = eventData.message || eventData;
  const sender = eventData.sender || (typeof msg.senderId === 'object' ? msg.senderId : null) || {};
  const senderId = (typeof sender === 'object' && (sender._id || sender.id)) ? (sender._id || sender.id) : (msg.senderId || '');
  const convo = eventData.conversation || {};
  const conversationId = String(eventData.conversationId || msg.conversationId || convo._id || convo.id || '');

  // 1. Never notify for your own message
  if (String(senderId) === String(currentUserId)) {
    return;
  }

  // 2. Muted conversation/user check (Recipient-specific)
  // If muted: NO notification, NO sound, NO vibration
  const mutedList = (currentUser.mutedConversations || []).map((id) => (id?._id ? String(id._id) : String(id)));
  const isMuted = conversationId ? mutedList.includes(conversationId) : false;
  if (isMuted) {
    return;
  }

  // 3. Active conversation check (avoid redundant spam if actively reading that chat)
  const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
  const isActiveAndVisible = isTabVisible && activeConversationId && String(activeConversationId) === conversationId;
  if (isActiveAndVisible) {
    return;
  }

  // 4. Determine Conversation Details & Privacy Rule
  const isGroup = convo.type === 'group';
  const isPrivateRoom = Boolean(eventData.isPrivateRoom || convo.privacy === 'private');

  const senderName = (typeof sender === 'object' && (sender.displayName || sender.username))
    ? (sender.displayName || sender.username)
    : 'PixelTalk Member';
  const groupName = convo.name ? `#${convo.name}` : 'Group';
  const avatarUrl = avatarSrc((typeof sender === 'object' && sender.avatarId) ? sender.avatarId : 'avatar-01');

  // PRIVACY RULE: Private/Passcode rooms NEVER expose message text in notification preview
  let previewText = 'New message';
  if (!isPrivateRoom) {
    const raw = String(eventData.preview || eventData.messagePreview || msg.content || '');
    previewText = raw.length > 100 ? `${raw.slice(0, 100)}...` : raw || 'New message';
  }

  const notificationTitle = isGroup ? `${senderName} • ${groupName}` : senderName;
  const targetRoute = isGroup ? `/rooms/${conversationId}` : `/chat/${conversationId}`;

  // 5. Check User Preferences & Notification Mode
  const prefs = currentUser.preferences || {};
  const notificationsEnabled = prefs.notificationsEnabled !== false;
  const mode = prefs.notificationMode || 'normal'; // 'normal' | 'vibrate' | 'silent'
  const soundEnabled = prefs.soundEnabled !== false;

  const perChatVibrate = (currentUser.vibrateConversations || [])
    .map((id) => (id?._id ? String(id._id) : String(id)))
    .includes(conversationId);

  // 6. Sound & Vibration Dispatch based on Mode
  if (mode === 'normal') {
    if (soundEnabled) {
      if (isPrivateRoom) {
        playSound('notification.privateMessage');
      } else if (isGroup) {
        playSound('notification.groupMessage');
      } else {
        playSound('notification.message');
      }
    }
    if (perChatVibrate) {
      triggerVibration([100, 50, 100]);
    }
  } else if (mode === 'vibrate') {
    // VIBRATE MODE: Notification + Vibration - NO Sound
    triggerVibration([100, 50, 100]);
  } else if (mode === 'silent') {
    // SILENT MODE: No Sound, No Vibration
  }

  // 7. Render Notifications (if notifications enabled)
  if (notificationsEnabled) {
    const clickAction = () => {
      if (onNavigate) {
        onNavigate(targetRoute);
      } else if (typeof window !== 'undefined') {
        window.location.href = targetRoute;
      }
    };

    // A. Desktop System Notification (when backgrounded or permission granted)
    showDesktopNotification({
      title: notificationTitle,
      body: previewText,
      icon: avatarUrl,
      tag: `msg-${conversationId}`,
      onClick: clickAction,
    });

    // B. In-App Toast (when user is inside the app but on a different view)
    if (!isActiveAndVisible) {
      dispatchInAppToast({
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: notificationTitle,
        senderName,
        groupName: isGroup ? groupName : null,
        preview: previewText,
        avatarUrl,
        conversationId,
        route: targetRoute,
        createdAt: new Date().toISOString(),
      });
    }
  }
}

/*
 * ============================================================
 * GROUP INVITATION NOTIFICATION HANDLER
 * ============================================================
 *
 * WHAT:
 * Processes realtime 'group_invitation_received' socket notifications.
 *
 * WHY:
 * Invitations are stored as PENDING and require user consent. An alert notifies the
 * recipient with [ACCEPT] and [REJECT] actions.
 *
 * HOW:
 * 1. Checks user notification preferences (silent, vibrate, normal).
 * 2. Triggers audio and haptic feedback.
 * 3. Shows desktop system notification and interactive in-app toast with
 *    ACCEPT and REJECT action callbacks.
 *
 * SECURITY:
 * Never leaks private group messages or room history before user accepts.
 * ============================================================
 */
export function handleIncomingInvitationNotification({
  eventData,
  currentUser,
  onAccept,
  onReject,
}) {
  if (!eventData || !currentUser) return;

  const inviter = eventData.inviter || {};
  const group = eventData.group || {};
  const invitation = eventData.invitation || {};

  const inviterName = inviter.displayName || inviter.username || 'A player';
  const groupName = group.name ? `#${group.name}` : 'a group';
  const message = `${inviterName} invited you to join ${groupName}.`;

  const prefs = currentUser.preferences || {};
  const notificationsEnabled = prefs.notificationsEnabled !== false;
  const mode = prefs.notificationMode || 'normal';
  const soundEnabled = prefs.soundEnabled !== false;

  if (mode === 'normal') {
    if (soundEnabled) playSound('notification.message');
  } else if (mode === 'vibrate') {
    triggerVibration([150, 75, 150]);
  }

  if (notificationsEnabled) {
    showDesktopNotification({
      title: 'Group Invitation',
      body: message,
      icon: group.avatarUrl || avatarSrc(group.avatarId || 'avatar-06'),
      tag: `invite-${invitation._id}`,
    });

    dispatchInAppToast({
      id: `toast-invite-${invitation._id || Date.now()}`,
      type: 'invitation',
      invitationId: invitation._id,
      groupId: group._id,
      title: 'Group Invitation',
      senderName: inviterName,
      groupName: group.name,
      preview: message,
      avatarUrl: group.avatarUrl || avatarSrc(group.avatarId || 'avatar-06'),
      onAccept,
      onReject,
      createdAt: new Date().toISOString(),
    });
  }
}
