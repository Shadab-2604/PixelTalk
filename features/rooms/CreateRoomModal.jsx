/*
 * ============================================================
 * PIXELTALK — CREATE ROOM MODAL (CreateRoomModal.jsx)
 * ============================================================
 *
 * WHAT:
 * Modal dialog for creating new community groups, rooms, and lounges.
 * Supports:
 * - Setting group name and description
 * - Choosing a PixelTalk retro avatar OR uploading a custom photo via Cloudinary
 * - Live interactive image cropping, camera capture, and 25MB validation
 * - Configuring group messaging permissions (Everyone vs Admins Only)
 * - Configuring group invitation permissions (Anyone vs Admins Only)
 * - Inviting players (who receive PENDING invitations requiring approval)
 * - Real-time live card preview before submission
 *
 * WHY:
 * Centralizes room creation with rich custom photo and granular permission
 * defaults right at creation time, ensuring the creator becomes OWNER and ADMIN
 * while invitations require recipient consent.
 *
 * HOW:
 * 1. Custom image files are cropped via MediaCropCameraModal and uploaded to
 *    POST /api/conversations/upload-avatar (Cloudinary).
 * 2. Payload includes settings: { adminOnlyChat, invitePermission }.
 * 3. Backend createGroup creates the conversation, assigns Owner/Admin role
 *    to creator, and converts memberIds into PENDING GroupInvitations.
 *
 * SECURITY:
 * - 25MB file size and MIME-type restrictions validated on client and backend.
 * - Group permissions are saved directly to MongoDB on creation.
 * ============================================================
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { conversationService } from '@/services/conversationService';
import { userService } from '@/services/userService';
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  Input,
  Field,
  ErrorText,
  PixelRadio,
  Avatar,
  Badge,
  PasswordInput,
} from '@/components/ui';
import { AVATAR_IDS } from '@/lib/config';
import { avatarSrc } from '@/lib/avatars';
import { useSound } from '@/hooks/useSound';
import { MediaCropCameraModal } from '@/components/MediaCropCameraModal';

export function CreateRoomModal({ open, onClose }) {
  const router = useRouter();
  const { play } = useSound();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarMode, setAvatarMode] = useState('retro'); // 'retro' | 'custom'
  const [avatarId, setAvatarId] = useState(AVATAR_IDS[5]);
  const [customPhoto, setCustomPhoto] = useState(null); // { avatarUrl, avatarPublicId }
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [privacy, setPrivacy] = useState('invite'); // invite = members added by owner; private = passcode
  const [passcode, setPasscode] = useState('');
  const [adminOnlyChat, setAdminOnlyChat] = useState(false);
  const [invitePermission, setInvitePermission] = useState('ANY_MEMBER'); // 'ANY_MEMBER' | 'ADMINS_ONLY'
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const data = await userService.search(query);
        setResults((data.users || []).filter((u) => !members.some((m) => m.id === u.id)));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, members]);

  const addMember = (u) => {
    setMembers((prev) => [...prev, u]);
    setQuery('');
    setResults([]);
  };

  const handleCustomUploadSuccess = async (croppedFile) => {
    const data = await conversationService.uploadAvatar(croppedFile);
    setCustomPhoto({
      avatarUrl: data.avatarUrl,
      avatarPublicId: data.avatarPublicId,
    });
    setAvatarMode('custom');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        avatarId,
        avatarUrl: avatarMode === 'custom' && customPhoto ? customPhoto.avatarUrl : '',
        avatarPublicId: avatarMode === 'custom' && customPhoto ? customPhoto.avatarPublicId : '',
        memberIds: members.map((m) => m.id),
        privacy,
        settings: {
          adminOnlyChat,
          invitePermission,
        },
      };
      if (privacy === 'private') payload.passcode = passcode;
      const data = await conversationService.createGroup(payload);
      play('room-created');
      onClose();
      router.push(`/rooms/${data.conversation._id}`);
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} kicker="NEW CONVERSATION SPACE" title="Create New Group" maxW="max-w-2xl">
        <form onSubmit={submit} className="space-y-6">
          {/*
           * ============================================================
           * 1. GROUP IDENTITY SECTION (Stitch Step 01)
           * ============================================================
           * WHAT: Avatar preview, retro sprite selector (10 approved avatars),
           * and custom photo upload with crop functionality.
           * WHY: Establishes immediate group visual identity before details.
           * HOW: Allows toggling between retro pixel sprites and custom Cloudinary photo.
           */}
          <section className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl p-4 sm:p-5 shadow-[2px_2px_0_0_#6E3511]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-tertiary/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-primary-container inline-block" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Group Identity</h3>
              </div>
              <span className="text-label-sm font-label-sm text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20 font-bold uppercase">
                Step 01
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
              {/* Crest Avatar Preview */}
              <div className="flex flex-col items-center gap-2 shrink-0 self-center sm:self-start">
                <div className="relative w-24 h-24 bg-surface-container rounded-xl border-2 border-[#6E3511] p-1 shadow-[2px_2px_0_0_#6E3511]">
                  <div className="w-full h-full bg-surface-variant rounded-lg overflow-hidden flex items-center justify-center border border-dashed border-tertiary/40">
                    {avatarMode === 'custom' && customPhoto?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={customPhoto.avatarUrl} alt="Custom group preview" className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc(avatarId)} alt="Selected retro avatar" className="w-full h-full object-cover pixelated" />
                    )}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-primary-container text-surface-container w-5 h-5 rounded flex items-center justify-center border border-[#6E3511] shadow-[1px_1px_0_0_#6E3511]">
                    <span className="material-symbols-outlined text-[13px] font-bold">done</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-tertiary font-bold tracking-wider uppercase">Crest Preview</span>
              </div>

              {/* Selector Controls */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvatarMode('retro')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-label-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                      avatarMode === 'retro'
                        ? 'bg-secondary-container text-on-secondary-container border border-tertiary/40 shadow-[1px_1px_0_0_#6E3511]'
                        : 'bg-surface text-tertiary border border-tertiary/20 hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">palette</span>
                    <span>Pixel Avatars</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMode('custom');
                      if (!customPhoto) setPhotoModalOpen(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-label-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                      avatarMode === 'custom'
                        ? 'bg-secondary-container text-on-secondary-container border border-tertiary/40 shadow-[1px_1px_0_0_#6E3511]'
                        : 'bg-surface text-tertiary border border-tertiary/20 hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">upload</span>
                    <span>{customPhoto ? 'Custom Image' : 'Upload Photo'}</span>
                  </button>

                  {customPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPhoto(null);
                        setAvatarMode('retro');
                      }}
                      className="p-1.5 text-error hover:bg-error-container/30 rounded-lg press"
                      title="Remove custom image"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>

                {avatarMode === 'retro' ? (
                  <div>
                    <span className="block font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mb-1.5">
                      Approved PixelTalk Sprites (10)
                    </span>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {AVATAR_IDS.map((id) => {
                        const isSelected = avatarId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setAvatarId(id)}
                            className={`p-0.5 rounded-lg border-2 transition-all relative aspect-square ${
                              isSelected
                                ? 'border-primary bg-secondary-container/40 shadow-[1px_1px_0_0_#426010] ring-1 ring-primary'
                                : 'border-tertiary/25 hover:border-tertiary/60 bg-surface'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={avatarSrc(id)} alt={id} className="w-full h-full object-cover rounded pixelated" />
                            {isSelected && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full text-on-primary flex items-center justify-center text-[9px] font-bold">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-container-low rounded-lg border border-tertiary/20 flex items-center justify-between gap-3">
                    <div className="text-body-sm text-[12px] text-on-surface-variant">
                      {customPhoto?.avatarUrl ? (
                        <span className="text-primary font-bold">Custom Photo Ready (Cloudinary Synced)</span>
                      ) : (
                        <span>Upload a JPG/PNG. Interactive crop & camera available.</span>
                      )}
                    </div>
                    <SecondaryButton type="button" onClick={() => setPhotoModalOpen(true)} className="px-3 py-1 text-xs shrink-0">
                      {customPhoto ? 'Change Photo' : 'Upload & Crop'}
                    </SecondaryButton>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/*
           * ============================================================
           * 2. GROUP DETAILS SECTION (Stitch Step 02)
           * ============================================================
           * WHAT: Name with prefix, Description with character counter.
           */}
          <section className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl p-4 sm:p-5 shadow-[2px_2px_0_0_#6E3511]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-tertiary/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-secondary inline-block" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Group Details</h3>
              </div>
              <span className="text-label-sm font-label-sm text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20 font-bold uppercase">
                Step 02
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono text-label-sm font-bold text-on-surface flex items-center gap-1" htmlFor="room-name">
                    <span>Group Name</span>
                    <span className="text-error">*</span>
                  </label>
                  <span className="font-mono text-[11px] text-tertiary">{name.length}/40</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-tertiary font-bold text-base">#</span>
                  <input
                    id="room-name"
                    className="w-full pl-8 pr-4 py-2.5 bg-surface-bright border-2 border-[#6E3511]/40 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:shadow-[2px_2px_0_0_#426010] transition-all"
                    placeholder="e.g. PixelTalk Developers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={40}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-mono text-label-sm font-bold text-on-surface" htmlFor="room-desc">
                    Description
                  </label>
                  <span className="font-mono text-[11px] text-tertiary">{description.length}/240</span>
                </div>
                <textarea
                  id="room-desc"
                  rows={2}
                  className="w-full px-3 py-2 bg-surface-bright border-2 border-[#6E3511]/40 rounded-lg text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:shadow-[2px_2px_0_0_#426010] transition-all resize-none"
                  placeholder="What is this group about? Share guidelines, squad vibes, and goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={240}
                />
              </div>
            </div>
          </section>

          {/*
           * ============================================================
           * 3. PARTICIPATION & PERMISSIONS SECTION (Stitch Step 03)
           * ============================================================
           * WHAT: Human-readable cards for Messaging and Invitations.
           * Selected state has green container highlight, primary border, check indicator.
           * Includes clear note: "Invited users must accept before joining."
           */}
          <section className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-xl p-4 sm:p-5 shadow-[2px_2px_0_0_#6E3511]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-tertiary/15">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-tertiary inline-block" />
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Participation & Permissions</h3>
              </div>
              <span className="text-label-sm font-label-sm text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20 font-bold uppercase">
                Step 03
              </span>
            </div>

            <div className="space-y-5">
              {/* MESSAGING PERMISSIONS */}
              <div>
                <label className="block font-mono text-label-sm font-bold text-on-surface mb-2">
                  Who can send messages?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card: EVERYONE */}
                  <div
                    onClick={() => setAdminOnlyChat(false)}
                    className={`relative rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 border-2 ${
                      !adminOnlyChat
                        ? 'bg-secondary-container/50 border-primary shadow-[2px_2px_0_0_#426010]'
                        : 'bg-surface border-tertiary/30 hover:border-tertiary/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        !adminOnlyChat
                          ? 'bg-primary text-on-primary border-[#6E3511]'
                          : 'bg-surface border-tertiary/40'
                      }`}
                    >
                      {!adminOnlyChat && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-label-md font-bold text-on-surface block">EVERYONE</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                        All group members can post messages in the chat.
                      </p>
                    </div>
                  </div>

                  {/* Card: ADMINS ONLY */}
                  <div
                    onClick={() => setAdminOnlyChat(true)}
                    className={`relative rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 border-2 ${
                      adminOnlyChat
                        ? 'bg-secondary-container/50 border-primary shadow-[2px_2px_0_0_#426010]'
                        : 'bg-surface border-tertiary/30 hover:border-tertiary/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        adminOnlyChat
                          ? 'bg-primary text-on-primary border-[#6E3511]'
                          : 'bg-surface border-tertiary/40'
                      }`}
                    >
                      {adminOnlyChat && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-label-md font-bold text-on-surface block">ADMINS ONLY</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                        Broadcast mode: Only owners and admins can send messages.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INVITATION PERMISSIONS */}
              <div>
                <label className="block font-mono text-label-sm font-bold text-on-surface mb-2">
                  Who can invite new members?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card: ANY MEMBER */}
                  <div
                    onClick={() => setInvitePermission('ANY_MEMBER')}
                    className={`relative rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 border-2 ${
                      invitePermission === 'ANY_MEMBER'
                        ? 'bg-secondary-container/50 border-primary shadow-[2px_2px_0_0_#426010]'
                        : 'bg-surface border-tertiary/30 hover:border-tertiary/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        invitePermission === 'ANY_MEMBER'
                          ? 'bg-primary text-on-primary border-[#6E3511]'
                          : 'bg-surface border-tertiary/40'
                      }`}
                    >
                      {invitePermission === 'ANY_MEMBER' && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-label-md font-bold text-on-surface block">ANY MEMBER</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                        Anyone in the group can search and invite new players.
                      </p>
                    </div>
                  </div>

                  {/* Card: ADMINS ONLY */}
                  <div
                    onClick={() => setInvitePermission('ADMINS_ONLY')}
                    className={`relative rounded-xl p-3.5 cursor-pointer transition-all flex items-start gap-3 border-2 ${
                      invitePermission === 'ADMINS_ONLY'
                        ? 'bg-secondary-container/50 border-primary shadow-[2px_2px_0_0_#426010]'
                        : 'bg-surface border-tertiary/30 hover:border-tertiary/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        invitePermission === 'ADMINS_ONLY'
                          ? 'bg-primary text-on-primary border-[#6E3511]'
                          : 'bg-surface border-tertiary/40'
                      }`}
                    >
                      {invitePermission === 'ADMINS_ONLY' && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                    <div>
                      <span className="font-mono text-label-md font-bold text-on-surface block">ADMINS ONLY</span>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                        Only group owners and admins can invite new players.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invitation Consent Notification Callout */}
              <div className="bg-surface-container-low border border-tertiary/30 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-surface-container text-tertiary flex items-center justify-center shrink-0 border border-tertiary/40 shadow-[1px_1px_0_0_#844721]">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div className="space-y-0.5">
                  <span className="font-mono text-[11px] font-bold text-tertiary tracking-wide uppercase block">
                    Invitation Approval
                  </span>
                  <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                    Invited users must accept before joining. Uninvited players cannot join directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/*
           * ============================================================
           * 4. LIVE GROUP RULES SUMMARY & PREVIEW (Stitch Summary Strip)
           * ============================================================
           */}
          <section className="bg-surface-container border-2 border-[#6E3511] rounded-xl p-4 shadow-[2px_2px_0_0_#6E3511]">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="material-symbols-outlined text-[18px] text-tertiary">gavel</span>
              <h4 className="font-mono text-label-sm font-bold text-tertiary uppercase tracking-wider">
                Group Rules Summary
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-surface-container-lowest border border-tertiary/25 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-[11px] text-on-surface-variant">Messages:</span>
                <span className="font-mono text-[11px] font-bold text-primary bg-secondary-container/60 px-2 py-0.5 rounded">
                  {adminOnlyChat ? 'Admins only' : 'Everyone'}
                </span>
              </div>
              <div className="bg-surface-container-lowest border border-tertiary/25 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-[11px] text-on-surface-variant">Invitations:</span>
                <span className="font-mono text-[11px] font-bold text-tertiary bg-surface-container-high px-2 py-0.5 rounded">
                  {invitePermission === 'ADMINS_ONLY' ? 'Admins only' : 'Anyone'}
                </span>
              </div>
              <div className="bg-surface-container-lowest border border-tertiary/25 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="font-mono text-[11px] text-on-surface-variant">Approval:</span>
                <span className="font-mono text-[11px] font-bold text-secondary bg-surface-variant px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  <span>Required</span>
                </span>
              </div>
            </div>
          </section>

          {/* Invite Players search field (Existing functionality) */}
          <Field
            label="Initial Invites (Optional)"
            hint="Players will receive an invite notification and must accept before joining."
          >
            <div className="p-2 bg-surface-container-lowest border-[1.5px] border-tertiary/40 rounded-lg shadow-pixel-sm flex flex-wrap items-center gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container font-mono text-label-sm border border-tertiary/30"
                >
                  <span className="w-1.5 h-1.5 bg-primary-container" />
                  {m.displayName}
                  <button
                    type="button"
                    className="hover:text-error text-xs font-bold leading-none ml-1"
                    onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[120px] bg-transparent border-none text-on-surface font-body-sm text-body-sm focus:outline-none p-1"
                placeholder="Type username to invite..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <div className="mt-1.5 border border-tertiary/25 rounded-lg bg-surface-container-lowest overflow-hidden max-h-40 overflow-y-auto">
                {results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addMember(u)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary-container/30 text-left"
                  >
                    <Avatar src={avatarSrc(u.avatarId)} size={24} online={false} ring={false} />
                    <span className="font-body-sm text-body-sm text-on-surface">{u.displayName}</span>
                    <span className="font-mono text-label-sm text-tertiary">@{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </Field>

          {error && <ErrorText>{error}</ErrorText>}

          {/*
           * ============================================================
           * 5. ACTION BUTTONS (Tactile Pixel Buttons)
           * ============================================================
           */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-tertiary/20">
            <SecondaryButton type="button" onClick={onClose} disabled={busy}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={busy}>
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>{busy ? 'CREATING…' : 'Create Group'}</span>
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Media Crop & Camera Modal for Group Photo */}
      <MediaCropCameraModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        title="Upload Group Photo"
        aspectRatio={1}
        uploadType="avatar"
        onUploadSuccess={handleCustomUploadSuccess}
      />
    </>
  );
}

