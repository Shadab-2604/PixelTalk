/**
 * File: page.jsx (Direct Chat Room)
 *
 * Responsibility:
 * Active 1-on-1 direct messaging conversation view:
 * - Real-time Socket.IO room subscription (`conversation:<id>`)
 * - Message stream pagination, transmission, in-place edit, and soft-delete
 * - Typing indicator broadcast and peer display
 * - Right panel member profile and conversation actions (pin, mute, vibrate)
 *
 * Layer:
 * Frontend / Messaging Pages
 *
 * Connected to:
 * - frontend/features/messages/MessageList.jsx
 * - frontend/features/messages/MessageComposer.jsx
 * - frontend/features/rooms/RoomMembersPanel.jsx
 * - frontend/services/messageService.js
 * - frontend/lib/socket.js
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell, SidebarFooter } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';
import { MessageList, TypingIndicator } from '@/features/messages/MessageList';
import { MessageComposer } from '@/features/messages/MessageComposer';
import { conversationLabel, conversationAvatarId, otherMember } from '@/features/conversations/conversationUtils';
import { RoomMembersPanel } from '@/features/rooms/RoomMembersPanel';
import { ConversationActionsMenu } from '@/features/conversations/ConversationActionsMenu';
import { getSocket } from '@/lib/socket';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTyping } from '@/hooks/useTyping';
import { useSound } from '@/hooks/useSound';
import { usePresence } from '@/hooks/usePresence';
import { avatarSrc } from '@/lib/avatars';
import { timeAgo } from '@/lib/format';
import { triggerVibration, showDesktopNotification } from '@/lib/notifications';
import { Badge, IconButton, PresencePip, EmptyState, Spinner } from '@/components/ui';
import { useCall } from '@/features/calls/CallContext';

export default function ChatPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId;
  const { user, refreshUser } = useAuth();
  const { play } = useSound();
  const { isOnline } = usePresence();
  const { typingUsers, signal, stop } = useTyping(conversationId);
  const { startCall, callState } = useCall();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const socketRef = useRef(null);

  const other = useMemo(() => (conversation ? otherMember(conversation, user) : null), [conversation, user]);
  const otherOnline = useMemo(() => (other ? isOnline(other._id) : false), [other, isOnline]);
  const isOtherTyping = useMemo(() => {
    if (!other || !typingUsers) return false;
    const otherId = String(other._id || other.id || '');
    return Object.keys(typingUsers).some((id) => String(id) === otherId);
  }, [other, typingUsers]);

  // Load conversation + initial messages & mark read
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([conversationService.get(conversationId), messageService.list(conversationId)])
      .then(([c, m]) => {
        if (cancelled) return;
        setConversation(c.conversation);
        setMessages(m.messages || []);
        setNextCursor(m.nextCursor);
        messageService.markRead(conversationId).catch(() => {});
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Socket room wiring + realtime events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId || !user) return undefined;
    socketRef.current = socket;

    socket.emit('join_conversation', { conversationId });
    socket.emit('mark_read', { conversationId });

    const onNewMessage = (p) => {
      if (String(p.message.conversationId) !== String(conversationId)) return;
      const msg = p.message;
      const senderId = msg.senderId?._id || msg.senderId;
      const myId = user._id || user.id;
      setMessages((prev) => (prev.some((x) => x._id === msg._id) ? prev : [...prev, msg]));

      if (String(senderId) !== String(myId)) {
        socket.emit('mark_read', { conversationId });

        const isMuted = Array.isArray(user?.mutedConversations) &&
          user.mutedConversations.some((id) => String(id?._id || id) === String(conversationId));
        const shouldVibrate = Array.isArray(user?.vibrateConversations) &&
          user.vibrateConversations.some((id) => String(id?._id || id) === String(conversationId));
        const mode = user?.preferences?.notificationMode || 'normal';

        if (!isMuted) {
          if (mode === 'normal') {
            play('chat.receive');
            if (shouldVibrate) triggerVibration([100, 50, 100]);
          } else if (mode === 'vibrate') {
            triggerVibration([100, 50, 100]);
          }
        }
      }
    };
    const onUpdated = (p) => {
      const msg = p.message;
      if (String(msg.conversationId) !== String(conversationId)) return;
      setMessages((prev) => prev.map((x) => (x._id === msg._id ? msg : x)));
    };
    const onDeleted = (p) => {
      setMessages((prev) =>
        p.message && p.message._id
          ? prev.map((x) => (x._id === p.message._id ? p.message : x))
          : prev.map((x) => (x._id === p.messageId ? { ...x, deletedAt: new Date().toISOString(), content: '' } : x)),
      );
    };
    const onRead = (p) => {
      if (String(p.conversationId) !== String(conversationId)) return;
      const readSet = new Set((p.messageIds || []).map(String));
      setMessages((prev) =>
        prev.map((x) => (readSet.has(String(x._id)) || readSet.has(String(x.id)) ? { ...x, status: 'read' } : x)),
      );
    };
    const onDelivered = (p) => {
      if (String(p.conversationId) !== String(conversationId)) return;
      const delSet = new Set((p.messageIds || []).map(String));
      setMessages((prev) =>
        prev.map((x) => (delSet.has(String(x._id)) && x.status !== 'read' ? { ...x, status: 'delivered' } : x)),
      );
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_updated', onUpdated);
    socket.on('message_deleted', onDeleted);
    socket.on('message_read', onRead);
    socket.on('message_delivered', onDelivered);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.emit('typing_stop', { conversationId });
      socket.off('new_message', onNewMessage);
      socket.off('message_updated', onUpdated);
      socket.off('message_deleted', onDeleted);
      socket.off('message_read', onRead);
      socket.off('message_delivered', onDelivered);
    };
  }, [conversationId, user, play]);

  const send = useCallback(
    (payload) => {
      const socket = socketRef.current;
      if (!socket) return;

      if (editingMessage) {
        socket.emit('edit_message', { messageId: editingMessage._id, content: payload.content }, (res) => {
          if (res && res.success && res.data?.message) {
            setMessages((prev) => prev.map((x) => (x._id === res.data.message._id ? res.data.message : x)));
            setEditingMessage(null);
            play('success');
          } else if (res && !res.success) {
            setError(res.message || 'Failed to edit');
            play('error');
          }
        });
      } else {
        const msgPayload = typeof payload === 'string' ? { conversationId, content: payload } : { conversationId, ...payload };
        socket.emit('send_message', msgPayload, (res) => {
          if (res && res.success && res.data?.message) {
            setMessages((prev) => (prev.some((x) => x._id === res.data.message._id) ? prev : [...prev, res.data.message]));
            setReplyToMessage(null);
          } else if (res && !res.success) {
            setError(res.message || 'Failed to send');
            play('error');
          }
        });
        play('send');
      }
      stop();
    },
    [conversationId, editingMessage, play, stop],
  );

  const loadOlder = useCallback(async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await messageService.list(conversationId, nextCursor);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => String(m._id || m.id)));
        const newOlder = (data.messages || []).filter((m) => !existingIds.has(String(m._id || m.id)));
        return [...newOlder, ...prev];
      });
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, nextCursor, loadingOlder]);

  if (error && !conversation) {
    return (
      <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
        <EmptyState icon="error" title="Cannot open chat" hint={error} />
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={<><ConversationSidebar /><SidebarFooter /></>}
      rightPanel={
        conversation && (
          <RoomMembersPanel
            conversation={conversation}
            currentUser={user}
            onChanged={(r) => {
              if (r?.deleted || r?.left) router.push('/dashboard');
              else if (r?.cleared) {
                setMessages([]);
                setNextCursor(null);
              }
            }}
          />
        )
      }
    >
      <div className="flex flex-col h-full bg-surface">
        {/* Chat header */}
        <div className="h-16 px-4 border-b border-tertiary/15 bg-surface/95 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container text-tertiary border border-tertiary/20 flex items-center justify-center shrink-0"
              title="Back to conversation list"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(conversationAvatarId(conversation, user))} alt="" className="w-10 h-10 rounded-lg bg-surface-container border-2 border-tertiary pixelated shadow-pixel-sm-solid shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-headline-sm font-bold text-on-surface tracking-tight truncate">
                  {conversationLabel(conversation, user)}
                </h1>
                <Badge tone="green">DIRECT</Badge>
              </div>
              <p className="font-mono text-label-sm text-secondary flex items-center gap-1.5 mt-0.5 min-h-[18px]">
                {isOtherTyping ? (
                  <span className="text-primary font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 bg-primary-container inline-block" />
                    <span>typing...</span>
                  </span>
                ) : (
                  <>
                    <PresencePip online={otherOnline} />
                    <span className="truncate">
                      {other ? (otherOnline ? 'Online' : other.lastSeen ? `Last seen ${timeAgo(other.lastSeen)}` : 'Offline') : '—'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {conversation?.type === 'direct' && other && (
              <>
                <button
                  type="button"
                  onClick={() => startCall({ targetUser: other, conversationId, isVideo: false })}
                  disabled={callState !== 'IDLE'}
                  className="p-2 rounded-lg bg-surface-container hover:bg-secondary-container/50 text-on-surface border-[1.5px] border-[#6E3511]/30 shadow-[1.5px_1.5px_0px_rgba(110,53,17,0.2)] hover:border-[#6E3511] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center transition-all disabled:opacity-40"
                  title="Start Voice Call"
                  aria-label="Start Voice Call"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCall({ targetUser: other, conversationId, isVideo: true })}
                  disabled={callState !== 'IDLE'}
                  className="p-2 rounded-lg bg-surface-container hover:bg-secondary-container/50 text-on-surface border-[1.5px] border-[#6E3511]/30 shadow-[1.5px_1.5px_0px_rgba(110,53,17,0.2)] hover:border-[#6E3511] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center transition-all disabled:opacity-40"
                  title="Start Video Call"
                  aria-label="Start Video Call"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">videocam</span>
                </button>
              </>
            )}
            {conversation && (
              <ConversationActionsMenu
                conversation={conversation}
                currentUser={user}
                onCleared={() => {
                  setMessages([]);
                  setNextCursor(null);
                }}
                onDeleted={() => router.push('/dashboard')}
              />
            )}
            <IconButton icon="info" title="Conversation info" className="hidden xl:inline-flex" onClick={() => {}} />
          </div>
        </div>

        {/* Messages */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col">
            <EmptyState icon="waving_hand" title="Say hello!" hint="This is the beginning of your direct conversation." />
            <div className="mt-auto" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            setMessages={setMessages}
            currentUser={user}
            onLoadOlder={loadOlder}
            hasMore={!!nextCursor}
            loadingOlder={loadingOlder}
            onReplyMessage={(msg) => { setEditingMessage(null); setReplyToMessage(msg); }}
            onStartEditMessage={(msg) => { setReplyToMessage(null); setEditingMessage(msg); }}
          />
        )}

        <TypingIndicator typingUsers={typingUsers} currentUserId={user} />

        {/* Composer */}
        <div className="p-4 border-t border-tertiary/20 bg-surface-container/70 shrink-0 sticky bottom-0 pt-safe-bottom">
          <MessageComposer
            onSend={send}
            disabled={!conversation || loading}
            placeholder={other ? `Message @${other.username}...` : 'Type your message...'}
            onTyping={signal}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
          />
        </div>
      </div>
    </AppShell>
  );
}
