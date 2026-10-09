'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { timeShort, dayLabel } from '@/lib/format';
import { messageService } from '@/services/messageService';
import { avatarSrc, getUserAvatar } from '@/lib/avatars';
import { useSound } from '@/hooks/useSound';
import { MediaLightBoxModal } from '@/components/MediaLightBoxModal';
import { EmojiPicker } from '@/components/EmojiPicker';
import { getSocket } from '@/lib/socket';

const POPULAR_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '😮'];

function getSystemEventConfig(eventType) {
  switch (eventType) {
    case 'member_joined':
      return { icon: 'person_add', iconColor: 'text-primary' };
    case 'member_left':
      return { icon: 'directions_walk', iconColor: 'text-amber-700' };
    case 'member_removed':
      return { icon: 'person_remove', iconColor: 'text-rose-700' };
    case 'member_role_changed':
      return { icon: 'shield_person', iconColor: 'text-primary' };
    case 'owner_transferred':
      return { icon: 'workspace_premium', iconColor: 'text-amber-600' };
    case 'group_name_changed':
      return { icon: 'edit', iconColor: 'text-primary' };
    case 'group_description_changed':
      return { icon: 'edit_note', iconColor: 'text-tertiary' };
    case 'group_photo_changed':
      return { icon: 'add_a_photo', iconColor: 'text-primary' };
    case 'group_photo_removed':
      return { icon: 'hide_image', iconColor: 'text-outline' };
    case 'group_settings_changed':
      return { icon: 'tune', iconColor: 'text-tertiary' };
    case 'room_created':
      return { icon: 'celebration', iconColor: 'text-primary' };
    default:
      return { icon: 'info', iconColor: 'text-tertiary' };
  }
}

function groupReactions(reactions = [], currentUserId) {
  const groups = {};
  for (const r of reactions) {
    if (!r || !r.emoji) continue;
    const uid = String(r.userId?._id || r.userId || '');
    if (!groups[r.emoji]) {
      groups[r.emoji] = {
        emoji: r.emoji,
        count: 0,
        hasMine: false,
        users: [],
      };
    }
    groups[r.emoji].count += 1;
    if (uid && String(currentUserId) === uid) {
      groups[r.emoji].hasMine = true;
    }
    const name = r.userId?.displayName || r.userId?.username || (uid === String(currentUserId) ? 'You' : 'Player');
    groups[r.emoji].users.push(name);
  }
  return Object.values(groups);
}

