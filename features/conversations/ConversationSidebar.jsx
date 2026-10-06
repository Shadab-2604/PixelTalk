/**
 * File: ConversationSidebar.jsx
 *
 * Responsibility:
 * Renders the persistent messaging conversation inbox list:
 * - Direct chats and community group lounges
 * - Real-time unread badges, typing status, and online presence indicators
 * - Conversation pinning, muting, and vibration preference toggles
 * - "Start a chat" modal dialog (`StartChatModal`) for player discovery
 *
 * Layer:
 * Frontend / Conversation Features
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/features/conversations/conversationUtils.js
 * - frontend/services/conversationService.js
 * - frontend/services/userService.js
 * - frontend/components/ui.jsx (Modal portal)
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import { chatSectionService } from '@/services/chatSectionService';
import { conversationLabel, conversationAvatarId, conversationSubtitle, otherMember } from '@/features/conversations/conversationUtils';
import { Avatar, Badge, Input, ErrorText, EmptyState, Modal, PrimaryButton, SecondaryButton, DestructiveButton, Field } from '@/components/ui';
import { avatarSrc } from '@/lib/avatars';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { handleIncomingMessageNotification } from '@/services/notificationService';

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
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [busySection, setBusySection] = useState(false);
  const [renameModal, setRenameModal] = useState({ open: false, section: null, name: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, section: null });
  const [invitations, setInvitations] = useState([]);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], rooms: [], isSearching: false });
  const [searchLoading, setSearchLoading] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [busyPinId, setBusyPinId] = useState(null);
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

  const toggleCollapse = (sectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    setBusySection(true);
    setSectionError('');
    try {
      const data = await chatSectionService.create(trimmed);
      play('room-created');
      setSections((prev) => [...prev, data.section]);
      setNewSectionName('');
      setCreateSectionOpen(false);
    } catch (err) {
      setSectionError(err.message || 'Failed to create section');
    } finally {
      setBusySection(false);
    }
  };

  const handleRenameSection = async (e) => {
    e.preventDefault();
    const trimmed = renameModal.name.trim();
    if (!trimmed || !renameModal.section) return;
    setBusySection(true);
    setSectionError('');
    try {
      const data = await chatSectionService.rename(renameModal.section._id, trimmed);
      play('click');
      setSections((prev) => prev.map((s) => (s._id === renameModal.section._id ? data.section : s)));
      setRenameModal({ open: false, section: null, name: '' });
    } catch (err) {
      setSectionError(err.message || 'Failed to rename section');
    } finally {
      setBusySection(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteModal.section) return;
    setBusySection(true);
    setSectionError('');
    try {
      const deletedId = deleteModal.section._id;
      await chatSectionService.delete(deletedId);
      play('click');
      setSections((prev) => prev.filter((s) => s._id !== deletedId));
      setConvos((prev) =>
        prev.map((c) => (String(c.sectionId) === String(deletedId) ? { ...c, sectionId: null } : c))
      );
      setDeleteModal({ open: false, section: null });
    } catch (err) {
      setSectionError(err.message || 'Failed to delete section');
    } finally {
      setBusySection(false);
    }
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
    // Background polling relaxed to 60s; active changes arrive via Socket.IO events
    const t = setInterval(load, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Realtime conversation list updates: in-place cache mutation without full refetches
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
          // If conversation wasn't present in sidebar (e.g. newly created or restored), reload from server
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

    socket.on('new_message', onNewMessage);
    socket.on('chat_cleared', onChatCleared);
    socket.on('chat_deleted', onChatDeleted);
    socket.on('group_invitation_received', onInvitation);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('chat_cleared', onChatCleared);
      socket.off('chat_deleted', onChatDeleted);
      socket.off('group_invitation_received', onInvitation);
    };
  }, [activeConversationId]);

  // Global search routing: # -> room search, otherwise user search
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
    e.preventDefault();
    e.stopPropagation();
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
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
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

        {/* Global Live Search Results Dropdown / Panel */}
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
                          <img src={avatarSrc(r.avatarId || 'avatar-06')} alt="" className="w-8 h-8 rounded-lg pixelated border border-tertiary/30 shrink-0" />
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
                <p className="font-mono text-label-sm text-on-surface-variant py-2 text-center">NO ROOMS FOUND. Try another #room search.</p>
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={avatarSrc(u.avatarId)} alt={u.displayName} size={32} online={online} />
                        <div className="min-w-0">
                          <p className="font-display text-[13px] font-bold text-on-surface truncate">{u.displayName}</p>
                          <p className="font-mono text-[11px] text-tertiary truncate">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => startDirectFromSearch(u.id || u._id)}
                        className="px-2.5 py-1 bg-primary-container text-surface-container font-mono text-[11px] font-bold rounded border border-tertiary hover:bg-primary transition-all shrink-0"
                      >
                        MESSAGE
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-label-sm text-on-surface-variant py-2 text-center">NO PLAYERS FOUND. Try another name or @username.</p>
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
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-label-sm uppercase tracking-wider text-tertiary font-bold">Talks</span>
              {unread > 0 && <Badge tone="outline">{unread} Unread</Badge>}
            </div>
            <button
              type="button"
              onClick={() => {
                setNewSectionName('');
                setSectionError('');
                setCreateSectionOpen(true);
              }}
              className="flex items-center gap-1 font-mono text-[10px] text-primary hover:text-tertiary font-bold uppercase py-0.5 px-2 rounded bg-surface border border-tertiary/20 hover:bg-secondary-container/30 transition-all press"
              title="Create custom chat section folder"
            >
              <span className="material-symbols-outlined text-[13px]">create_new_folder</span>
              <span>+ Folder</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-1">
            {['all', 'direct', 'group'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded font-mono text-label-sm font-bold border transition-all ${
                  filter === f
                    ? 'bg-secondary-container text-on-secondary-container border-tertiary/30'
                    : 'border-transparent text-on-surface-variant hover:border-tertiary/20'
                }`}
              >
                {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : 'Squads'}
              </button>
            ))}
          </div>

          {error && <ErrorText>{error}</ErrorText>}
          {loading && <p className="font-mono text-label-sm text-on-surface-variant px-1 py-3">Loading conversations…</p>}

          {/* PINNED SECTION */}
          {!loading && pinnedList.length > 0 && (
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
                />
              ))}
            </div>
          )}

          {/* CUSTOM CHAT SECTIONS */}
          {!loading && sectionGroups.map(({ section, convos: sectionConvos }) => {
            const isCollapsed = collapsedSections.has(section._id);
            return (
              <div key={section._id} className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1 group/sec">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(section._id)}
                    className="flex items-center gap-1 text-tertiary hover:text-on-surface transition-colors min-w-0"
                  >
                    <span className="material-symbols-outlined text-[15px] transition-transform">
                      {isCollapsed ? 'chevron_right' : 'expand_more'}
                    </span>
                    <span className="material-symbols-outlined text-[15px] text-primary">folder</span>
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider truncate">
                      {section.name} ({sectionConvos.length})
                    </span>
                  </button>

                  {/* Section Actions: Rename & Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setRenameModal({ open: true, section, name: section.name })}
                      className="p-1 hover:text-primary text-tertiary/60 transition-colors"
                      title={`Rename "${section.name}"`}
                      aria-label={`Rename "${section.name}" section`}
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ open: true, section })}
                      className="p-1 hover:text-error text-tertiary/60 transition-colors"
                      title={`Delete "${section.name}" section`}
                      aria-label={`Delete "${section.name}" section`}
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="space-y-1 pl-1">
                    {sectionConvos.length === 0 ? (
                      <p className="font-mono text-[10px] text-on-surface-variant/70 italic px-2 py-1">
                        Empty folder. Move chats here to organize.
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
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ALL / RECENT (UNASSIGNED) SECTION */}
          {!loading && (
            <div className="space-y-1.5 pt-1">
              {(pinnedList.length > 0 || sections.length > 0) && (
                <div className="flex items-center gap-1.5 px-1 text-tertiary">
                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
                    {sections.length > 0 ? `Other Talks (${unassignedList.length})` : `Recent (${unassignedList.length})`}
                  </span>
                </div>
              )}
              {unassignedList.length === 0 && pinnedList.length === 0 && sectionGroups.every((g) => g.convos.length === 0) && (
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
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {newOpen && <StartChatModal onClose={() => setNewOpen(false)} onCreated={() => { setNewOpen(false); load(); }} />}
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

      {/* CREATE SECTION MODAL */}
      {createSectionOpen && (
        <Modal
          open={createSectionOpen}
          onClose={() => !busySection && setCreateSectionOpen(false)}
          kicker="CHAT ORGANIZER"
          title="Create Chat Section"
          maxW="max-w-md"
        >
          <form onSubmit={handleCreateSection} className="space-y-4">
            <Field label="Section Name" required hint="e.g. Family, Friends, Work, College, Gaming">
              <Input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                maxLength={40}
                required
                placeholder="Section name"
              />
            </Field>
            {sectionError && <ErrorText>{sectionError}</ErrorText>}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
              <SecondaryButton type="button" disabled={busySection} onClick={() => setCreateSectionOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={busySection || !newSectionName.trim()}>
                {busySection ? 'Creating…' : 'Create Section'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* RENAME SECTION MODAL */}
      {renameModal.open && (
        <Modal
          open={renameModal.open}
          onClose={() => !busySection && setRenameModal({ open: false, section: null, name: '' })}
          kicker="CHAT ORGANIZER"
          title="Rename Section"
          maxW="max-w-md"
        >
          <form onSubmit={handleRenameSection} className="space-y-4">
            <Field label="New Section Name" required>
              <Input
                autoFocus
                value={renameModal.name}
                onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
                maxLength={40}
                required
              />
            </Field>
            {sectionError && <ErrorText>{sectionError}</ErrorText>}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-tertiary/20">
              <SecondaryButton
                type="button"
                disabled={busySection}
                onClick={() => setRenameModal({ open: false, section: null, name: '' })}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={busySection || !renameModal.name.trim()}>
                {busySection ? 'Saving…' : 'Save'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE SECTION MODAL */}
      {deleteModal.open && (
        <Modal
          open={deleteModal.open}
          onClose={() => !busySection && setDeleteModal({ open: false, section: null })}
          kicker="REMOVE FOLDER"
          title={`Delete "${deleteModal.section?.name}"?`}
          maxW="max-w-md"
        >
          <div className="space-y-4">
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
              This will remove the section from your sidebar. Your conversations will not be deleted.
            </p>
            {sectionError && <ErrorText>{sectionError}</ErrorText>}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
              <SecondaryButton type="button" disabled={busySection} onClick={() => setDeleteModal({ open: false, section: null })}>
                Cancel
              </SecondaryButton>
              <DestructiveButton type="button" disabled={busySection} onClick={handleDeleteSection}>
                {busySection ? 'Deleting…' : 'Delete Section'}
              </DestructiveButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ConversationRow({ c, user, isOnline, isPinned, onTogglePin, busyPinId }) {
  const other = otherMember(c, user);
  const online = c.type === 'direct' ? isOnline(other?._id || other?.id) : undefined;
  const lastAt = c.lastMessage?.createdAt || c.lastMessageAt || c.updatedAt;
  const isMuted = (user?.mutedConversations || []).some((id) => String(id?._id || id) === String(c._id));

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
              <span>{c.type === 'group' && !conversationLabel(c, user).startsWith('#') ? '#' : ''}{conversationLabel(c, user)}</span>
              {isMuted && <span className="text-[11px] opacity-75 shrink-0" title="Muted notifications">🔇</span>}
            </p>
            <span className="font-mono text-[10px] text-tertiary flex-shrink-0">{lastAt ? timeAgo(lastAt) : ''}</span>
          </div>
          <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{conversationSubtitle(c, user, isOnline)}</p>
        </div>
        {(c.unreadCount || 0) > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary-container text-surface-container font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0">
            {c.unreadCount}
          </span>
        )}
      </Link>

      {/* Pin / Unpin Action Button */}
      <button
        type="button"
        onClick={(e) => onTogglePin(e, c._id)}
        disabled={busyPinId === c._id}
        title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
        aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
        className={`px-2 py-3 text-tertiary/40 hover:text-primary transition-opacity ${
          isPinned ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">
          {isPinned ? 'keep' : 'keep_off'}
        </span>
      </button>
    </div>
  );
}

function SidebarLink({ href, icon, label, badge, count, active }) {
  const pathname = usePathname();
  const isActive = active !== undefined ? active : (pathname === href || (href !== '/dashboard' && href !== '/' && pathname.startsWith(href)));
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
        <ErrorText>{error}</ErrorText>
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

