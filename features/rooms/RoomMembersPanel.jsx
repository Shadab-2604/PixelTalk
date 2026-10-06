/**
 * File: RoomMembersPanel.jsx
 *
 * Responsibility:
 * Right inspector panel displaying conversation details, membership roster,
 * member role assignments, and personal conversation actions (pin, mute, vibrate).
 *
 * Layer:
 * Frontend / Rooms Feature UI
 *
 * Connected to:
 * - frontend/app/rooms/[conversationId]/page.jsx
 * - frontend/features/rooms/RoomSettingsModal.jsx
 * - frontend/services/conversationService.js
 * - frontend/services/userService.js
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import { Avatar, Badge, Input, ErrorText, PrimaryButton, GhostButton } from '@/components/ui';
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

  // DIRECT CHAT VIEW
  if (conversation?.type === 'direct') {
    const other = otherMember(conversation, currentUser);
    const online = other ? isOnline(other._id || other.id) : false;

    return (
      <div className="space-y-4">
        <div className="bg-surface rounded-xl p-5 border border-tertiary/20 shadow-pixel-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-xl bg-surface-container border-2 border-tertiary flex items-center justify-center shadow-pixel-sm-solid relative mb-3 overflow-hidden">
            <Avatar src={avatarSrc(other?.avatarId || 'avatar-01')} alt="" size={60} online={online} />
          </div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            {other?.displayName || other?.username || 'Player'}
          </h2>
          <p className="font-mono text-label-sm text-primary font-bold mt-0.5">
            @{other?.username || 'player'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            <Badge tone={online ? 'green' : 'brown'}>{online ? 'ONLINE' : 'OFFLINE'}</Badge>
            {isMuted && <Badge tone="error">MUTED</Badge>}
            {isVibrate && <Badge tone="green">VIBRATE</Badge>}
            <Badge tone="outline">DIRECT</Badge>
          </div>

          {other?.bio && (
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-2.5 bg-surface-container/60 p-2.5 rounded-lg border border-tertiary/10 italic">
              &ldquo;{other.bio}&rdquo;
            </p>
          )}

          {other?.customStatus && (
            <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-label-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/20">
              <span className="material-symbols-outlined text-[12px]">chat_bubble_outline</span>
              <span>{other.customStatus}</span>
            </div>
          )}

          {/* Direct Chat Quick Controls */}
          <div className="mt-4 pt-3 border-t border-tertiary/10 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute chat' : 'Mute chat'}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border font-mono text-label-xs transition-colors ${
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
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border font-mono text-label-xs transition-colors ${
                  isVibrate
                    ? 'bg-secondary-container text-on-secondary-container font-bold border-tertiary/30'
                    : 'bg-surface-container border-tertiary/20 hover:bg-secondary-container/40 text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isVibrate ? 'vibration' : 'mobile_off'}
                </span>
                <span>{isVibrate ? 'Vibrate: On' : 'Vibrate: Off'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={togglePin}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-label-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPinned ? 'keep_off' : 'keep'}
              </span>
              <span>{isPinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
            </button>

            {other?._id && (
              <Link href={`/profile?userId=${other._id}`} className="block">
                <GhostButton className="w-full py-1.5 text-label-xs">
                  <span className="material-symbols-outlined text-[14px]">person</span> View Player Profile
                </GhostButton>
              </Link>
            )}

            <ConversationActionsMenu
              conversation={conversation}
              currentUser={effectiveUser}
              buttonStyle="panel"
              onCleared={() => onChanged?.({ cleared: true })}
              onDeleted={() => onChanged?.({ deleted: true })}
            />
          </div>
        </div>
      </div>
    );
  }

  // GROUP ROOM VIEW
  const isOwner =
    conversation.createdBy &&
    (conversation.createdBy._id || conversation.createdBy) === currentUserId;
  const isAdmin =
    isOwner ||
    (Array.isArray(conversation.admins) &&
      conversation.admins.some((a) => (a._id || a) === currentUserId));

  const members = conversation.members || [];
  const pastMembers = Array.isArray(conversation.pastMembers) ? conversation.pastMembers : [];
  const online = members.filter((m) => isOnline(m._id || m.id));
  const offline = members.filter((m) => !isOnline(m._id || m.id));

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
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'ADMINS' | 'MODS' | 'MEMBERS' | 'ONLINE'

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
    <div className="space-y-4">
      {/*
       * ============================================================
       * 1. GROUP HEADER & HERO (Stitch Group Profile Hero)
       * ============================================================
       * WHAT: Group avatar with pixel border, name, description,
       * live member count, and current user role badge.
       * WHY: Establishes clear visual hierarchy and role context.
       */}
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl overflow-hidden shadow-[2px_2px_0_0_#6E3511]">
        {/* Decorative Top Accent Bar */}
        <div className="h-16 w-full bg-surface-container relative overflow-hidden bg-pixel-grid border-b-2 border-tertiary/20 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 bg-surface/90 border border-tertiary/30 px-2 py-0.5 rounded text-[10px] font-mono text-tertiary font-bold uppercase">
            <span className="w-2 h-2 bg-primary-container inline-block" />
            <span>ROOM #{conversation.name?.slice(0, 12)}</span>
          </div>
          <span className="font-mono text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded border border-tertiary/20 font-bold uppercase">
            YOUR ROLE: {myRole.toUpperCase()}
          </span>
        </div>

        {/* Identity Row: Avatar crossing boundary & Titles */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-end gap-3 -mt-9">
            {/* 64x64 Avatar with Pixel Border & Online Beacon */}
            <div className="relative w-16 h-16 bg-surface border-2 border-[#6E3511] rounded-xl shadow-[2px_2px_0_0_#6E3511] p-0.5 shrink-0 overflow-hidden">
              {conversation.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={conversation.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc(conversation.avatarId || 'avatar-06')} alt="" className="w-full h-full object-cover rounded-lg pixelated" />
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary-container border-2 border-surface-container-lowest" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-headline-sm font-bold text-on-surface truncate">
                #{conversation.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-tertiary">
                <span className="font-bold">{members.length} members</span>
                <span>•</span>
                <span className="text-primary font-bold">{online.length} online</span>
              </div>
            </div>
          </div>

          {conversation.description && (
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-2.5 leading-snug">
              {conversation.description}
            </p>
          )}

          {/* Group Header Actions */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-tertiary/15 flex-wrap">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share room link"
              className="flex-1 min-w-[100px] flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-surface-container border border-tertiary/30 hover:bg-secondary-container/40 text-on-surface font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'share'}</span>
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={togglePin}
              aria-label={isPinned ? 'Unpin room' : 'Pin room'}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-surface-container border border-tertiary/30 hover:bg-secondary-container/40 text-on-surface font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">{isPinned ? 'keep_off' : 'keep'}</span>
              <span>{isPinned ? 'Unpin' : 'Pin'}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute room' : 'Mute room'}
              className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                isMuted
                  ? 'bg-error-container text-error border-error/40'
                  : 'bg-surface-container border-tertiary/30 text-on-surface hover:bg-secondary-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isMuted ? 'notifications_off' : 'notifications'}
              </span>
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {canEditRoom && (
              <button
                type="button"
                onClick={() => {
                  sfx.click();
                  setSettingsOpen(true);
                }}
                aria-label="Open room settings"
                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-secondary-container text-on-secondary-container border border-tertiary/30 font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">settings</span>
                <span>Settings</span>
              </button>
            )}
          </div>

          <ConversationActionsMenu
            conversation={conversation}
            currentUser={effectiveUser}
            buttonStyle="panel"
            className="mt-3"
            onCleared={() => onChanged?.({ cleared: true })}
            onDeleted={() => onChanged?.({ deleted: true })}
          />
        </div>
      </div>

      {/*
       * ============================================================
       * 2. GROUP INFORMATION SECTION (Stitch 4-Card Strip)
       * ============================================================
       * WHAT: Owner card, Messaging rule, Invitation rule, Total members.
       */}
      <div className="grid grid-cols-2 gap-2 text-left">
        {/* Card 1: Owner */}
        <div className="bg-surface-container-low border border-tertiary/30 p-2.5 rounded-lg shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-outline uppercase font-bold tracking-wider">Group Owner</span>
            <span className="material-symbols-outlined text-xs text-tertiary">workspace_premium</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar src={avatarSrc(ownerMember?.avatarId || 'avatar-01')} size={20} ring={false} />
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold text-on-surface truncate leading-tight">
                {ownerMember?.displayName || 'Owner'}
              </p>
              <p className="font-mono text-[9px] text-tertiary truncate">@{ownerMember?.username || 'user'}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Messaging Rule */}
        <div className="bg-surface-container-low border border-tertiary/30 p-2.5 rounded-lg shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-outline uppercase font-bold tracking-wider">Messaging</span>
            <span className="material-symbols-outlined text-xs text-primary">chat</span>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold text-on-surface leading-tight">
              {conversation.settings?.adminOnlyChat ? 'Admins only' : 'Everyone'}
            </p>
            <p className="font-mono text-[9px] text-outline">
              {conversation.settings?.adminOnlyChat ? 'Broadcast stage' : 'Open chat'}
            </p>
          </div>
        </div>

        {/* Card 3: Invitation Rule */}
        <div className="bg-surface-container-low border border-tertiary/30 p-2.5 rounded-lg shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-outline uppercase font-bold tracking-wider">Invites</span>
            <span className="material-symbols-outlined text-xs text-tertiary">badge</span>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold text-on-surface leading-tight">
              {conversation.settings?.invitePermission === 'ADMINS_ONLY' ? 'Admins only' : 'Anyone'}
            </p>
            <p className="font-mono text-[9px] text-outline">Must accept invite</p>
          </div>
        </div>

        {/* Card 4: Total Members & Past Members */}
        <div className="bg-surface-container-low border border-tertiary/30 p-2.5 rounded-lg shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-outline uppercase font-bold tracking-wider">Roster</span>
            <span className="material-symbols-outlined text-xs text-primary-container">groups</span>
          </div>
          <div>
            <p className="font-mono text-[11px] font-bold text-on-surface leading-tight">{members.length} Active</p>
            <p className="font-mono text-[9px] text-outline">{pastMembers.length} Past • {online.length} Online</p>
          </div>
        </div>
      </div>

      {/*
       * ============================================================
       * 3. MEMBERS SECTION (Search, Filter Chips & Member List)
       * ============================================================
       * WHAT: Search field, filter chips (All, Admins, Mods, Members, Online, Past),
       * and list of active members or past members with role badges.
       */}
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl p-3 shadow-[2px_2px_0_0_#6E3511] space-y-3">
        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary/50 text-[16px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search members by name or @..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface border border-tertiary/30 rounded-lg font-mono text-[11px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:shadow-[1px_1px_0_0_#426010]"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
          {[
            { id: 'ALL', label: `All (${members.length})` },
            { id: 'ADMINS', label: 'Admins' },
            { id: 'MODS', label: 'Mods' },
            { id: 'MEMBERS', label: 'Members' },
            { id: 'ONLINE', label: `Online (${online.length})` },
            { id: 'PAST', label: `Past (${pastMembers.length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRoleFilter(f.id)}
              className={`px-2 py-0.5 rounded border transition-all ${
                roleFilter === f.id
                  ? 'bg-primary text-surface-container font-bold border-primary shadow-[1px_1px_0_0_#426010]'
                  : 'bg-surface-container text-tertiary border-tertiary/20 hover:bg-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Invite Bar - Respects invitePermission */}
        {(isAdmin || conversation.settings?.invitePermission !== 'ADMINS_ONLY') && (
          <div className="pt-1 border-t border-tertiary/15">
            {adding ? (
              <div className="space-y-1.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-primary text-[15px]">
                    person_add
                  </span>
                  <input
                    placeholder="Search username to invite…"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-surface border border-tertiary/30 rounded-lg font-mono text-[11px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                {inviteSuccess && (
                  <p className="font-mono text-[10px] text-primary font-bold">{inviteSuccess}</p>
                )}
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addMember(u.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg border border-tertiary/20 bg-surface hover:bg-secondary-container/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={avatarSrc(u.avatarId)} size={22} ring={false} />
                      <div className="min-w-0">
                        <span className="font-body-sm text-[12px] font-bold block truncate">{u.displayName}</span>
                        <span className="font-mono text-[10px] text-outline block">@{u.username}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold bg-primary text-surface-container px-2 py-0.5 rounded border border-primary/40 shrink-0">
                      INVITE
                    </span>
                  </button>
                ))}
                <GhostButton
                  onClick={() => {
                    setAdding(false);
                    setQuery('');
                    setResults([]);
                    setInviteSuccess('');
                  }}
                  className="w-full py-1 text-xs"
                >
                  Done
                </GhostButton>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface text-tertiary border border-tertiary/30 hover:bg-secondary-container/30 font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                <span>+ Invite Members</span>
              </button>
            )}
          </div>
        )}

        {/* Member Rows or Past Member Rows */}
        {roleFilter === 'PAST' ? (
          <div className="divide-y divide-tertiary/15 max-h-72 overflow-y-auto pr-1">
            {pastMembers.length === 0 ? (
              <p className="font-mono text-[11px] text-outline text-center py-4">No past members found for this room.</p>
            ) : (
              pastMembers.map((pm, idx) => {
                const u = pm.userId || {};
                const uId = u._id || u.id || pm._id || idx;
                const isRemoved = pm.action === 'REMOVED';
                return (
                  <div key={uId} className="p-2 rounded-lg bg-surface-container-low/40 hover:bg-surface/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar src={avatarSrc(u.avatarId)} alt={u.displayName || 'Player'} size={28} ring={false} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-body-sm text-[12px] font-bold text-on-surface/80 truncate">
                              {u.displayName || u.username || 'Former Player'}
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold text-outline border-outline/30">
                              PAST
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-tertiary block truncate">
                            @{u.username || 'player'} • {isRemoved ? 'Removed' : 'Left'} {pm.leftAt ? new Date(pm.leftAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isRemoved
                              ? 'bg-error-container/40 text-error border-error/30'
                              : 'bg-surface-variant text-tertiary border-tertiary/20'
                          }`}
                        >
                          {isRemoved ? 'Removed' : 'Left Room'}
                        </span>
                        {(isAdmin || conversation.settings?.invitePermission !== 'ADMINS_ONLY') && u._id && (
                          <button
                            type="button"
                            onClick={() => addMember(u._id)}
                            className="font-mono text-[9px] font-bold bg-primary text-surface-container px-2 py-0.5 rounded border border-primary/40 hover:brightness-110 press cursor-pointer"
                            title="Invite back to room"
                          >
                            + Re-invite
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-tertiary/15 max-h-72 overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <p className="font-mono text-[11px] text-outline text-center py-4">No matching members found.</p>
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

      {/* Danger Zone: Leave / Delete room */}
      <div className="pt-2 space-y-1.5">
        {!isOwner && (
          <GhostButton onClick={leave} className="w-full py-1.5 text-error border-error/30 hover:bg-error-container/30 text-xs font-mono">
            <span className="material-symbols-outlined text-[16px]">logout</span> Leave Room
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
            <span className="material-symbols-outlined text-[16px]">delete</span> Delete Room
          </GhostButton>
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
      cls: 'bg-[#844721] text-[#FCECD8] border-[#331100] shadow-[1px_1px_0_0_#331100]',
      icon: 'star',
    },
    Admin: {
      cls: 'bg-secondary-container text-on-secondary-container border-secondary/40 shadow-[1px_1px_0_0_#426010]',
      icon: 'shield_person',
    },
    Moderator: {
      cls: 'bg-surface-variant text-tertiary border-tertiary/40 shadow-[1px_1px_0_0_#6E3511]',
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
    <div className={`p-2 rounded-lg transition-colors ${online ? 'bg-surface/80 hover:bg-surface-container-low/50' : 'bg-transparent hover:bg-surface/40'}`}>
      <div className="flex items-center justify-between gap-2">
        {/* User Info Brief */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Avatar src={avatarSrc(m.avatarId)} alt={m.displayName} size={28} online={online} ring={false} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className={`font-body-sm text-[12px] truncate ${online ? 'font-bold text-on-surface' : 'text-on-surface/80'}`}>
                {m.displayName || m.username}
              </span>
            </div>
            <span className="font-mono text-[10px] text-tertiary block truncate">@{m.username}</span>
          </div>
        </div>

        {/* Role Badge & Contextual Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            onClick={canManageRoles ? onToggleRoleEdit : undefined}
            className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase transition-all ${roleBadgeStyle.cls} ${
              canManageRoles ? 'cursor-pointer hover:brightness-105 active:scale-95' : ''
            }`}
            title={canManageRoles ? 'Click to change role' : role}
          >
            <span className="material-symbols-outlined text-[11px]">{roleBadgeStyle.icon}</span>
            <span>{role}</span>
          </span>

          {canManageRoles && (
            <button
              type="button"
              onClick={onToggleRoleEdit}
              title="Assign role (Admin or Member)"
              className="p-1 rounded text-tertiary hover:text-primary hover:bg-secondary-container/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
            </button>
          )}

          {canRemove && (
            <button
              onClick={() => onRemove(mId)}
              title="Remove player"
              aria-label="Remove member"
              className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">person_remove</span>
            </button>
          )}

          <span
            className={`w-2 h-2 rounded-none inline-block border ${
              online ? 'bg-primary-container border-surface' : 'bg-outline/30 border-transparent'
            }`}
            title={online ? 'Online' : 'Offline'}
          />
        </div>
      </div>

      {/* Role Assignment Bar */}
      {isEditingRole && (
        <div className="mt-2 pt-2 border-t border-tertiary/15 flex flex-wrap items-center justify-between gap-1.5 bg-surface-container/70 p-2 rounded-lg border border-tertiary/20">
          <span className="font-mono text-[10px] text-tertiary font-bold uppercase flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">manage_accounts</span>
            <span>Assign Role:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'Admin', label: '🛡️ Admin', desc: 'Can manage members & settings' },
              { id: 'Member', label: '👤 Member', desc: 'Standard room participant' },
              { id: 'Moderator', label: '⚖️ Mod', desc: 'Can remove members' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRoleChange(r.id)}
                title={r.desc}
                className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded border transition-all cursor-pointer press ${
                  role === r.id
                    ? 'bg-primary text-surface-container border-primary shadow-[1px_1px_0_0_#426010]'
                    : 'bg-surface hover:bg-secondary-container/40 text-on-surface border-tertiary/20'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