export function MessageList({
  messages,
  setMessages,
  currentUser,
  onLoadOlder,
  hasMore,
  loadingOlder,
  onReplyMessage,
  onStartEditMessage,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});
  const pickerRef = useRef(null);

  // Jump-free scroll preservation & new-message tracking refs
  const isInitialMountRef = useRef(true);
  const isNearBottomRef = useRef(true);
  const scrollSnapshotRef = useRef(null);
  const prevMessagesRef = useRef({ length: 0, firstId: null, lastId: null });

  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const [activeLightBox, setActiveLightBox] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [reactingMsgId, setReactingMsgId] = useState(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const { play } = useSound();

  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactingMsgId) return undefined;
    const onDocClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setReactingMsgId(null);
        setShowFullEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [reactingMsgId]);

  // Jump-free scroll management using layout DOM measurements
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !messages.length) return;

    const prev = prevMessagesRef.current;
    const currentFirstId = messages[0]?._id || messages[0]?.id;
    const currentLastId = messages[messages.length - 1]?._id || messages[messages.length - 1]?.id;

    // 1. Initial mount: open at bottom
    if (isInitialMountRef.current) {
      el.scrollTop = el.scrollHeight;
      isInitialMountRef.current = false;
      isNearBottomRef.current = true;
    }
    // 2. Older messages prepended (pagination): compensate scroll position exactly
    else if (scrollSnapshotRef.current && prev.firstId !== currentFirstId && messages.length > prev.length) {
      const heightDifference = el.scrollHeight - scrollSnapshotRef.current.scrollHeight;
      el.scrollTop = scrollSnapshotRef.current.scrollTop + heightDifference;
      scrollSnapshotRef.current = null;
    }
    // 3. New message appended at bottom
    else if (prev.lastId !== currentLastId && messages.length > prev.length) {
      if (isNearBottomRef.current) {
        // User was already near bottom: scroll down smoothly/instantly
        el.scrollTop = el.scrollHeight;
        setShowNewMessagesBadge(false);
        setNewMessagesCount(0);
      } else {
        // User was scrolled up reading history: DO NOT jump down, show indicator
        setShowNewMessagesBadge(true);
        setNewMessagesCount((c) => c + 1);
      }
    }

    prevMessagesRef.current = {
      length: messages.length,
      firstId: currentFirstId,
      lastId: currentLastId,
    };
  }, [messages]);

  // Track scroll position: detect near bottom and trigger loading older messages
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 100;
    isNearBottomRef.current = nearBottom;

    if (nearBottom && showNewMessagesBadge) {
      setShowNewMessagesBadge(false);
      setNewMessagesCount(0);
    }

    // Trigger older message load when user approaches top
    if (el.scrollTop < 80 && hasMore && !loadingOlder) {
      scrollSnapshotRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
      };
      onLoadOlder?.();
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    setShowNewMessagesBadge(false);
    setNewMessagesCount(0);
    isNearBottomRef.current = true;
  };

  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    const target = messageRefs.current[msgId];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(msgId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  const remove = async (m) => {
    try {
      await messageService.remove(m._id);
      setMessages((prev) =>
        prev.map((x) => (x._id === m._id ? { ...x, deletedAt: new Date().toISOString(), content: '' } : x)),
      );
      play('click');
    } catch {
      play('error');
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji || !currentUser) return;
    const socket = getSocket();
    play('click');

    const myId = String(currentUser._id || currentUser.id);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if ((msg._id || msg.id) !== messageId) return msg;
        const currentReactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
        const existingIdx = currentReactions.findIndex(
          (r) => String(r.userId?._id || r.userId) === myId && r.emoji === emoji,
        );
        if (existingIdx > -1) {
          currentReactions.splice(existingIdx, 1);
        } else {
          currentReactions.push({
            emoji,
            userId: {
              _id: myId,
              displayName: currentUser.displayName,
              username: currentUser.username,
              avatarId: currentUser.avatarId,
            },
            createdAt: new Date().toISOString(),
          });
        }
        return { ...msg, reactions: currentReactions };
      }),
    );

    // Send via socket with fallback to HTTP API
    if (socket && socket.connected) {
      socket.emit('react_message', { messageId, emoji }, (res) => {
        if (res && res.success && res.data?.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? res.data.message : m)),
          );
        }
      });
    } else {
      try {
        const res = await messageService.react(messageId, emoji);
        if (res && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? res.message : m)),
          );
        }
      } catch (err) {
        console.error('Failed to toggle reaction:', err);
      }
    }
  };

  const renderStatusTicks = (status, mine) => {
    if (!mine) return null;
    const isRead = status === 'read';
    const isDelivered = status === 'delivered';

    return (
      <span
        className={`inline-flex items-center ml-1.5 font-mono text-[11px] font-bold ${
          isRead ? 'text-amber-400' : isDelivered ? 'text-surface-container/80' : 'text-surface-container/50'
        }`}
        title={`Message status: ${status || 'sent'}`}
      >
        {isRead ? '✓✓' : isDelivered ? '✓✓' : '✓'}
      </span>
    );
  };

  const renderReplyQuote = (replyTo, isOuterMine) => {
    if (!replyTo) return null;
    const isDeleted = replyTo.deletedAt;
    const isQuotedMine = currentUser && (replyTo.senderId?._id || replyTo.senderId) === (currentUser._id || currentUser.id);

    let contentSnippet = replyTo.content || '';
    if (!contentSnippet && replyTo.media) {
      contentSnippet = '📷 Photo';
    } else if (replyTo.media && contentSnippet) {
      contentSnippet = `📷 ${contentSnippet}`;
    }

    // Dynamic theme styling for high contrast and pixel aesthetics
    let quoteContainerStyle = '';
    let authorTextStyle = '';
    let snippetTextStyle = '';

    if (isOuterMine) {
      // Outer bubble is YOUR green bubble
      if (!isQuotedMine) {
        // Replying to receiver's message: Light cream card matching receiver's bubble color
        quoteContainerStyle = 'bg-surface-container-lowest/95 border-l-4 border-tertiary text-on-surface shadow-pixel-xs';
        authorTextStyle = 'text-primary font-bold';
        snippetTextStyle = 'text-on-surface font-medium';
      } else {
        // Replying to yourself: Deep dark green contrast quote box inside your green bubble
        quoteContainerStyle = 'bg-black/30 border-l-4 border-surface-container text-surface-container shadow-inner';
        authorTextStyle = 'text-amber-300 font-bold';
        snippetTextStyle = 'text-surface-container/95 font-medium';
      }
    } else {
      // Outer bubble is RECEIVER's light bubble
      if (!isQuotedMine) {
        // Receiver replying to receiver: Light neutral quote box
        quoteContainerStyle = 'bg-surface-container-high/70 border-l-4 border-tertiary text-on-surface';
        authorTextStyle = 'text-tertiary font-bold';
        snippetTextStyle = 'text-on-surface-variant font-medium';
      } else {
        // Receiver replying to YOUR green message: Subtle green tint quote box
        quoteContainerStyle = 'bg-primary-container/25 border-l-4 border-primary text-on-surface';
        authorTextStyle = 'text-primary font-bold';
        snippetTextStyle = 'text-on-surface font-medium';
      }
    }

    return (
      <div
        onClick={() => scrollToMessage(replyTo._id || replyTo.id)}
        className={`mb-2 p-2 rounded-lg cursor-pointer hover:brightness-95 transition-all text-xs font-mono select-none ${quoteContainerStyle}`}
      >
        <span className={`block truncate text-[11px] ${authorTextStyle}`}>
          @{replyTo.senderId?.username || (isQuotedMine ? 'you' : 'player')}
        </span>
        <span className={`truncate block ${snippetTextStyle}`}>
          {isDeleted ? 'Message deleted' : contentSnippet || 'Quoted message'}
        </span>
      </div>
    );
  };

  const handleDownloadImage = async (e, url, fileName = 'image.jpg') => {
    e.stopPropagation();
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\//i)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary hover:text-primary-fixed break-all font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderLinkPreviewCard = (lp) => {
    if (!lp || !lp.url) return null;
    return (
      <a
        href={lp.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block rounded-xl overflow-hidden border border-tertiary/30 bg-surface-container/60 hover:bg-surface-container transition-all group/lp shadow-pixel-xs min-w-[220px] max-w-full font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {lp.image && (
          <div className="relative w-full h-36 bg-black/40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lp.image}
              alt={lp.title || 'Link preview'}
              className="w-full h-full object-cover group-hover/lp:scale-[1.02] transition-transform"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-3 font-mono space-y-1">
          {lp.domain && (
            <div className="flex items-center gap-1 text-[10px] text-tertiary font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[12px]">public</span>
              <span>{lp.domain}</span>
            </div>
          )}
          {lp.title && (
            <p className="text-label-sm font-bold text-on-surface line-clamp-1 group-hover/lp:text-primary transition-colors">
              {lp.title}
            </p>
          )}
          {lp.description && (
            <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
              {lp.description}
            </p>
          )}
        </div>
      </a>
    );
  };

  // Helper to categorize media safely
  const getMediaInfo = (m) => {
    if (!m) return null;
    const media = m.media?.media || m.media || {};
    const url = media.url || media.secure_url || m.mediaUrl || m.url || '';
    if (!url) return null;

    const fileName = media.fileName || m.fileName || 'Photo';
    const size = media.size || m.size || 0;
    const mime = (media.mimeType || m.mimeType || '').toLowerCase();
    const type = (media.type || m.messageType || '').toLowerCase();

    return { url, category: 'image', fileName, size, mime, type };
  };

  const allImageMessages = useMemo(() => {
    return messages
      .filter((m) => !m.deletedAt && getMediaInfo(m)?.url)
      .map((m) => {
        const info = getMediaInfo(m);
        return {
          id: m._id || m.id,
          url: info.url,
          fileName: info.fileName,
          size: info.size,
          mimeType: info.mime,
          type: 'image',
          senderName: m.senderId?.displayName || m.senderId?.username || 'Player',
          senderAvatar: m.senderId,
          createdAt: m.createdAt,
        };
      });
  }, [messages]);

  let lastDay = null;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-4 relative">
      {loadingOlder && (
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-1.5 px-3 mx-auto w-fit bg-surface-container/90 backdrop-blur-sm rounded-full border border-tertiary/20 shadow-pixel-xs font-mono text-label-xs text-on-surface-variant">
          <span className="w-3 h-3 border-2 border-tertiary/30 border-t-primary-container animate-spin rounded-full inline-block" />
          <span>Loading older messages…</span>
        </div>
      )}
      {hasMore && !loadingOlder && (
        <p className="text-center font-mono text-[10px] text-outline py-1">Scroll up for older messages</p>
      )}

      {messages.map((m) => {
        const day = dayLabel(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = currentUser && (m.senderId?._id || m.senderId) === (currentUser._id || currentUser.id);
        const deleted = !!m.deletedAt;
        const msgId = m._id || m.id;
        const isHighlighted = highlightedId === msgId;
        const mediaInfo = !deleted ? getMediaInfo(m) : null;
        const isSystem = m.messageType === 'system';

        // Group emoji reactions for display
        const rawReactions = Array.isArray(m.reactions) ? m.reactions : [];
        const myUidStr = currentUser ? String(currentUser._id || currentUser.id || '') : '';
        const reactionMap = new Map();
        for (const r of rawReactions) {
          if (!r || !r.emoji) continue;
          const rUserId = String(r.userId?._id || r.userId || '');
          const rUserName = r.userId?.displayName || r.userId?.username || 'Player';
          if (!reactionMap.has(r.emoji)) {
            reactionMap.set(r.emoji, {
              emoji: r.emoji,
              count: 0,
              users: [],
              hasMine: false,
            });
          }
          const group = reactionMap.get(r.emoji);
          group.count += 1;
          if (rUserName) {
            group.users.push(rUserName);
          }
          if (myUidStr && rUserId === myUidStr) {
            group.hasMine = true;
          }
        }
        const reactionGroups = Array.from(reactionMap.values());

        if (isSystem) {
          const sysConfig = getSystemEventConfig(m.systemEvent?.eventType);
          const eventText = m.content || `${m.systemEvent?.actorUsername || m.senderId?.username || 'Player'} joined the room`;

          return (
            <div
              key={msgId}
              ref={(el) => {
                if (el) messageRefs.current[msgId] = el;
              }}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 40px' }}
              className={`my-3 flex flex-col items-center justify-center transition-colors ${isHighlighted ? 'bg-primary/10 p-1 ring-2 ring-primary rounded-lg' : ''}`}
            >
              {showDay && (
                <div className="flex items-center justify-center my-2 w-full">
                  <div className="h-[1px] bg-tertiary/15 flex-1 max-w-xs" />
                  <span className="px-4 font-mono text-label-sm text-tertiary bg-surface-container-high py-0.5 rounded-full border border-tertiary/20">
                    {day}
                  </span>
                  <div className="h-[1px] bg-tertiary/15 flex-1 max-w-xs" />
                </div>
              )}

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container/70 border border-tertiary/25 shadow-pixel-xs select-none max-w-[92%] sm:max-w-lg">
                <span className={`material-symbols-outlined text-[15px] ${sysConfig.iconColor} shrink-0`}>
                  {sysConfig.icon}
                </span>
                <span className="font-mono text-label-xs font-semibold text-on-surface-variant truncate">
                  {eventText}
                </span>
                <span className="font-mono text-[10px] text-outline ml-1 shrink-0">
                  {timeShort(m.createdAt)}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msgId}
            ref={(el) => {
              if (el) messageRefs.current[msgId] = el;
            }}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 64px' }}
            className={`transition-colors duration-500 rounded-xl ${isHighlighted ? 'bg-primary/10 p-1 ring-2 ring-primary' : ''}`}
          >
            {showDay && (
              <div className="flex items-center justify-center my-2">
                <div className="h-[1px] bg-tertiary/15 flex-1 max-w-xs" />
                <span className="px-4 font-mono text-label-sm text-tertiary bg-surface-container-high py-0.5 rounded-full border border-tertiary/20">
                  {day}
                </span>
                <div className="h-[1px] bg-tertiary/15 flex-1 max-w-xs" />
              </div>
            )}

            <div className={`flex items-start gap-3 max-w-3xl ${mine ? 'ml-auto flex-row-reverse' : ''}`}>
              {!mine && m.senderId?.username ? (
                <Link
                  href={`/profile/${m.senderId.username}`}
                  title={`View @${m.senderId.username}'s profile`}
                  className="shrink-0 hover:opacity-85 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getUserAvatar(m.senderId)}
                    alt={m.senderId?.displayName || 'player'}
                    className="w-9 h-9 rounded-lg border border-tertiary bg-surface-variant shadow-pixel-sm-solid pixelated object-cover"
                  />
                </Link>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getUserAvatar(m.senderId)}
                  alt={m.senderId?.displayName || 'player'}
                  className="w-9 h-9 rounded-lg border border-tertiary bg-surface-variant shrink-0 shadow-pixel-sm-solid pixelated object-cover"
                />
              )}
              <div className={`space-y-1 min-w-0 max-w-[88%] sm:max-w-xl ${mine ? 'items-end text-right flex flex-col' : ''}`}>
                <div className={`flex items-baseline gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && m.senderId?.username ? (
                    <Link
                      href={`/profile/${m.senderId.username}`}
                      title={`View @${m.senderId.username}'s profile`}
                      className="font-body-md font-bold text-on-surface hover:text-primary transition-colors truncate"
                    >
                      {m.senderId?.displayName || m.senderId?.username || 'Player'}
                    </Link>
                  ) : (
                    <span className="font-body-md font-bold text-on-surface">
                      {mine ? 'You' : m.senderId?.displayName || 'Player'}
                    </span>
                  )}
                  <span className="font-mono text-label-sm text-outline">{timeShort(m.createdAt)}</span>
                </div>

                <div
                  className={`relative group rounded-[14px] p-3 text-left max-w-full break-words ${
                    deleted
                      ? 'bg-surface-container-high text-outline border border-tertiary/15 italic'
                      : mine
                        ? 'bg-primary-container text-surface-container border border-tertiary rounded-br-[4px] shadow-pixel-sm-solid'
                        : 'bg-surface-container-lowest text-on-surface border border-tertiary/20 rounded-bl-[4px] shadow-pixel-sm'
                  }`}
                >
                  {/* Quoted reply banner if present */}
                  {!deleted && renderReplyQuote(m.replyTo, mine)}

                  {/* Media Image Rendering */}
                  {!deleted && mediaInfo && (
                    <div className="mb-2">
                      <div className="relative rounded-xl overflow-hidden border-2 border-tertiary/40 bg-black/30 group/img max-w-full sm:max-w-md shadow-pixel-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaInfo.url && mediaInfo.url.includes('cloudinary.com')
                            ? mediaInfo.url.replace('/upload/', '/upload/c_limit,w_600,q_auto,f_auto/')
                            : mediaInfo.url}
                          alt={mediaInfo.fileName || 'Chat photo'}
                          onClick={() =>
                            setActiveLightBox({
                              id: msgId,
                              url: mediaInfo.url,
                              fileName: mediaInfo.fileName,
                              size: mediaInfo.size,
                              mimeType: mediaInfo.mime,
                              type: 'image',
                              senderName: m.senderId?.displayName || m.senderId?.username || 'Player',
                              senderAvatar: m.senderId,
                              createdAt: m.createdAt,
                            })
                          }
                          className="max-h-96 w-auto max-w-full object-contain rounded-xl cursor-pointer group-hover/img:scale-[1.01] transition-transform"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden p-4 rounded-xl bg-black/60 text-white font-mono text-xs items-center gap-2">
                          <span className="material-symbols-outlined text-amber-400">broken_image</span>
                          <span>Image unavailable</span>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 z-10">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadImage(e, mediaInfo.url, mediaInfo.fileName)}
                            className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all shadow-md"
                            title="Download Image"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Message Content */}
                  {deleted ? (
                    <p className="font-mono text-xs text-outline italic">This message was deleted</p>
                  ) : m.content ? (
                    <div className="font-body-md whitespace-pre-wrap break-words">
                      {renderTextWithLinks(m.content)}
                    </div>
                  ) : null}

                  {/* Link Preview Card */}
                  {!deleted && renderLinkPreviewCard(m.linkPreview)}

                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    {(m.edited || m.editedAt) && !deleted && (
                      <span className={`font-mono text-[9px] ${mine ? 'text-surface-container/70' : 'text-outline'}`}>
                        (edited)
                      </span>
                    )}
                    {/* Status ticks for outgoing messages */}
                    {!deleted && renderStatusTicks(m.status, mine)}
                  </div>
                </div>

                {/* Reaction Badges */}
                {!deleted && reactionGroups.length > 0 && (
                  <div className={`flex flex-wrap items-center gap-1.5 pt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {reactionGroups.map((group) => (
                      <button
                        key={group.emoji}
                        type="button"
                        onClick={() => handleToggleReaction(msgId, group.emoji)}
                        title={group.users.join(', ')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono transition-all press select-none ${
                          group.hasMine
                            ? 'bg-secondary-container text-primary border-[1.5px] border-secondary shadow-pixel-xs font-bold'
                            : 'bg-surface-container-high/90 hover:bg-surface-container text-on-surface border border-tertiary/20 shadow-pixel-xs'
                        }`}
                      >
                        <span className="text-[13px] leading-none">{group.emoji}</span>
                        <span className="text-[11px] leading-none font-bold">{group.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Message action bar (React, Reply, Edit, Delete) */}
                {!deleted && (
                  <div className={`flex items-center gap-2 pt-1 font-mono text-[11px] text-tertiary ${mine ? 'justify-end' : ''}`}>
                    {/* Emoji Reaction Trigger & Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setReactingMsgId(reactingMsgId === msgId ? null : msgId)}
                        className="hover:text-primary font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors"
                        title="React with emoji"
                      >
                        <span className="material-symbols-outlined text-[14px]">add_reaction</span>
                        <span>React</span>
                      </button>

                      {reactingMsgId === msgId && (
                        <div
                          ref={pickerRef}
                          className={`absolute z-30 bottom-full mb-1.5 ${mine ? 'right-0' : 'left-0'} flex flex-col gap-1.5`}
                        >
                          {showFullEmojiPicker ? (
                            <EmojiPicker
                              align={mine ? 'right' : 'left'}
                              onSelect={(emoji) => {
                                handleToggleReaction(msgId, emoji);
                                setReactingMsgId(null);
                                setShowFullEmojiPicker(false);
                              }}
                              onClose={() => {
                                setReactingMsgId(null);
                                setShowFullEmojiPicker(false);
                              }}
                            />
                          ) : (
                            <div className="flex items-center gap-1 p-1 bg-surface-container-lowest border-[1.5px] border-tertiary/40 rounded-xl shadow-pixel-md backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
                              {POPULAR_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    handleToggleReaction(msgId, emoji);
                                    setReactingMsgId(null);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-[18px] hover:scale-125 hover:bg-surface-container rounded-lg transition-transform press cursor-pointer select-none"
                                  title={`React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <div className="w-[1px] h-5 bg-tertiary/20 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => setShowFullEmojiPicker(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-tertiary hover:text-primary hover:bg-surface-container transition-colors press"
                                title="More emoji reactions"
                              >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onReplyMessage?.(m)}
                      className="hover:text-primary font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors"
                      title="Reply to message"
                    >
                      <span className="material-symbols-outlined text-[14px]">reply</span>
                      <span>Reply</span>
                    </button>
                    {mine && (
                      <button
                        type="button"
                        onClick={() => onStartEditMessage?.(m)}
                        className="hover:text-amber-600 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors"
                        title="Edit message content"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Edit</span>
                      </button>
                    )}
                    {mine && (
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        className="hover:text-error font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-surface-container transition-colors"
                        title="Delete message"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* Floating "↓ New messages" indicator badge */}
      {showNewMessagesBadge && (
        <div className="sticky bottom-2 z-20 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-container text-surface-container font-mono text-label-xs font-bold border-2 border-tertiary shadow-pixel-sm-solid animate-bounce press hover:bg-primary transition-all"
            title="Scroll to newest messages"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            <span>↓ New {newMessagesCount > 1 ? `messages (${newMessagesCount})` : 'message'}</span>
          </button>
        </div>
      )}
      <div ref={bottomRef} />

      {/* Lightbox Modal */}
      {activeLightBox && (
        <MediaLightBoxModal
          open={!!activeLightBox}
          onClose={() => setActiveLightBox(null)}
          media={activeLightBox}
          allMedia={allImageMessages}
          onSelectMedia={(selectedMedia) => setActiveLightBox(selectedMedia)}
        />
      )}
    </div>
  );
}

/** Typing indicator with 3 animated square pixel dots. */
export function TypingIndicator({ typingUsers, currentUserId }) {
  const myId = String(currentUserId?._id || currentUserId?.id || '');
  const users = Object.entries(typingUsers || {}).filter(([id]) => id && String(id) !== myId);
  if (users.length === 0) return null;

  const names = users.map(([, u]) => u?.displayName || u?.username || 'Player');
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-space-sm pl-4 pt-1 pb-2 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="w-7 h-7 rounded-md bg-surface-container-high border border-tertiary/20 flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_rgba(110,53,17,0.1)]">
        <span className="material-symbols-outlined text-[16px] text-tertiary">chat</span>
      </div>
      <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-tertiary/15 shadow-[1px_1px_0_0_rgba(110,53,17,0.08)]">
        <span className="font-label-sm text-label-sm font-semibold text-on-surface-variant">{label}</span>
        {/* 3 animated square pixel dots */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-primary-container pixel-pulse-1 inline-block" />
          <span className="w-1.5 h-1.5 bg-secondary pixel-pulse-2 inline-block" />
          <span className="w-1.5 h-1.5 bg-primary-fixed-dim pixel-pulse-3 inline-block" />
        </div>
      </div>
    </div>
  );
}
