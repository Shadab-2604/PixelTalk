/**
 * ============================================================
 * PIXELTALK — ROOM MEMBERS & INSPECTOR PANEL (RoomMembersPanel.jsx)
 * ============================================================
 *
 * WHAT:
 * Responsive right inspector panel for Community Rooms and Direct Chats:
 * - Room identity hero, avatar, description, live roster metrics
 * - Group settings, invite system, role management (Owner/Admin/Mod/Member)
 * - Searchable member roster with online status and canonical profile links
 * - Collapsible room management actions (Export JSON, Clear, Leave, Delete)
 * ============================================================
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import { Avatar, Badge, Input, ErrorText, PrimaryButton, SecondaryButton, GhostButton, DestructiveButton, Spinner } from '@/components/ui';
import { otherMember } from '@/features/conversations/conversationUtils';
import { avatarSrc } from '@/lib/avatars';
import { usePresence } from '@/hooks/usePresence';
import { sfx } from '@/lib/sound';
import { triggerVibration } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';
import { RoomSettingsModal } from './RoomSettingsModal';
import { ConversationActionsMenu } from '@/features/conversations/ConversationActionsMenu';

const ROLES = ['Owner', 'Admin', 'Moderator', 'Member'];

export function RoomMembersPanel({ conversation, currentUser, onChanged }) {
  const { user, setUser } = useAuth();
  const effectiveUser = user || currentUser;
  const { isOnline } = usePresence();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);
  const [managementOpen, setManagementOpen] = useState(false);

  const currentUserId = effectiveUser?._id || effectiveUser?.id;
  const convoIdStr = String(conversation?._id || conversation?.id);

  const isPinned = Array.isArray(effectiveUser?.pinnedConversations) &&
    effectiveUser.pinnedConversations.some((id) => String(id) === convoIdStr);

  const isMuted = Array.isArray(effectiveUser?.mutedConversations) &&
    effectiveUser.mutedConversations.some((id) => String(id) === convoIdStr);

  const isVibrate = Array.isArray(effectiveUser?.vibrateConversations) &&
    effectiveUser.vibrateConversations.some((id) => String(id) === convoIdStr);

  const togglePin = async () => {
    try {
      const res = await userService.togglePin(conversation._id);
      if (res && res.pinnedConversations) {
        setUser((prev) => (prev ? { ...prev, pinnedConversations: res.pinnedConversations } : prev));
      }
      sfx.click();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleMute = async () => {
    try {
      const res = await userService.toggleMute(conversation._id);
      if (res && res.mutedConversations) {
        setUser((prev) => (prev ? { ...prev, mutedConversations: res.mutedConversations } : prev));
      }
      sfx.click();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVibrate = async () => {
    try {
      const res = await userService.toggleVibrate(conversation._id);
      if (res && res.vibrateConversations) {
        setUser((prev) => (prev ? { ...prev, vibrateConversations: res.vibrateConversations } : prev));
      }
      triggerVibration([50, 50, 50]);
      sfx.click();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  // ------------------------------------------------------------
  // DIRECT CHAT VIEW
  // ------------------------------------------------------------
  if (conversation?.type === 'direct') {
    const other = otherMember(conversation, currentUser);
    const online = other ? isOnline(other._id || other.id) : false;

    return (
      <div className="space-y-3.5">
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-tertiary/20 shadow-pixel-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-xl bg-surface-container border-2 border-tertiary flex items-center justify-center shadow-pixel-sm-solid relative mb-2.5 overflow-hidden">
            <Avatar src={avatarSrc(other?.avatarId || 'avatar-01')} alt="" size={60} online={online} />
          </div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface truncate">
            {other?.displayName || other?.username || 'Player'}
          </h2>
          <p className="font-mono text-label-sm text-primary font-bold mt-0.5 truncate">
            @{other?.username || 'player'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            <Badge tone={online ? 'green' : 'brown'}>{online ? 'ONLINE' : 'OFFLINE'}</Badge>
            {isMuted && <Badge tone="error">MUTED</Badge>}
            {isVibrate && <Badge tone="green">VIBRATE</Badge>}
            <Badge tone="outline">DIRECT</Badge>
          </div>

          {other?.bio && (
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-2.5 bg-surface-container/60 p-2.5 rounded-lg border border-tertiary/10 italic text-left break-words">
              &ldquo;{other.bio}&rdquo;
            </p>
          )}

          {other?.customStatus && (
            <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-label-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/20 max-w-full truncate">
              <span className="material-symbols-outlined text-[12px] shrink-0">chat_bubble_outline</span>
              <span className="truncate">{other.customStatus}</span>
            </div>
          )}

          {/* Quick Controls */}
          <div className="mt-3.5 pt-3 border-t border-tertiary/15 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute chat' : 'Mute chat'}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border font-mono text-label-xs transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-error-container text-error border-error/30'
                    : 'bg-surface-container border-tertiary/20 hover:bg-secondary-container/40 text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isMuted ? 'notifications_off' : 'notifications'}
                </span>
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={toggleVibrate}
                aria-label={isVibrate ? 'Disable vibration' : 'Enable vibration'}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border font-mono text-label-xs transition-colors cursor-pointer ${
                  isVibrate
                    ? 'bg-secondary-container text-on-secondary-container font-bold border-tertiary/30'
                    : 'bg-surface-container border-tertiary/20 hover:bg-secondary-container/40 text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isVibrate ? 'vibration' : 'mobile_off'}
                </span>
                <span>{isVibrate ? 'Vibrate' : 'No Vibe'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={togglePin}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-label-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPinned ? 'keep_off' : 'keep'}
              </span>
              <span>{isPinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
            </button>

            {other?.username && (
              <Link href={`/profile/${other.username}`} className="block">
                <GhostButton className="w-full py-1.5 text-label-xs">
                  <span className="material-symbols-outlined text-[14px]">person</span> View Player Profile
                </GhostButton>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // GROUP ROOM VIEW
  // ------------------------------------------------------------
  const isOwner =
    conversation.createdBy &&
    String(conversation.createdBy._id || conversation.createdBy) === String(currentUserId);
  const isAdmin =
    isOwner ||
    (Array.isArray(conversation.admins) &&
      conversation.admins.some((a) => String(a._id || a) === String(currentUserId)));

  const members = conversation.members || [];
  const pastMembers = Array.isArray(conversation.pastMembers) ? conversation.pastMembers : [];
  const online = members.filter((m) => isOnline(m._id || m.id));

  const getMemberRole = (memberId) => {
    const mIdStr = String(memberId);
    const ownerIdStr = String(conversation.createdBy?._id || conversation.createdBy);
    if (mIdStr === ownerIdStr) return 'Owner';

    if (conversation.memberRoles && conversation.memberRoles.get) {
      const r = conversation.memberRoles.get(mIdStr);
      if (r) return r;
    } else if (conversation.memberRoles && typeof conversation.memberRoles === 'object') {
      const r = conversation.memberRoles[mIdStr];
      if (r) return r;
    }

    if (Array.isArray(conversation.admins) && conversation.admins.some((a) => String(a._id || a) === mIdStr)) {
      return 'Admin';
    }

    return 'Member';
  };

  const myRole = getMemberRole(currentUserId);
  const canManageRoles = isOwner || myRole === 'Admin' || (conversation.permissions && conversation.permissions.manageRoles);
  const canEditRoom = isOwner || myRole === 'Admin' || (conversation.permissions && conversation.permissions.editRoom);

  const handleShare = () => {
    sfx.click();
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/rooms/${conversation._id}`
      : `http://localhost:3000/rooms/${conversation._id}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const [inviteSuccess, setInviteSuccess] = useState('');

  const search = async (q) => {
    setQuery(q);
    if (!q.trim()) return setResults([]);
    try {
      const data = await userService.search(q);
      setResults((data.users || []).filter((u) => !members.some((m) => (m._id || m.id) === u.id)));
    } catch {
      setResults([]);
    }
  };

  const addMember = async (userId) => {
    setError('');
    setInviteSuccess('');
    try {
      await conversationService.inviteMembers(conversation._id, [userId]);
      sfx.success();
      setInviteSuccess('Invitation sent! Player must accept before joining.');
      await search(query);
      setTimeout(() => setInviteSuccess(''), 4000);
      onChanged?.();
    } catch (err) {
      sfx.error();
      setError(err.message);
    }
  };

  const removeMember = async (userId) => {
    setError('');
    try {
      await conversationService.removeMember(conversation._id, userId);
      sfx.click();
      onChanged?.();
    } catch (err) {
      sfx.error();
      setError(err.message);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setError('');
    setEditingRoleUserId(null);
    try {
      await conversationService.updateMemberRole(conversation._id, targetUserId, newRole);
      sfx.success();
      onChanged?.();
    } catch (err) {
      sfx.error();
      setError(err.message || 'Failed to update role');
    }
  };

  const leave = async () => {
    setError('');
    try {
      await conversationService.leave(conversation._id);
      sfx.click();
      onChanged?.({ left: true });
    } catch (err) {
      sfx.error();
      setError(err.message);
    }
  };

  // Filter state for member search & role chips
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'ADMINS' | 'ONLINE' | 'PAST'

  const filteredMembers = members.filter((m) => {
    const dName = (m.displayName || '').toLowerCase();
    const uName = (m.username || '').toLowerCase();
    const q = memberSearch.toLowerCase().trim();
    if (q && !dName.includes(q) && !uName.includes(q)) return false;

    const mId = m._id || m.id;
    const role = getMemberRole(mId);
    const mOnline = isOnline(mId);

    if (roleFilter === 'ONLINE') return mOnline;
    if (roleFilter === 'ADMINS') return role === 'Admin' || role === 'Owner';
    if (roleFilter === 'MODS') return role === 'Moderator';
    if (roleFilter === 'MEMBERS') return role === 'Member';
    return true;
  });

  const ownerMember = members.find((m) => {
    const mId = String(m._id || m.id);
    const ownerId = String(conversation.createdBy?._id || conversation.createdBy);
    return mId === ownerId;
  });

  return (
    <div className="space-y-3.5">
      {/*
        * 1. ROOM HERO CARD
        * Compact pixel header, room avatar, name, description, active count, and action buttons.
        */}
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl overflow-hidden shadow-pixel-xs">
        {/* Accent Bar */}
        <div className="h-10 w-full bg-surface-container relative overflow-hidden bg-pixel-grid border-b border-tertiary/20 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 bg-surface/90 border border-tertiary/30 px-2 py-0.5 rounded text-[10px] font-mono text-tertiary font-bold uppercase truncate max-w-[65%]">
            <span className="w-1.5 h-1.5 bg-primary-container inline-block shrink-0" />
            <span className="truncate">#{conversation.name}</span>
          </div>
          <span className="font-mono text-[9px] bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded border border-tertiary/20 font-bold uppercase shrink-0">
            {myRole.toUpperCase()}
          </span>
        </div>

        {/* Identity & Details */}
        <div className="p-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface border-2 border-[#6E3511] shadow-pixel-xs p-0.5 shrink-0 overflow-hidden relative">
              {conversation.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={conversation.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc(conversation.avatarId || 'avatar-06')} alt="" className="w-full h-full object-cover rounded-lg pixelated" />
              )}
              <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-primary-container border border-surface rounded-none" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-body-lg font-bold text-on-surface truncate">
                #{conversation.name}
              </h2>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-tertiary mt-0.5">
                <span className="font-bold text-on-surface">{members.length} members</span>
                <span>•</span>
                <span className="text-primary font-bold">{online.length} online</span>
              </div>
            </div>
          </div>

          {conversation.description && (
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-2 leading-relaxed bg-surface-container/50 p-2 rounded-lg border border-tertiary/15 break-words">
              {conversation.description}
            </p>
          )}

          {/* Quick Action Grid */}
          <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-tertiary/15">
            <button
              type="button"
              onClick={handleShare}
              title="Share room link"
              aria-label="Share room link"
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-[10px] font-bold shadow-pixel-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'share'}</span>
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={togglePin}
              title={isPinned ? 'Unpin room' : 'Pin room'}
              aria-label={isPinned ? 'Unpin room' : 'Pin room'}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-[10px] font-bold shadow-pixel-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">{isPinned ? 'keep_off' : 'keep'}</span>
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Unmute room' : 'Mute room'}
              aria-label={isMuted ? 'Unmute room' : 'Mute room'}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg border font-mono text-[10px] font-bold shadow-pixel-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer ${
                isMuted
                  ? 'bg-error-container text-error border-error/30'
                  : 'bg-surface-container border-tertiary/20 text-on-surface hover:bg-secondary-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isMuted ? 'notifications_off' : 'notifications'}
              </span>
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {canEditRoom ? (
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  setSettingsOpen(true);
                }}
                title="Room settings"
                aria-label="Room settings"
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg bg-secondary-container text-on-secondary-container border border-tertiary/25 font-mono text-[10px] font-bold shadow-pixel-xs active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">settings</span>
                <span>Settings</span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg bg-surface-container/40 border border-tertiary/10 text-outline font-mono text-[10px]">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Room</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        * 2. GROUP METRICS / INFO 2x2 STRIP
        */}
      <div className="grid grid-cols-2 gap-1.5 text-left">
        {/* Owner */}
        <div className="bg-surface-container-low border border-tertiary/25 p-2 rounded-lg shadow-pixel-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-wider">Owner</span>
            <span className="material-symbols-outlined text-[12px] text-primary">workspace_premium</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar src={avatarSrc(ownerMember?.avatarId || 'avatar-01')} size={18} ring={false} />
            <p className="font-mono text-[10px] font-bold text-on-surface truncate">
              {ownerMember?.displayName || 'Owner'}
            </p>
          </div>
        </div>

        {/* Messaging Access */}
        <div className="bg-surface-container-low border border-tertiary/25 p-2 rounded-lg shadow-pixel-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-wider">Chat</span>
            <span className="material-symbols-outlined text-[12px] text-primary">chat</span>
          </div>
          <p className="font-mono text-[10px] font-bold text-on-surface truncate">
            {conversation.settings?.adminOnlyChat ? 'Admins only' : 'Everyone'}
          </p>
        </div>

        {/* Invite Rule */}
        <div className="bg-surface-container-low border border-tertiary/25 p-2 rounded-lg shadow-pixel-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-wider">Invites</span>
            <span className="material-symbols-outlined text-[12px] text-primary">badge</span>
          </div>
          <p className="font-mono text-[10px] font-bold text-on-surface truncate">
            {conversation.settings?.invitePermission === 'ADMINS_ONLY' ? 'Admins only' : 'Anyone'}
          </p>
        </div>

        {/* Roster counts */}
        <div className="bg-surface-container-low border border-tertiary/25 p-2 rounded-lg shadow-pixel-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-mono text-[9px] text-tertiary uppercase font-bold tracking-wider">Roster</span>
            <span className="material-symbols-outlined text-[12px] text-primary">groups</span>
          </div>
          <p className="font-mono text-[10px] font-bold text-on-surface truncate">
            {members.length} Players ({online.length} live)
          </p>
        </div>
      </div>

      {/*
        * 3. MEMBERS SECTION (Search, Filter Chips & Member List)
        */}
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl p-3 shadow-pixel-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase text-tertiary tracking-wider">
            Members ({members.length})
          </span>
          <span className="font-mono text-[10px] text-primary font-bold">
            {online.length} Online
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary/50 text-[15px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search roster..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-surface border border-tertiary/25 rounded-lg font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
          {[
            { id: 'ALL', label: `All (${members.length})` },
            { id: 'ADMINS', label: 'Admins' },
            { id: 'ONLINE', label: `Online (${online.length})` },
            { id: 'PAST', label: `Past (${pastMembers.length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRoleFilter(f.id)}
              className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                roleFilter === f.id
                  ? 'bg-primary text-surface-container font-bold border-primary shadow-pixel-xs'
                  : 'bg-surface-container text-tertiary border-tertiary/20 hover:bg-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Invite Bar */}
        {(isAdmin || conversation.settings?.invitePermission !== 'ADMINS_ONLY') && (
          <div className="pt-1 border-t border-tertiary/15">
            {adding ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-primary text-[14px]">
                    person_add
                  </span>
                  <input
                    placeholder="Search username to invite…"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 bg-surface border border-tertiary/30 rounded-lg font-mono text-[11px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                {inviteSuccess && (
                  <p className="font-mono text-[10px] text-primary font-bold">{inviteSuccess}</p>
                )}
                {results.length > 0 && (
                  <div className="max-h-36 overflow-y-auto space-y-1 p-1 bg-surface-container-low rounded-lg border border-tertiary/20">
                    {results.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-1.5 bg-surface rounded">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Avatar src={avatarSrc(u.avatarId)} size={22} />
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-bold text-on-surface truncate">{u.displayName}</p>
                            <p className="font-mono text-[9px] text-tertiary truncate">@{u.username}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addMember(u.id)}
                          className="font-mono text-[10px] bg-primary text-surface-container px-2 py-0.5 rounded font-bold hover:brightness-110 press"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setQuery('');
                      setResults([]);
                    }}
                    className="font-mono text-[10px] text-outline hover:text-tertiary underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full py-1 text-center font-mono text-[11px] font-bold text-primary hover:text-primary-container bg-surface-container hover:bg-surface-variant border border-tertiary/20 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                <span>+ Invite Players</span>
              </button>
            )}
          </div>
        )}

        {/* Member Rows */}
        {roleFilter === 'PAST' ? (
          <div className="divide-y divide-tertiary/15 max-h-60 overflow-y-auto pr-1">
            {pastMembers.length === 0 ? (
              <p className="font-mono text-[11px] text-outline text-center py-3">No past members found.</p>
            ) : (
              pastMembers.map((pm, idx) => {
                const u = pm.userId || {};
                const uId = u._id || u.id || pm._id || idx;
                const isRemoved = pm.action === 'REMOVED';
                return (
                  <div key={uId} className="p-1.5 rounded-lg bg-surface-container-low/40 hover:bg-surface/50 transition-colors">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={avatarSrc(u.avatarId)} alt={u.displayName || 'Player'} size={24} ring={false} />
                        <div className="min-w-0">
                          <span className="font-body-sm text-[11px] font-bold text-on-surface truncate block">
                            {u.displayName || u.username || 'Former Player'}
                          </span>
                          <span className="font-mono text-[9px] text-tertiary block truncate">
                            @{u.username || 'player'} • {isRemoved ? 'Removed' : 'Left'}
                          </span>
                        </div>
                      </div>

                      {(isAdmin || conversation.settings?.invitePermission !== 'ADMINS_ONLY') && u._id && (
                        <button
                          type="button"
                          onClick={() => addMember(u._id)}
                          className="font-mono text-[9px] font-bold bg-primary text-surface-container px-2 py-0.5 rounded border border-primary/40 hover:brightness-110 press cursor-pointer shrink-0"
                        >
                          + Invite
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-tertiary/15 max-h-60 overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <p className="font-mono text-[11px] text-outline text-center py-3">No matching members found.</p>
            ) : (
              filteredMembers.map((m) => {
                const mId = m._id || m.id;
                const role = getMemberRole(mId);
                const mOnline = isOnline(mId);
                return (
                  <MemberItem
                    key={mId}
                    m={m}
                    online={mOnline}
                    role={role}
                    canManageRoles={canManageRoles && mId !== (conversation.createdBy?._id || conversation.createdBy)}
                    canRemove={
                      (isAdmin || conversation.permissions?.removeMembers) &&
                      mId !== (conversation.createdBy?._id || conversation.createdBy) &&
                      mId !== currentUserId
                    }
                    onRemove={removeMember}
                    onRoleChange={(newRole) => handleRoleChange(mId, newRole)}
                    isEditingRole={editingRoleUserId === mId}
                    onToggleRoleEdit={() => setEditingRoleUserId(editingRoleUserId === mId ? null : mId)}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {/*
        * 4. COLLAPSIBLE ROOM OPTIONS & DANGER ZONE
        */}
      <div className="bg-surface-container-lowest border border-tertiary/20 rounded-xl overflow-hidden shadow-pixel-xs">
        <button
          type="button"
          onClick={() => setManagementOpen((o) => !o)}
          className="w-full p-2.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase text-tertiary hover:bg-surface-container/50 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Room Options & Danger Zone</span>
          </span>
          <span className="material-symbols-outlined text-[14px] transition-transform">
            {managementOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {managementOpen && (
          <div className="p-2.5 pt-0 border-t border-tertiary/15 space-y-1.5 mt-1">
            <button
              type="button"
              onClick={async () => {
                try {
                  const data = await conversationService.exportChat(conversation._id);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `PixelTalk-${conversation.name || 'room'}.json`;
                  a.click();
                  sfx.success();
                } catch (err) {
                  setError(err.message);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-mono text-[11px] border border-tertiary/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span> Export Chat (JSON)
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Clear all messages in this room for yourself?')) return;
                try {
                  await conversationService.clear(conversation._id);
                  sfx.click();
                  onChanged?.({ cleared: true });
                } catch (err) {
                  setError(err.message);
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-mono text-[11px] border border-tertiary/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">cleaning_services</span> Clear My Messages
            </button>

            {!isOwner && (
              <GhostButton onClick={leave} className="w-full py-1.5 text-error border-error/30 hover:bg-error-container/30 text-xs font-mono">
                <span className="material-symbols-outlined text-[14px]">logout</span> Leave Room
              </GhostButton>
            )}

            {isOwner && (
              <GhostButton
                onClick={async () => {
                  if (!window.confirm('Permanently delete this room for all players?')) return;
                  try {
                    await conversationService.remove(conversation._id);
                    onChanged?.({ deleted: true });
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="w-full py-1.5 text-error border-error/30 hover:bg-error-container/30 text-xs font-mono"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span> Delete Room
              </GhostButton>
            )}
          </div>
        )}
      </div>

      {/* Room Settings Modal */}
      {settingsOpen && (
        <RoomSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          conversation={conversation}
          currentUser={currentUser}
          onUpdated={(updated) => {
            setSettingsOpen(false);
            onChanged?.(updated);
          }}
        />
      )}
    </div>
  );
}

function MemberItem({
  m,
  online,
  role,
  canManageRoles,
  canRemove,
  onRemove,
  onRoleChange,
  isEditingRole,
  onToggleRoleEdit,
}) {
  const mId = m._id || m.id;

  const roleBadgeStyle = {
    Owner: {
      cls: 'bg-[#844721] text-[#FCECD8] border-[#331100]',
      icon: 'star',
    },
    Admin: {
      cls: 'bg-secondary-container text-on-secondary-container border-secondary/40',
      icon: 'shield_person',
    },
    Moderator: {
      cls: 'bg-surface-variant text-tertiary border-tertiary/40',
      icon: 'gavel',
    },
    Member: {
      cls: 'bg-surface-container text-on-surface-variant border-tertiary/20',
      icon: 'person',
    },
  }[role] || {
    cls: 'bg-surface-container text-on-surface-variant border-tertiary/20',
    icon: 'person',
  };

  return (
    <div className={`p-1.5 rounded-lg transition-colors ${online ? 'bg-surface/80 hover:bg-surface-container-low/50' : 'bg-transparent hover:bg-surface/40'}`}>
      <div className="flex items-center justify-between gap-1.5">
        {/* User Info Brief */}
        <Link
          href={`/profile/${m.username}`}
          title={`View @${m.username}'s profile`}
          className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="relative shrink-0">
            <Avatar src={avatarSrc(m.avatarId)} alt={m.displayName} size={26} online={online} ring={false} />
          </div>
          <div className="min-w-0">
            <span className={`font-body-sm text-[11px] truncate block leading-tight ${online ? 'font-bold text-on-surface' : 'text-on-surface/80'}`}>
              {m.displayName || m.username}
            </span>
            <span className="font-mono text-[9px] text-tertiary block truncate">@{m.username}</span>
          </div>
        </Link>

        {/* Role Badge & Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            onClick={canManageRoles ? onToggleRoleEdit : undefined}
            className={`inline-flex items-center gap-0.5 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase transition-all ${roleBadgeStyle.cls} ${
              canManageRoles ? 'cursor-pointer hover:brightness-105' : ''
            }`}
            title={canManageRoles ? 'Click to change role' : role}
          >
            <span className="material-symbols-outlined text-[10px]">{roleBadgeStyle.icon}</span>
            <span>{role}</span>
          </span>

          {canManageRoles && (
            <button
              type="button"
              onClick={onToggleRoleEdit}
              title="Assign role"
              className="p-0.5 rounded text-tertiary hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">edit_note</span>
            </button>
          )}

          {canRemove && (
            <button
              onClick={() => onRemove(mId)}
              title="Remove player"
              aria-label="Remove member"
              className="p-0.5 rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">person_remove</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Picker In-Place Drawer */}
      {isEditingRole && (
        <div className="mt-1.5 p-2 bg-surface-container border border-tertiary/30 rounded-lg space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold text-tertiary uppercase">Assign Role:</span>
            <button onClick={onToggleRoleEdit} className="text-outline text-[10px] font-mono hover:text-tertiary">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {['Admin', 'Member'].map((r) => (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={`py-1 px-1.5 rounded font-mono text-[10px] font-bold border text-center transition-all ${
                  role === r
                    ? 'bg-primary text-surface-container border-primary'
                    : 'bg-surface text-on-surface border-tertiary/20 hover:bg-secondary-container/30'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
