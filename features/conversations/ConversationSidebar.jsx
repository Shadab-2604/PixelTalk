/**
 * File: ConversationSidebar.jsx
 *
 * Responsibility:
 * Renders the persistent messaging conversation inbox list:
 * - Direct chats and community group lounges
 * - Custom Chat Folders & Locked Folders system (PIN/password protected)
 * - Real-time unread badges, typing status, and online presence indicators
 * - Conversation pinning, muting, and vibration preference toggles
 * - "Start a chat" modal dialog (`StartChatModal`) for player discovery
 * - Folder CRUD, Lock/Unlock session lifecycle, and responsive retro pixel layout
 *
 * Layer:
 * Frontend / Conversation Features
 */

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import { chatSectionService } from '@/services/chatSectionService';
import { useFloatingMenuPosition } from '@/hooks/useFloatingMenuPosition';
import {
  conversationLabel,
  conversationAvatarId,
  conversationSubtitle,
  otherMember,
} from '@/features/conversations/conversationUtils';
import { ConversationActionsMenu } from '@/features/conversations/ConversationActionsMenu';
import {
  Avatar,
  Badge,
  Input,
  ErrorText,
  EmptyState,
  Modal,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  Field,
  Spinner,
} from '@/components/ui';
import { avatarSrc } from '@/lib/avatars';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';

function conversationHref(c) {
  return c.type === 'group' ? `/rooms/${c._id}` : `/chat/${c._id}`;
}

