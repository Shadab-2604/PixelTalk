/**
 * File: page.jsx (Community Room View)
 *
 * Responsibility:
 * Active community group lounge view:
 * - Real-time Socket.IO room subscription (`conversation:<id>`)
 * - Passcode prompt barrier for protected private rooms
 * - Message stream pagination, transmission, in-place edit, and soft-delete
 * - Multi-user typing indicator broadcast and display
 * - Right panel member roster and room administration launcher
 *
 * Layer:
 * Frontend / Rooms Pages
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
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell, SidebarFooter } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';
import { MessageList, TypingIndicator } from '@/features/messages/MessageList';
import { MessageComposer } from '@/features/messages/MessageComposer';
import { RoomMembersPanel } from '@/features/rooms/RoomMembersPanel';
import { ConversationActionsMenu } from '@/features/conversations/ConversationActionsMenu';
import { getSocket } from '@/lib/socket';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTyping } from '@/hooks/useTyping';
import { useSound } from '@/hooks/useSound';
import { usePresence } from '@/hooks/usePresence';
import { useCall } from '@/features/calls/CallContext';
import { avatarSrc } from '@/lib/avatars';
import { Badge, IconButton, PresencePip, EmptyState, Spinner, PasswordInput } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { showDesktopNotification, triggerVibration } from '@/lib/notifications';

export default function RoomPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const { play } = useSound();
  const { isOnline } = usePresence();
  const { typingUsers, signal, stop } = useTyping(conversationId);
  const { startGroupCall, joinGroupCall, activeGroupCalls, callState } = useCall();

  const [conversation, setConversation] = useState(null);
  const [notMember, setNotMember] = useState(false);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const socketRef = useRef(null);

  const activeTypingMembers = useMemo(() => {
    const myId = String(user?._id || user?.id || '');
    return Object.entries(typingUsers || {}).filter(([id]) => id && String(id) !== myId);
  }, [typingUsers, user]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotMember(false);
    try {
      const c = await conversationService.get(conversationId);
      const m = await messageService.list(conversationId);
      setConversation(c.conversation);
      setMessages(m.messages || []);
      setNextCursor(m.nextCursor);
      messageService.markRead(conversationId).catch(() => {});
    } catch (err) {
      if (err.status === 403) setNotMember(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime wiring (only when a member)
  useEffect(() => {
    if (!conversation) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    socketRef.current = socket;
    socket.emit('join_conversation', { conversationId });
    socket.emit('mark_read', { conversationId });
    socket.emit('call:group_get_active', { conversationId });

    const onNewMessage = (p) => {
      if (String(p.message.conversationId) !== String(conversationId)) return;
      const msg = p.message;
      const senderId = msg.senderId?._id || msg.senderId;
      setMessages((prev) => (prev.some((x) => x._id === msg._id) ? prev : [...prev, msg]));
      if (String(senderId) !== String(user?._id || user?.id)) {
        socket.emit('mark_read', { conversationId });
        const isMuted = (user?.mutedConversations || []).some((id) => String(id?._id || id) === String(conversationId));
        const shouldVibrate = (user?.vibrateConversations || []).some((id) => String(id?._id || id) === String(conversationId));
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
      setMessages((prev) => prev.map((x) => (x._id === (p.message?._id || p.messageId) ? { ...(p.message || x), deletedAt: p.message?.deletedAt || new Date().toISOString(), content: p.message?.content ?? '' } : x)));
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
    const onGroupUpdated = (p) => {
      if (String(p.conversation?._id) === String(conversationId)) setConversation(p.conversation);
    };
    const onRoomUpdated = (p) => {
      if (String(p.conversation?._id) === String(conversationId)) setConversation(p.conversation);
    };
    const onMemberRemoved = (p) => {
      if (String(p.userId) === String(user?._id || user?.id)) {
        router.push('/dashboard');
      } else {
        setConversation((prev) => prev && { ...prev, members: (prev.members || []).filter((m) => (m._id || m) !== p.userId) });
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_updated', onUpdated);
    socket.on('message_deleted', onDeleted);
    socket.on('message_read', onRead);
    socket.on('message_delivered', onDelivered);
    socket.on('group_updated', onGroupUpdated);
    socket.on('room_updated', onRoomUpdated);
    socket.on('member_removed', onMemberRemoved);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.emit('typing_stop', { conversationId });
      socket.off('new_message', onNewMessage);
      socket.off('message_updated', onUpdated);
      socket.off('message_deleted', onDeleted);
      socket.off('message_read', onRead);
      socket.off('message_delivered', onDelivered);
      socket.off('group_updated', onGroupUpdated);
      socket.off('room_updated', onRoomUpdated);
      socket.off('member_removed', onMemberRemoved);
    };
  }, [conversation, conversationId, user, play, router]);

  const currentUserId = user?._id || user?.id;
  const isOwner =
    conversation?.createdBy &&
    String(conversation.createdBy._id || conversation.createdBy) === String(currentUserId);
  const isAdmin =
    isOwner ||
    (Array.isArray(conversation?.admins) &&
      conversation.admins.some((a) => String(a._id || a) === String(currentUserId)));

  const isAdminOnlyChat = conversation?.settings?.adminOnlyChat === true;
  const canSend = !isAdminOnlyChat || isAdmin;

  const send = useCallback(
    (payload) => {
      if (!canSend) {
        setError('Only group admins can send messages.');
        play('error');
        return;
      }
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
    [conversationId, editingMessage, play, stop, canSend],
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
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, nextCursor, loadingOlder]);

  if (notMember) {
    return <JoinGate conversationId={conversationId} onJoined={load} />;
  }

  if (error && !conversation) {
    return (
      <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
        <EmptyState icon="error" title="Cannot open room" hint={error} />
      </AppShell>
    );
  }

  const onlineCount = (conversation?.members || []).filter((m) => isOnline(m._id || m.id)).length;

  return (
    <AppShell
      wide
      sidebar={<><ConversationSidebar /><SidebarFooter /></>}
      rightDrawerOpen={infoDrawerOpen}
      onCloseRightDrawer={() => setInfoDrawerOpen(false)}
      rightPanel={
        conversation && (
          <RoomMembersPanel
            conversation={conversation}
            currentUser={user}
            onChanged={(r) => {
              if (r?.deleted || r?.left) router.push('/rooms');
              else if (r?.cleared) {
                setMessages([]);
                setNextCursor(null);
              }
            }}
          />
        )
      }
    >
      <div className="flex flex-col h-full min-h-0 bg-surface">
        {/* Room header */}
        <div className="h-16 px-3 sm:px-4 border-b border-tertiary/15 bg-surface/95 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/rooms')}
              className="lg:hidden p-1.5 rounded-lg hover:bg-surface-container text-tertiary border border-tertiary/20 flex items-center justify-center shrink-0"
              title="Back to room list"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(conversation?.avatarId || 'avatar-06')} alt="" className="w-10 h-10 rounded-lg bg-surface-container border-2 border-tertiary pixelated shadow-pixel-sm-solid shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-headline-sm font-bold text-on-surface tracking-tight truncate">{conversation?.name || 'Room'}</h1>
                <Badge tone="green">{conversation?.privacy === 'private' ? 'LOBBY' : 'ROOM'}</Badge>
              </div>
              <p className="font-mono text-label-sm text-secondary flex items-center gap-1.5 mt-0.5 min-h-[18px]">
                {activeTypingMembers.length > 0 ? (
                  <span className="text-primary font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 bg-primary-container inline-block" />
                    <span>
                      {activeTypingMembers.length === 1
                        ? `${activeTypingMembers[0][1]?.displayName || 'Someone'} is typing...`
                        : `${activeTypingMembers.length} players typing...`}
                    </span>
                  </span>
                ) : (
                  <>
                    <PresencePip online={onlineCount > 0} />
                    <span className="truncate">{conversation?.members?.length || 0} players • {onlineCount} online</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {conversation && (
              <>
                <button
                  type="button"
                  onClick={() => startGroupCall({ conversationId, isVideo: false, conversationName: conversation.name })}
                  disabled={callState !== 'IDLE'}
                  className="p-2 rounded-lg bg-surface-container hover:bg-secondary-container/50 text-on-surface border-[1.5px] border-[#6E3511]/30 shadow-[1.5px_1.5px_0px_rgba(110,53,17,0.2)] hover:border-[#6E3511] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center transition-all disabled:opacity-40"
                  title="Start Group Voice Call"
                  aria-label="Start Group Voice Call"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                </button>
                <button
                  type="button"
                  onClick={() => startGroupCall({ conversationId, isVideo: true, conversationName: conversation.name })}
                  disabled={callState !== 'IDLE'}
                  className="p-2 rounded-lg bg-surface-container hover:bg-secondary-container/50 text-on-surface border-[1.5px] border-[#6E3511]/30 shadow-[1.5px_1.5px_0px_rgba(110,53,17,0.2)] hover:border-[#6E3511] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center transition-all disabled:opacity-40"
                  title="Start Group Video Call"
                  aria-label="Start Group Video Call"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">videocam</span>
                </button>
                <ConversationActionsMenu
                  conversation={conversation}
                  currentUser={user}
                  onCleared={() => {
                    setMessages([]);
                    setNextCursor(null);
                  }}
                  onDeleted={() => router.push('/rooms')}
                />
              </>
            )}
            <IconButton
              icon="info"
              title="Room info"
              onClick={() => setInfoDrawerOpen((o) => !o)}
            />
          </div>
        </div>

        {/* Live Active Group Call Banner */}
        {activeGroupCalls[String(conversationId)] && (
          <div className="bg-secondary-container/95 border-b-2 border-primary/40 px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_2px_0px_0px_rgba(66,96,16,0.15)] animate-fade-in shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary text-surface-container flex items-center justify-center border border-tertiary shadow-[1px_1px_0px_#6E3511] shrink-0">
                <span className="material-symbols-outlined text-[18px] animate-pulse">
                  {activeGroupCalls[String(conversationId)].callType === 'video' ? 'videocam' : 'call'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-on-secondary-container">
                  <span className="w-2 h-2 bg-primary rounded-none animate-ping inline-block" />
                  <span>
                    LIVE {activeGroupCalls[String(conversationId)].callType === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-tertiary truncate">
                  {activeGroupCalls[String(conversationId)].participantCount ||
                    (activeGroupCalls[String(conversationId)].participants || []).length ||
                    1}{' '}
                  players connected
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                joinGroupCall({
                  conversationId,
                  isVideo: activeGroupCalls[String(conversationId)].callType === 'video',
                  conversationName: conversation?.name,
                })
              }
              disabled={callState !== 'IDLE'}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-surface-container font-mono text-[11px] font-bold border border-tertiary shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 shrink-0 press disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>
                JOIN {activeGroupCalls[String(conversationId)].callType === 'video' ? 'VIDEO' : 'CALL'}
              </span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <EmptyState icon="forum" title="The room is quiet" hint="Be the first to break the silence." />
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

        <div className="p-3 sm:p-4 border-t border-tertiary/20 bg-surface-container/70 shrink-0">
          <MessageComposer
            onSend={send}
            disabled={!conversation || loading}
            disabledMessage={!canSend ? 'Only group admins can send messages.' : undefined}
            placeholder={conversation ? `Type your message in #${conversation.name?.toLowerCase().replace(/\s+/g, '-')}...` : 'Type your message...'}
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

/** Shown when the API says you are not a member: try passcode join. */
function JoinGate({ conversationId, onJoined }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await conversationService.join(conversationId, passcode);
      onJoined();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
      <div className="h-full flex items-center justify-center p-6">
        <form onSubmit={join} className="w-full max-w-md bg-surface-container-lowest border-2 border-tertiary/30 rounded-2xl shadow-pixel-md p-7 space-y-4">
          <div>
            <Badge tone="green">PRIVATE ROOM</Badge>
            <h1 className="font-display text-headline-lg font-bold text-on-surface mt-2">Passcode required</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">This room is protected. Enter the passcode to join.</p>
          </div>
          <PasswordInput
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Room passcode"
            required
            minLength={4}
            className="bg-surface"
          />
          {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-primary-container text-surface-container font-display font-bold rounded-[10px] border-[1.5px] border-tertiary shadow-pixel-sm-solid hover:bg-primary press disabled:opacity-50"
          >
            {busy ? 'JOINING…' : 'JOIN ROOM'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