export function ConversationSidebar() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { play } = useSound();
  const [convos, setConvos] = useState([]);
  const [sections, setSections] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [unlockedSections, setUnlockedSections] = useState(new Set());

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModal, setRenameModal] = useState({ open: false, section: null });
  const [lockModal, setLockModal] = useState({ open: false, section: null, mode: 'SET' }); // 'SET', 'CHANGE', 'REMOVE'
  const [unlockModal, setUnlockModal] = useState({ open: false, section: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, section: null });

  // Invitations
  const [invitations, setInvitations] = useState([]);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  // General sidebar state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'direct', 'group', or folderId
  const [selectedFolderId, setSelectedFolderId] = useState(null); // When focusing on a specific folder
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], rooms: [], isSearching: false });
  const [searchLoading, setSearchLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [busyPinId, setBusyPinId] = useState(null);
  const [typingConvos, setTypingConvos] = useState({});
  const { isOnline } = usePresence();

  const activeConversationId = useMemo(() => {
    const match = pathname ? pathname.match(/^\/(?:chat|rooms)\/([^/?#]+)/) : null;
    return match ? match[1] : null;
  }, [pathname]);

  const loadSections = async () => {
    try {
      const data = await chatSectionService.list();
      setSections(data.sections || []);
    } catch {
      /* ignore */
    }
  };

  const loadInvitations = async () => {
    try {
      const data = await conversationService.getMyInvitations();
      setInvitations(data.invitations || []);
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    try {
      const data = await conversationService.list();
      setConvos(data.conversations || []);
      loadInvitations();
      loadSections();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollapse = (section) => {
    const sectionId = String(section._id);
    const isLocked = section.isLocked || section.hasPasscode;
    const isUnlocked = unlockedSections.has(sectionId);

    // If folder is locked and user is expanding it while not yet unlocked in session, prompt unlock dialog
    if (isLocked && !isUnlocked && collapsedSections.has(sectionId)) {
      setUnlockModal({ open: true, section });
      return;
    }

    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleFolderClick = (section) => {
    const sectionId = String(section._id);
    const isLocked = section.isLocked || section.hasPasscode;
    const isUnlocked = unlockedSections.has(sectionId);

    if (isLocked && !isUnlocked) {
      setUnlockModal({ open: true, section });
      return;
    }

    // Toggle folder focus filter or expand
    if (selectedFolderId === sectionId) {
      setSelectedFolderId(null);
    } else {
      setSelectedFolderId(sectionId);
      // Auto expand when selected
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  const handleRelockFolder = (sectionId) => {
    play('click');
    setUnlockedSections((prev) => {
      const next = new Set(prev);
      next.delete(String(sectionId));
      return next;
    });
    // Auto collapse
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.add(String(sectionId));
      return next;
    });
  };

  const handleRespondInvitation = async (invitationId, action, convoId) => {
    setActionBusyId(invitationId);
    try {
      await conversationService.respondToInvitation(invitationId, action);
      setInvitations((prev) => prev.filter((i) => (i._id || i.id) !== invitationId));
      if (action === 'ACCEPT') {
        play('room-created');
        await load();
        if (convoId) router.push(`/rooms/${convoId}`);
      } else {
        play('click');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusyId(null);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    const onAccountSwitched = () => {
      load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pixeltalk:account_switched', onAccountSwitched);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pixeltalk:account_switched', onAccountSwitched);
    };
  }, [user?._id]);

  // Realtime conversation updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewMessage = (payload) => {
      if (!payload || !payload.conversationId) {
        load();
        return;
      }
      const convoId = String(payload.conversationId);
      setConvos((prev) => {
        const idx = prev.findIndex((c) => String(c._id) === convoId);
        if (idx === -1) {
          load();
          return prev;
        }

        const existing = prev[idx];
        const isActive = activeConversationId === convoId;
        const updated = {
          ...existing,
          lastMessage: payload.message || existing.lastMessage,
          unreadCount: isActive ? 0 : (existing.unreadCount || 0) + 1,
          updatedAt: payload.message?.createdAt || new Date().toISOString(),
        };

        const next = [...prev];
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      });
    };

    const onChatCleared = (payload) => {
      if (!payload || !payload.conversationId) return;
      const convoId = String(payload.conversationId);
      setConvos((prev) =>
        prev.map((c) => (String(c._id) === convoId ? { ...c, lastMessage: null, unreadCount: 0 } : c)),
      );
    };

    const onChatDeleted = (payload) => {
      if (!payload || !payload.conversationId) return;
      const convoId = String(payload.conversationId);
      setConvos((prev) => prev.filter((c) => String(c._id) !== convoId));
    };

    const onInvitation = () => {
      loadInvitations();
    };

    const onTypingStart = (p) => {
      if (!p || !p.conversationId || !p.userId) return;
      const cId = String(p.conversationId);
      setTypingConvos((prev) => ({
        ...prev,
        [cId]: { ...(prev[cId] || {}), [p.userId]: p.user || { displayName: 'Player' } },
      }));
    };

    const onTypingStop = (p) => {
      if (!p || !p.conversationId || !p.userId) return;
      const cId = String(p.conversationId);
      setTypingConvos((prev) => {
        if (!prev[cId]) return prev;
        const nextForConvo = { ...prev[cId] };
        delete nextForConvo[p.userId];
        if (Object.keys(nextForConvo).length === 0) {
          const next = { ...prev };
          delete next[cId];
          return next;
        }
        return { ...prev, [cId]: nextForConvo };
      });
    };

    socket.on('new_message', onNewMessage);
    socket.on('chat_cleared', onChatCleared);
    socket.on('chat_deleted', onChatDeleted);
    socket.on('group_invitation_received', onInvitation);
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('chat_cleared', onChatCleared);
      socket.off('chat_deleted', onChatDeleted);
      socket.off('group_invitation_received', onInvitation);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [activeConversationId]);

  // Search routing
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults({ users: [], rooms: [], isSearching: false });
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);
    const isRoomSearch = q.startsWith('#');
    const searchTerm = isRoomSearch ? q.slice(1).trim() : q;

    const timer = setTimeout(async () => {
      try {
        if (isRoomSearch) {
          if (!searchTerm) {
            setSearchResults({ users: [], rooms: [], isSearching: true, isRoomSearch: true });
          } else {
            const data = await conversationService.search(searchTerm);
            setSearchResults({ users: [], rooms: data.rooms || [], isSearching: true, isRoomSearch: true });
          }
        } else {
          const data = await userService.search(searchTerm);
          setSearchResults({ users: data.users || [], rooms: [], isSearching: true, isRoomSearch: false });
        }
      } catch {
        setSearchResults({ users: [], rooms: [], isSearching: true, isRoomSearch });
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const pinnedIds = useMemo(() => {
    return new Set((user?.pinnedConversations || []).map((id) => (id?._id ? id._id.toString() : id?.toString())));
  }, [user]);

  const togglePin = async (e, conversationId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!conversationId || busyPinId) return;
    setBusyPinId(conversationId);
    play('click');
    try {
      const res = await userService.togglePin(conversationId);
      if (res && res.pinnedConversations && user) {
        setUser({ ...user, pinnedConversations: res.pinnedConversations });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyPinId(null);
    }
  };

  const handleConversationCleared = (convoId) => {
    setConvos((prev) =>
      prev.map((c) =>
        String(c._id) === String(convoId)
          ? { ...c, lastMessage: null, unreadCount: 0 }
          : c
      )
    );
    load();
  };

  const handleConversationDeleted = (convoId) => {
    setConvos((prev) => prev.filter((c) => String(c._id) !== String(convoId)));
    load();
  };

  const handleConversationMoved = (convoId, sectionId) => {
    setConvos((prev) =>
      prev.map((c) =>
        String(c._id) === String(convoId) ? { ...c, sectionId } : c
      )
    );
    load();
  };

  const handleConversationMuteToggled = async () => {
    try {
      const u = await userService.me();
      if (u && u.user) setUser(u.user);
    } catch {
      load();
    }
  };

  const handleConversationReadToggled = (convoId, count) => {
    setConvos((prev) =>
      prev.map((c) =>
        String(c._id) === String(convoId) ? { ...c, unreadCount: count } : c
      )
    );
  };

  const startDirectFromSearch = async (targetUserId) => {
    play('click');
    try {
      const res = await conversationService.startDirect(targetUserId);
      setQuery('');
      setSearchResults({ users: [], rooms: [], isSearching: false });
      load();
      router.push(`/chat/${res.conversation._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  // Organize conversations into pinned, custom folders, and unassigned
  const { pinnedList, sectionGroups, unassignedList } = useMemo(() => {
    let list = convos;
    if (filter === 'direct') list = list.filter((c) => c.type === 'direct');
    if (filter === 'group') list = list.filter((c) => c.type === 'group');

    const pinned = [];
    const rest = [];

    for (const c of list) {
      if (pinnedIds.has(c._id?.toString())) {
        pinned.push(c);
      } else {
        rest.push(c);
      }
    }

    const sectionMap = new Map();
    for (const s of sections) {
      sectionMap.set(String(s._id), { section: s, convos: [] });
    }

    const unassigned = [];
    for (const c of rest) {
      const sId = c.sectionId ? String(c.sectionId) : null;
      if (sId && sectionMap.has(sId)) {
        sectionMap.get(sId).convos.push(c);
      } else {
        unassigned.push(c);
      }
    }

    return {
      pinnedList: pinned,
      sectionGroups: Array.from(sectionMap.values()),
      unassignedList: unassigned,
    };
  }, [convos, filter, pinnedIds, sections]);

  const unread = convos.reduce((n, c) => n + (c.unreadCount || 0), 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary/60 text-[18px]">
            {query.startsWith('#') ? 'tag' : 'search'}
          </span>
          <Input
            className="pl-9 pr-8 py-1.5 rounded-lg border border-tertiary/25 font-mono text-label-sm bg-surface-container-lowest"
            placeholder="Search players or #rooms..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary/60 hover:text-tertiary text-xs p-1"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Global Live Search Results Panel */}
        {searchResults.isSearching && (
          <div className="bg-surface-container-lowest border border-tertiary/30 rounded-xl p-3 shadow-pixel-sm space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-tertiary/15">
              <span className="font-mono text-[11px] font-bold uppercase text-tertiary tracking-wider">
                {searchResults.isRoomSearch ? 'Room Search (#)' : 'Player Search'}
              </span>
              {searchLoading && <span className="font-mono text-[10px] text-primary animate-pulse">Searching…</span>}
            </div>

            {searchLoading ? (
              <p className="font-mono text-label-sm text-on-surface-variant py-2 text-center">Looking up live records…</p>
            ) : searchResults.isRoomSearch ? (
              searchResults.rooms.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {searchResults.rooms.map((r) => {
                    const isMember = (r.members || []).some((m) => (m._id || m) === (user?._id || user?.id));
                    return (
                      <Link
                        key={r._id}
                        href={`/rooms/${r._id}`}
                        onClick={() => {
                          setQuery('');
                          setSearchResults({ users: [], rooms: [], isSearching: false });
                        }}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-tertiary/15 hover:border-tertiary transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatarSrc(r.avatarId || 'avatar-06')}
                            alt=""
                            className="w-8 h-8 rounded-lg pixelated border border-tertiary/30 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-display text-[13px] font-bold text-on-surface truncate">#{r.name}</p>
                            <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                              {r.description || `${r.memberCount || 0} players`}
                            </p>
                          </div>
                        </div>
                        <Badge tone={isMember ? 'deep' : 'green'}>{isMember ? 'OPEN' : 'JOIN'}</Badge>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="font-mono text-label-sm text-on-surface-variant py-2 text-center">NO ROOMS FOUND</p>
              )
            ) : searchResults.users.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {searchResults.users.map((u) => {
                  const online = isOnline(u.id || u._id);
                  return (
                    <div
                      key={u.id || u._id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-tertiary/15 hover:border-tertiary transition-all"
                    >
                      <Link
                        href={`/profile/${u.username}`}
                        onClick={() => {
                          setQuery('');
                          setSearchResults({ users: [], rooms: [], isSearching: false });
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition-opacity cursor-pointer"
                        title={`View @${u.username}'s profile`}
                      >
                        <Avatar src={avatarSrc(u.avatarId)} alt={u.displayName} size={32} online={online} />
                        <div className="min-w-0">
                          <p className="font-display text-[13px] font-bold text-on-surface truncate">{u.displayName}</p>
                          <p className="font-mono text-[11px] text-tertiary truncate">@{u.username}</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => startDirectFromSearch(u.id || u._id)}
                        className="px-2.5 py-1 bg-primary-container text-surface-container font-mono text-[11px] font-bold rounded border border-tertiary hover:bg-primary transition-all shrink-0 cursor-pointer"
                      >
                        MESSAGE
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-label-sm text-on-surface-variant py-2 text-center">NO PLAYERS FOUND</p>
            )}
          </div>
        )}

        {/* Sidebar Nav */}
        <nav className="flex flex-col gap-1">
          <SidebarLink href="/dashboard" icon="home" label="Home" />
          <SidebarLink href="/chat" icon="chat_bubble" label="Messages" badge={unread > 0 ? unread : null} />
          <SidebarLink href="/rooms" icon="group" label="Rooms" count={convos.filter((c) => c.type === 'group').length} />
          <SidebarLink href="/profile" icon="person" label="Profile" />
          <SidebarLink href="/settings" icon="settings" label="Settings" />
        </nav>

        <button
          onClick={() => setNewOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-surface-container-high border-[1.5px] border-tertiary text-tertiary font-mono text-label-lg font-bold py-2 rounded-lg shadow-pixel-sm hover:bg-secondary-container/30 press"
        >
          <span className="material-symbols-outlined text-[18px]">edit_square</span>
          <span>New Chat</span>
        </button>

        {invitations.length > 0 && (
          <button
            type="button"
            onClick={() => setInvitationsOpen(true)}
            className="w-full flex items-center justify-between p-2.5 bg-secondary-container text-on-secondary-container rounded-lg border border-tertiary/40 shadow-pixel-xs hover:brightness-105 transition-all text-left press"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
              <span className="font-mono text-label-xs font-bold uppercase">Room Invitations</span>
            </div>
            <Badge tone="deep">{invitations.length} New</Badge>
          </button>
        )}

        <div className="pt-2 space-y-3">
          {/* TALKS Header & Filter Buttons */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-label-sm uppercase tracking-wider text-tertiary font-bold">Talks</span>
              {unread > 0 && <Badge tone="outline">{unread} Unread</Badge>}
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1 font-mono text-[10px] text-primary hover:text-tertiary font-bold uppercase py-0.5 px-2 rounded bg-surface border border-tertiary/25 hover:bg-secondary-container/30 transition-all shadow-pixel-xs press"
              title="Create custom chat folder"
            >
              <span className="material-symbols-outlined text-[13px]">create_new_folder</span>
              <span>+ Folder</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-1">
            {['all', 'direct', 'group'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setSelectedFolderId(null);
                }}
                className={`px-2.5 py-1 rounded font-mono text-label-sm font-bold border transition-all ${
                  filter === f && selectedFolderId === null
                    ? 'bg-secondary-container text-on-secondary-container border-tertiary/30 shadow-pixel-xs'
                    : 'border-transparent text-on-surface-variant hover:border-tertiary/20'
                }`}
              >
                {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : 'Squads'}
              </button>
            ))}
          </div>

          {error && <ErrorText>{error}</ErrorText>}
          {loading && <p className="font-mono text-label-sm text-on-surface-variant px-1 py-3">Loading conversations…</p>}

          {/* PINNED CONVERSATIONS */}
          {!loading && pinnedList.length > 0 && selectedFolderId === null && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-primary">
                <span className="material-symbols-outlined text-[14px]">keep</span>
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Pinned ({pinnedList.length})</span>
              </div>
              {pinnedList.map((c) => (
                <ConversationRow
                  key={c._id}
                  c={c}
                  user={user}
                  isOnline={isOnline}
                  isPinned={true}
                  onTogglePin={togglePin}
                  busyPinId={busyPinId}
                  typingUsers={typingConvos[c._id]}
                  onCleared={handleConversationCleared}
                  onDeleted={handleConversationDeleted}
                  onSectionMoved={handleConversationMoved}
                  onToggledMute={handleConversationMuteToggled}
                  onToggledRead={handleConversationReadToggled}
                />
              ))}
            </div>
          )}

          {/* MY FOLDERS SECTION */}
          {!loading && sections.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-tertiary">
                  My Folders ({sections.length})
                </span>
                {selectedFolderId && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="font-mono text-[10px] text-primary hover:underline font-bold"
                  >
                    View All
                  </button>
                )}
              </div>

              {sectionGroups
                .filter(({ section }) => !selectedFolderId || String(section._id) === selectedFolderId)
                .map(({ section, convos: sectionConvos }) => {
                  const sectionId = String(section._id);
                  const isLocked = section.isLocked || section.hasPasscode;
                  const isUnlocked = unlockedSections.has(sectionId);
                  const isCollapsed = collapsedSections.has(sectionId);
                  const isSelected = selectedFolderId === sectionId;

                  return (
                    <div
                      key={section._id}
                      className={`rounded-xl border transition-all p-1.5 ${
                        isSelected
                          ? 'border-primary bg-secondary-container/20 shadow-pixel-xs'
                          : 'border-tertiary/20 bg-surface-container-lowest/50'
                      }`}
                    >
                      {/* Folder Header Row */}
                      <div className="flex items-center justify-between gap-1 group/sec">
                        <button
                          type="button"
                          onClick={() => toggleCollapse(section)}
                          className="flex items-center gap-1.5 text-on-surface hover:text-primary transition-colors min-w-0 flex-1 text-left"
                        >
                          <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0">
                            {isCollapsed ? 'chevron_right' : 'expand_more'}
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                            {isLocked ? (isUnlocked ? 'lock_open' : 'lock') : 'folder'}
                          </span>
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider truncate">
                            {section.name}
                          </span>
                          <span className="px-1.5 py-0.2 bg-surface text-tertiary text-[9px] font-mono font-bold rounded-full border border-tertiary/20 shrink-0">
                            {sectionConvos.length}
                          </span>
                        </button>

                        {/* Folder Action Buttons */}
                        <div className="flex items-center gap-0.5 opacity-80 group-hover/sec:opacity-100 transition-opacity">
                          {isLocked && isUnlocked && (
                            <button
                              type="button"
                              onClick={() => handleRelockFolder(sectionId)}
                              className="p-1 hover:text-primary text-tertiary/70 transition-colors"
                              title="Lock folder now"
                              aria-label="Lock folder now"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                            </button>
                          )}

                          {/* Options menu trigger */}
                          <FolderContextMenu
                            section={section}
                            onRename={() => setRenameModal({ open: true, section })}
                            onManageLock={() =>
                              setLockModal({
                                open: true,
                                section,
                                mode: isLocked ? 'CHANGE' : 'SET',
                              })
                            }
                            onRemoveLock={() =>
                              setLockModal({
                                open: true,
                                section,
                                mode: 'REMOVE',
                              })
                            }
                            onDelete={() => setDeleteModal({ open: true, section })}
                          />
                        </div>
                      </div>

                      {/* Folder Contents (Conversations) */}
                      {!isCollapsed && (
                        <div className="space-y-1 pt-1.5 pl-1">
                          {isLocked && !isUnlocked ? (
                            <div className="p-3 bg-surface-container rounded-lg border border-tertiary/20 text-center space-y-2">
                              <span className="material-symbols-outlined text-[20px] text-tertiary">lock</span>
                              <p className="font-mono text-[11px] text-on-surface-variant font-bold">
                                Folder is locked with a PIN
                              </p>
                              <button
                                type="button"
                                onClick={() => setUnlockModal({ open: true, section })}
                                className="px-3 py-1 bg-primary text-surface-container font-mono text-[10px] font-bold rounded shadow-pixel-xs hover:brightness-105 transition-all press"
                              >
                                Unlock to View
                              </button>
                            </div>
                          ) : sectionConvos.length === 0 ? (
                            <p className="font-mono text-[10px] text-on-surface-variant/70 italic px-2 py-1">
                              Empty folder. Use conversation options to move chats here.
                            </p>
                          ) : (
                            sectionConvos.map((c) => (
                              <ConversationRow
                                key={c._id}
                                c={c}
                                user={user}
                                isOnline={isOnline}
                                isPinned={false}
                                onTogglePin={togglePin}
                                busyPinId={busyPinId}
                                typingUsers={typingConvos[c._id]}
                                onCleared={handleConversationCleared}
                                onDeleted={handleConversationDeleted}
                                onSectionMoved={handleConversationMoved}
                                onToggledMute={handleConversationMuteToggled}
                                onToggledRead={handleConversationReadToggled}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* ALL / RECENT (UNASSIGNED) CONVERSATIONS */}
          {!loading && selectedFolderId === null && (
            <div className="space-y-1.5 pt-1">
              {(pinnedList.length > 0 || sections.length > 0) && (
                <div className="flex items-center gap-1.5 px-1 text-tertiary">
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
                    {sections.length > 0 ? `Unfiled Talks (${unassignedList.length})` : `Recent (${unassignedList.length})`}
                  </span>
                </div>
              )}
              {unassignedList.length === 0 &&
                pinnedList.length === 0 &&
                sectionGroups.every((g) => g.convos.length === 0) && (
                  <EmptyState icon="forum" title="No conversations yet" hint="Search for a player or #room to start talking." />
                )}
              {unassignedList.map((c) => (
                <ConversationRow
                  key={c._id}
                  c={c}
                  user={user}
                  isOnline={isOnline}
                  isPinned={false}
                  onTogglePin={togglePin}
                  busyPinId={busyPinId}
                  typingUsers={typingConvos[c._id]}
                  onCleared={handleConversationCleared}
                  onDeleted={handleConversationDeleted}
                  onSectionMoved={handleConversationMoved}
                  onToggledMute={handleConversationMuteToggled}
                  onToggledRead={handleConversationReadToggled}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {newOpen && <StartChatModal onClose={() => setNewOpen(false)} onCreated={() => { setNewOpen(false); load(); }} />}

      {/* CREATE FOLDER MODAL */}
      {createModalOpen && (
        <CreateFolderModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(newSec) => {
            setSections((prev) => [...prev, newSec]);
            if (newSec.isLocked) {
              setUnlockedSections((prev) => new Set([...prev, String(newSec._id)]));
            }
            play('room-created');
            setCreateModalOpen(false);
          }}
        />
      )}

      {/* RENAME FOLDER MODAL */}
      {renameModal.open && (
        <RenameFolderModal
          open={renameModal.open}
          section={renameModal.section}
          onClose={() => setRenameModal({ open: false, section: null })}
          onRenamed={(updatedSec) => {
            setSections((prev) => prev.map((s) => (s._id === updatedSec._id ? updatedSec : s)));
            play('click');
            setRenameModal({ open: false, section: null });
          }}
        />
      )}

      {/* UNLOCK FOLDER MODAL */}
      {unlockModal.open && (
        <UnlockFolderModal
          open={unlockModal.open}
          section={unlockModal.section}
          onClose={() => setUnlockModal({ open: false, section: null })}
          onUnlocked={(sectionId) => {
            setUnlockedSections((prev) => new Set([...prev, String(sectionId)]));
            setCollapsedSections((prev) => {
              const next = new Set(prev);
              next.delete(String(sectionId));
              return next;
            });
            play('room-created');
            setUnlockModal({ open: false, section: null });
          }}
        />
      )}

      {/* MANAGE LOCK / PIN MODAL */}
      {lockModal.open && (
        <ManageLockModal
          open={lockModal.open}
          section={lockModal.section}
          mode={lockModal.mode}
          onClose={() => setLockModal({ open: false, section: null, mode: 'SET' })}
          onUpdated={(updatedSec) => {
            setSections((prev) => prev.map((s) => (s._id === updatedSec._id ? updatedSec : s)));
            if (updatedSec.isLocked) {
              setUnlockedSections((prev) => new Set([...prev, String(updatedSec._id)]));
            } else {
              setUnlockedSections((prev) => {
                const next = new Set(prev);
                next.delete(String(updatedSec._id));
                return next;
              });
            }
            play('click');
            setLockModal({ open: false, section: null, mode: 'SET' });
          }}
        />
      )}

      {/* DELETE FOLDER MODAL */}
      {deleteModal.open && (
        <DeleteFolderModal
          open={deleteModal.open}
          section={deleteModal.section}
          onClose={() => setDeleteModal({ open: false, section: null })}
          onDeleted={(deletedId) => {
            setSections((prev) => prev.filter((s) => s._id !== deletedId));
            setConvos((prev) =>
              prev.map((c) => (String(c.sectionId) === String(deletedId) ? { ...c, sectionId: null } : c))
            );
            if (selectedFolderId === String(deletedId)) setSelectedFolderId(null);
            play('click');
            setDeleteModal({ open: false, section: null });
          }}
        />
      )}

      {/* INVITATIONS MODAL */}
      {invitationsOpen && (
        <Modal
          open={invitationsOpen}
          onClose={() => setInvitationsOpen(false)}
          kicker="MEMBERSHIP APPROVAL REQUIRED"
          title="Room Invitations"
          maxW="max-w-md"
        >
          <div className="space-y-3">
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              You must accept an invitation before you become a group member.
            </p>
            {invitations.length === 0 ? (
              <p className="font-mono text-label-sm text-tertiary py-4 text-center">No pending invitations</p>
            ) : (
              invitations.map((inv) => {
                const group = inv.conversationId || {};
                const inviter = inv.inviterId || {};
                const invId = inv._id || inv.id;
                const isBusy = actionBusyId === invId;
                return (
                  <div
                    key={invId}
                    className="p-3 bg-surface-container rounded-xl border border-tertiary/20 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface border border-tertiary overflow-hidden shrink-0">
                        {group.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={group.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarSrc(group.avatarId || 'avatar-06')} alt="" className="w-full h-full pixelated" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-body-md font-bold text-on-surface truncate">#{group.name || 'Room'}</p>
                        <p className="font-body-sm text-[11px] text-on-surface-variant">
                          Invited by <span className="font-bold text-on-surface">{inviter.displayName || inviter.username || 'A member'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-tertiary/10">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRespondInvitation(invId, 'REJECT', group._id)}
                        className="px-3 py-1 bg-surface-container-high text-on-surface font-mono text-label-xs font-bold rounded-lg border border-tertiary/30 hover:bg-surface-container-highest press disabled:opacity-50"
                      >
                        {isBusy ? '…' : 'REJECT'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRespondInvitation(invId, 'ACCEPT', group._id)}
                        className="px-3 py-1 bg-primary text-surface-container font-mono text-label-xs font-bold rounded-lg border border-tertiary shadow-pixel-xs hover:brightness-105 press disabled:opacity-50"
                      >
                        {isBusy ? '…' : 'ACCEPT'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Folder Context Menu Component ----------------
function FolderContextMenu({ section, onRename, onManageLock, onRemoveLock, onDelete }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef(null);
  const isLocked = section.isLocked || section.hasPasscode;

  useEffect(() => {
    setMounted(true);
  }, []);

  const { coords } = useFloatingMenuPosition(open, triggerRef, {
    estimatedHeight: 200,
    menuWidth: 176,
    margin: 4,
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1 hover:text-on-surface text-tertiary/70 rounded hover:bg-surface transition-colors"
        title="Folder options"
        aria-label={`Options for folder ${section.name}`}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-[15px]">more_vert</span>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 pointer-events-auto">
          {/* Dismiss backdrop */}
          <div
            className="fixed inset-0 bg-transparent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              right: coords.right,
              maxHeight: `${coords.maxHeight}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="z-50 w-44 bg-surface-container-lowest border border-tertiary/30 rounded-xl shadow-pixel-md py-1.5 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 select-none text-left"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
            >
              <span className="material-symbols-outlined text-[15px] text-tertiary">edit</span>
              <span>Rename Folder</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onManageLock();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">
                {isLocked ? 'key' : 'lock'}
              </span>
              <span>{isLocked ? 'Change PIN' : 'Lock Folder'}</span>
            </button>

            {isLocked && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onRemoveLock();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
              >
                <span className="material-symbols-outlined text-[15px] text-tertiary">lock_open</span>
                <span>Remove Lock</span>
              </button>
            )}

            <div className="my-1 border-t border-tertiary/15" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left font-mono text-label-xs text-error hover:bg-error/10 transition-colors press"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
              <span>Delete Folder</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ---------------- Create Folder Modal ----------------
function CreateFolderModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a folder name');
      return;
    }

    if (isLocked) {
      if (!passcode || passcode.length < 4) {
        setError('Folder PIN/password must be at least 4 characters');
        return;
      }
      if (passcode !== confirmPasscode) {
        setError('PIN/password confirmation does not match');
        return;
      }
    }

    setBusy(true);
    setError('');
    try {
      const data = await chatSectionService.create({
        name: trimmedName,
        isLocked,
        passcode: isLocked ? passcode : '',
      });
      onCreated(data.section);
    } catch (err) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} kicker="CHAT ORGANIZER" title="Create Custom Folder" maxW="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Folder Name" required>
          <Input
            autoFocus
            placeholder="e.g. Work, Friends, Private, Gaming"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </Field>

        {/* Lock toggle */}
        <div className="p-3 bg-surface-container rounded-xl border border-tertiary/20 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              className="w-4 h-4 rounded border-tertiary text-primary focus:ring-primary"
            />
            <div className="min-w-0">
              <span className="font-mono text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                <span>Lock this folder with PIN / Password</span>
              </span>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Requires authentication before conversations inside can be viewed.
              </p>
            </div>
          </label>

          {isLocked && (
            <div className="space-y-3 pt-2 border-t border-tertiary/15 animate-fadeIn">
              <Field label="Folder PIN / Password" required>
                <div className="relative">
                  <Input
                    type={showPasscode ? 'text' : 'password'}
                    placeholder="Enter at least 4 characters"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    minLength={4}
                    maxLength={32}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary/70 hover:text-tertiary text-xs"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showPasscode ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </Field>

              <Field label="Confirm PIN / Password" required>
                <Input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Re-enter PIN / password"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  minLength={4}
                  maxLength={32}
                  required
                />
              </Field>
            </div>
          )}
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busy} onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create Folder'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Rename Folder Modal ----------------
function RenameFolderModal({ open, section, onClose, onRenamed }) {
  const [name, setName] = useState(section?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !section) return;

    setBusy(true);
    setError('');
    try {
      const data = await chatSectionService.rename(section._id, trimmed);
      onRenamed(data.section);
    } catch (err) {
      setError(err.message || 'Failed to rename folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} kicker="CHAT ORGANIZER" title="Rename Folder" maxW="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New Folder Name" required>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busy} onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Unlock Folder Modal ----------------
function UnlockFolderModal({ open, section, onClose, onUnlocked }) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode || !section) return;

    setBusy(true);
    setError('');
    try {
      await chatSectionService.unlock(section._id, passcode);
      onUnlocked(section._id);
    } catch (err) {
      setError(err.message || 'Incorrect PIN or password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      kicker="PROTECTED FOLDER"
      title={`Unlock "${section?.name}"`}
      maxW="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="font-body-sm text-[12px] text-on-surface-variant">
          This folder is secured with a PIN or password. Enter your credentials to view its contents.
        </p>

        <Field label="Folder PIN / Password" required>
          <div className="relative">
            <Input
              autoFocus
              type={showPasscode ? 'text' : 'password'}
              placeholder="Enter folder PIN / password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPasscode((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary/70 hover:text-tertiary text-xs"
              tabIndex={-1}
            >
              <span className="material-symbols-outlined text-[16px]">
                {showPasscode ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </Field>

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busy} onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={busy || !passcode}>
            {busy ? 'Verifying…' : 'Unlock Folder'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Manage Lock Modal (Set, Change, Remove) ----------------
function ManageLockModal({ open, section, mode, onClose, onUpdated }) {
  const isLocked = section?.isLocked || section?.hasPasscode;
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const title =
    mode === 'REMOVE' ? `Remove Lock from "${section?.name}"` : isLocked ? `Change PIN for "${section?.name}"` : `Lock "${section?.name}"`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!section) return;

    if (mode === 'REMOVE') {
      if (isLocked && !currentPasscode) {
        setError('Please enter your current PIN/password');
        return;
      }
      setBusy(true);
      setError('');
      try {
        const data = await chatSectionService.removeLock(section._id, currentPasscode);
        onUpdated(data.section);
      } catch (err) {
        setError(err.message || 'Failed to remove lock');
      } finally {
        setBusy(false);
      }
      return;
    }

    // SET or CHANGE mode
    if (isLocked && !currentPasscode) {
      setError('Please enter your current PIN/password');
      return;
    }

    if (!newPasscode || newPasscode.length < 4) {
      setError('New PIN/password must be at least 4 characters');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError('New PIN/password confirmation does not match');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const data = await chatSectionService.setLock(section._id, {
        currentPasscode,
        newPasscode,
      });
      onUpdated(data.section);
    } catch (err) {
      setError(err.message || 'Failed to update folder lock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} kicker="FOLDER SECURITY" title={title} maxW="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isLocked && (
          <Field label="Current PIN / Password" required>
            <Input
              autoFocus
              type={showPasscode ? 'text' : 'password'}
              placeholder="Enter current PIN / password"
              value={currentPasscode}
              onChange={(e) => setCurrentPasscode(e.target.value)}
              required
            />
          </Field>
        )}

        {mode !== 'REMOVE' && (
          <>
            <Field label={isLocked ? 'New PIN / Password' : 'Folder PIN / Password'} required>
              <div className="relative">
                <Input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter at least 4 characters"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  minLength={4}
                  maxLength={32}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary/70 hover:text-tertiary text-xs"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPasscode ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </Field>

            <Field label="Confirm New PIN / Password" required>
              <Input
                type={showPasscode ? 'text' : 'password'}
                placeholder="Re-enter PIN / password"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                minLength={4}
                maxLength={32}
                required
              />
            </Field>
          </>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busy} onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            disabled={busy || (mode === 'REMOVE' ? isLocked && !currentPasscode : !newPasscode)}
          >
            {busy ? 'Saving…' : mode === 'REMOVE' ? 'Remove Lock' : isLocked ? 'Update PIN' : 'Set Lock'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

// ---------------- Delete Folder Modal ----------------
function DeleteFolderModal({ open, section, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!section) return;
    setBusy(true);
    setError('');
    try {
      await chatSectionService.delete(section._id);
      onDeleted(section._id);
    } catch (err) {
      setError(err.message || 'Failed to delete folder');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} kicker="REMOVE FOLDER" title={`Delete "${section?.name}"?`} maxW="max-w-md">
      <div className="space-y-4">
        <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
          Are you sure you want to delete the folder <span className="font-bold text-on-surface">"{section?.name}"</span>?
        </p>
        <div className="p-3 bg-secondary-container/30 border border-tertiary/20 rounded-xl">
          <p className="font-mono text-[11px] text-tertiary">
            🛡️ <span className="font-bold">Conversations will NOT be deleted.</span> Any direct chats or lounges inside this folder will safely return to your unfiled conversation list.
          </p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busy} onClick={onClose}>
            Cancel
          </SecondaryButton>
          <DestructiveButton type="button" disabled={busy} onClick={handleDelete}>
            {busy ? 'Deleting…' : 'Delete Folder'}
          </DestructiveButton>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Conversation Row ----------------
function ConversationRow({
  c,
  user,
  isOnline,
  isPinned,
  onTogglePin,
  busyPinId,
  typingUsers,
  onCleared,
  onDeleted,
  onSectionMoved,
  onToggledMute,
  onToggledRead,
}) {
  const other = otherMember(c, user);
  const online = c.type === 'direct' ? isOnline(other?._id || other?.id) : undefined;
  const lastAt = c.lastMessage?.createdAt || c.lastMessageAt || c.updatedAt;
  const isMuted = (user?.mutedConversations || []).some((id) => String(id?._id || id) === String(c._id));

  const myId = String(user?._id || user?.id || '');
  const activeTyping = Object.entries(typingUsers || {}).filter(([id]) => id && String(id) !== myId);
  const typingName =
    activeTyping.length > 0
      ? activeTyping[0][1]?.displayName || activeTyping[0][1]?.username || 'Someone'
      : null;

  return (
    <div className="group relative flex items-center rounded-lg bg-surface-container-lowest/80 border border-tertiary/20 hover:border-tertiary transition-all shadow-pixel-sm hover:bg-surface-container-lowest">
      <Link href={conversationHref(c)} className="flex items-center gap-2.5 p-2 flex-1 min-w-0">
        <Avatar
          src={c.type === 'group' && c.avatarUrl ? c.avatarUrl : avatarSrc(conversationAvatarId(c, user))}
          alt={conversationLabel(c, user)}
          size={36}
          online={c.type === 'direct' ? !!online : undefined}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="font-display text-[13px] text-on-surface font-bold truncate flex items-center gap-1.5">
              <span>
                {c.type === 'group' && !conversationLabel(c, user).startsWith('#') ? '#' : ''}
                {conversationLabel(c, user)}
              </span>
              {isMuted && <span className="text-[11px] opacity-75 shrink-0" title="Muted notifications">🔇</span>}
            </p>
            <span className="font-mono text-[10px] text-tertiary flex-shrink-0">{lastAt ? timeAgo(lastAt) : ''}</span>
          </div>
          {typingName ? (
            <p className="font-mono text-[11px] text-primary font-bold truncate flex items-center gap-1.5">
              <span>{activeTyping.length === 1 ? `${typingName} is typing` : `${activeTyping.length} typing`}</span>
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 bg-primary pixel-pulse-1 inline-block" />
                <span className="w-1.5 h-1.5 bg-secondary pixel-pulse-2 inline-block" />
                <span className="w-1.5 h-1.5 bg-primary-fixed-dim pixel-pulse-3 inline-block" />
              </span>
            </p>
          ) : (
            <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{conversationSubtitle(c, user, isOnline)}</p>
          )}
        </div>
        {(c.unreadCount || 0) > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary-container text-surface-container font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0">
            {c.unreadCount}
          </span>
        )}
      </Link>

      {/* Action Controls: Pin status indicator & Three-Dot Context Menu */}
      <div className="flex items-center gap-0.5 pr-1 shrink-0">
        {isPinned && (
          <button
            type="button"
            onClick={(e) => onTogglePin(e, c._id)}
            disabled={busyPinId === c._id}
            title="Pinned conversation (click to unpin)"
            aria-label="Pinned conversation"
            className="p-1 text-primary hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">keep</span>
          </button>
        )}

        <ConversationActionsMenu
          conversation={{ ...c, isPinned }}
          currentUser={user}
          buttonStyle="row"
          onCleared={() => onCleared?.(c._id)}
          onDeleted={() => onDeleted?.(c._id)}
          onSectionMoved={(sectionId) => onSectionMoved?.(c._id, sectionId)}
          onToggledPin={(convoId) => onTogglePin?.(null, convoId)}
          onToggledMute={(convoId) => onToggledMute?.(convoId)}
          onToggledRead={(count) => onToggledRead?.(c._id, count)}
        />
      </div>
    </div>
  );
}

function SidebarLink({ href, icon, label, badge, count, active }) {
  const pathname = usePathname();
  const isActive = active !== undefined ? active : pathname === href || (href !== '/dashboard' && href !== '/' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 font-mono text-label-md rounded-lg px-4 py-2 transition-all ${
        isActive
          ? 'bg-secondary-container text-on-secondary-container font-bold border border-tertiary/30 shadow-pixel-terracotta'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container/40'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span>{label}</span>
      {badge != null && (
        <span className="ml-auto px-1.5 bg-primary-container text-surface-container text-[10px] font-mono rounded">{badge}</span>
      )}
      {count != null && count > 0 && <span className="ml-auto text-tertiary text-[10px] font-mono font-semibold">{count}</span>}
    </Link>
  );
}

/** Modal: search players and start a direct chat. */
export function StartChatModal({ onClose, onCreated }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const { isOnline } = usePresence();

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const data = await userService.search(q);
        setResults(data.users || []);
      } catch (err) {
        setError(err.message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const start = async (userId) => {
    setBusyId(userId);
    setError('');
    try {
      const data = await conversationService.startDirect(userId);
      onCreated(data.conversation);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open onClose={onClose} kicker="DIRECT TRANSMISSION" title="Start a chat" maxW="max-w-md">
      <div className="space-y-3">
        <Input autoFocus placeholder="Search players by name or @username…" value={q} onChange={(e) => setQ(e.target.value)} />
        {error && <ErrorText>{error}</ErrorText>}
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {results.map((u) => (
            <button
              key={u.id || u._id}
              onClick={() => start(u.id || u._id)}
              disabled={busyId === (u.id || u._id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-tertiary/20 bg-surface-container-lowest hover:border-tertiary transition-all text-left"
            >
              <Avatar src={avatarSrc(u.avatarId)} alt={u.displayName} size={36} online={isOnline(u.id || u._id)} />
              <div className="min-w-0">
                <p className="font-display text-body-md font-bold text-on-surface truncate">{u.displayName}</p>
                <p className="font-mono text-label-sm text-tertiary truncate">@{u.username}</p>
              </div>
              <span className="ml-auto font-mono text-label-sm text-primary font-bold">{busyId === (u.id || u._id) ? '…' : 'CHAT'}</span>
            </button>
          ))}
          {q && !results.length && !error && <p className="font-mono text-label-sm text-on-surface-variant px-1 py-2">NO PLAYERS FOUND</p>}
        </div>
      </div>
    </Modal>
  );
}
