import { useState, useEffect } from 'react';
import { conversationService } from '@/services/conversationService';
import { AVATAR_IDS } from '@/lib/config';
import { avatarSrc } from '@/lib/avatars';
import {
  Modal,
  Input,
  Textarea,
  PrimaryButton,
  SecondaryButton,
  ErrorText,
  PasswordInput,
} from '@/components/ui';
import { sfx } from '@/lib/sound';
import { MediaCropCameraModal } from '@/components/MediaCropCameraModal';

export function RoomSettingsModal({ open, onClose, conversation, onUpdated, currentUser }) {
  const [tab, setTab] = useState('profile'); // 'profile' | 'messaging' | 'invitations' | 'roles' | 'privacy'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarId, setAvatarId] = useState('avatar-06');
  const [privacy, setPrivacy] = useState('invite');
  const [passcode, setPasscode] = useState('');
  const [avatarMode, setAvatarMode] = useState('retro'); // 'retro' | 'custom'
  const [customPhoto, setCustomPhoto] = useState(null); // { avatarUrl, avatarPublicId }
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [adminOnlyChat, setAdminOnlyChat] = useState(false);
  const [invitePermission, setInvitePermission] = useState('ANY_MEMBER'); // 'ANY_MEMBER' | 'ADMINS_ONLY'

  const [permissions, setPermissions] = useState({
    sendMessages: true,
    editRoom: false,
    manageMembers: false,
    manageRoles: false,
    deleteMessages: false,
    inviteMembers: true,
    removeMembers: false,
    managePasscode: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetFormFromConversation = () => {
    if (conversation) {
      setName(conversation.name || '');
      setDescription(conversation.description || '');
      setAvatarId(conversation.avatarId || 'avatar-06');
      if (conversation.avatarUrl) {
        setCustomPhoto({
          avatarUrl: conversation.avatarUrl,
          avatarPublicId: conversation.avatarPublicId || '',
        });
        setAvatarMode('custom');
      } else {
        setCustomPhoto(null);
        setAvatarMode('retro');
      }
      setPrivacy(conversation.privacy || 'invite');
      setPasscode('');

      if (conversation.settings) {
        setAdminOnlyChat(conversation.settings.adminOnlyChat === true);
        setInvitePermission(conversation.settings.invitePermission === 'ADMINS_ONLY' ? 'ADMINS_ONLY' : 'ANY_MEMBER');
      }

      if (conversation.permissions) {
        setPermissions({
          sendMessages: conversation.permissions.sendMessages !== false,
          editRoom: conversation.permissions.editRoom === true,
          manageMembers: conversation.permissions.manageMembers === true,
          manageRoles: conversation.permissions.manageRoles === true,
          deleteMessages: conversation.permissions.deleteMessages === true,
          inviteMembers: conversation.permissions.inviteMembers !== false,
          removeMembers: conversation.permissions.removeMembers === true,
          managePasscode: conversation.permissions.managePasscode === true,
        });
      }
    }
  };

  useEffect(() => {
    resetFormFromConversation();
  }, [conversation]);

  const isDirty =
    name !== (conversation?.name || '') ||
    description !== (conversation?.description || '') ||
    avatarId !== (conversation?.avatarId || 'avatar-06') ||
    (avatarMode === 'custom' && (customPhoto?.avatarUrl || '') !== (conversation?.avatarUrl || '')) ||
    (avatarMode === 'retro' && Boolean(conversation?.avatarUrl)) ||
    privacy !== (conversation?.privacy || 'invite') ||
    Boolean(passcode) ||
    adminOnlyChat !== (conversation?.settings?.adminOnlyChat === true) ||
    invitePermission !== (conversation?.settings?.invitePermission === 'ADMINS_ONLY' ? 'ADMINS_ONLY' : 'ANY_MEMBER');

  const handleCustomUploadSuccess = async (croppedFile) => {
    const data = await conversationService.uploadAvatar(croppedFile);
    setCustomPhoto({
      avatarUrl: data.avatarUrl,
      avatarPublicId: data.avatarPublicId,
    });
    setAvatarMode('custom');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const trimmedPass = passcode.trim();
      const wasPrivate = conversation?.privacy === 'private' || conversation?.hasPasscode;

      if (privacy === 'private') {
        if (!wasPrivate && (!trimmedPass || trimmedPass.length < 4)) {
          setError('Please enter a passcode of at least 4 characters to protect this room.');
          sfx.error();
          setBusy(false);
          return;
        }
        if (trimmedPass && trimmedPass.length < 4) {
          setError('New passcode must be at least 4 characters long.');
          sfx.error();
          setBusy(false);
          return;
        }
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        avatarId,
        avatarUrl: avatarMode === 'custom' && customPhoto ? customPhoto.avatarUrl : '',
        avatarPublicId: avatarMode === 'custom' && customPhoto ? customPhoto.avatarPublicId : '',
        privacy,
        settings: {
          adminOnlyChat,
          invitePermission,
        },
        permissions,
      };

      if (privacy === 'private') {
        if (trimmedPass) {
          payload.passcode = trimmedPass;
        }
      } else {
        // Explicitly clear passcode when moving to public or invite-only
        payload.passcode = '';
      }

      const updated = await conversationService.updateSettings(conversation._id, payload);
      sfx.success();
      setSuccess('Group settings updated successfully!');
      onUpdated?.(updated.conversation || updated);
      setPasscode('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      sfx.error();
      setError(err.message || 'Failed to update settings');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = () => {
    resetFormFromConversation();
    setError('');
    setSuccess('');
    sfx.click();
  };

  const TABS = [
    { id: 'profile', label: 'Group Profile', icon: 'badge' },
    { id: 'messaging', label: 'Messaging', icon: 'chat' },
    { id: 'invitations', label: 'Invitations', icon: 'person_add' },
    { id: 'roles', label: 'Members & Roles', icon: 'shield_person' },
    { id: 'privacy', label: 'Privacy', icon: 'lock' },
  ];

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        kicker="GROUP ADMINISTRATION"
        title={`#${conversation?.name || 'Group'} Settings`}
        maxW="max-w-3xl"
      >
        <div className="space-y-5 pb-14 sm:pb-0 relative">
          {/* Navigation Tabs Strip */}
          <div className="flex items-center gap-1.5 border-b border-tertiary/20 pb-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  sfx.click();
                  setTab(t.id);
                  setError('');
                  setSuccess('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase font-bold whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'bg-secondary-container text-on-secondary-container border border-tertiary/30 shadow-[1px_1px_0_0_#6E3511]'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Feedback messages */}
          {error && <ErrorText>{error}</ErrorText>}
          {success && (
            <div className="p-2.5 bg-secondary-container text-on-secondary-container rounded-lg font-mono text-[11px] font-bold border border-secondary/40 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/*
           * ============================================================
           * SECTION 1: GROUP PROFILE SETTINGS
           * ============================================================
           */}
          {tab === 'profile' && (
            <div className="space-y-4">
              {/* Avatar Manager */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-surface-container-low rounded-xl border border-tertiary/25">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-xl border-2 border-tertiary/40 overflow-hidden bg-surface-container shadow-[2px_2px_0_0_#6E3511]">
                    {avatarMode === 'custom' && customPhoto?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={customPhoto.avatarUrl} alt="Group crest" className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc(avatarId)} alt="Group crest" className="w-full h-full object-cover pixelated" />
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <h4 className="font-mono text-label-sm font-bold text-on-surface">Current Group Icon</h4>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Square JPG/PNG or Pixel Sprite. Stored on Cloudinary with interactive cropper.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPhotoModalOpen(true)}
                      className="px-3 py-1 rounded-lg bg-surface border border-tertiary/40 text-tertiary font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] hover:bg-surface-variant active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('retro')}
                      className={`px-3 py-1 rounded-lg border font-mono text-[11px] font-bold shadow-[1px_1px_0_0_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1 ${
                        avatarMode === 'retro'
                          ? 'bg-secondary-container border-secondary/40 text-on-secondary-container'
                          : 'bg-surface border-tertiary/40 text-tertiary hover:bg-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">videogame_asset</span>
                      <span>Pixel Sprite</span>
                    </button>
                    {customPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPhoto(null);
                          setAvatarMode('retro');
                        }}
                        className="px-2.5 py-1 rounded-lg text-error hover:bg-error-container/30 font-mono text-[11px] transition-colors"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pixel Sprite Picker (10 Approved Avatars) */}
              {avatarMode === 'retro' && (
                <div className="p-3 bg-surface-container-lowest rounded-xl border border-tertiary/20">
                  <span className="font-mono text-[10px] text-tertiary font-bold uppercase tracking-wider block mb-2">
                    Select Approved Pixel Sprite (10)
                  </span>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {AVATAR_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setAvatarId(id)}
                        className={`p-0.5 rounded-lg border-2 transition-all relative aspect-square ${
                          avatarId === id
                            ? 'border-primary bg-secondary-container/50 shadow-[1px_1px_0_0_#426010] ring-1 ring-primary'
                            : 'border-tertiary/25 hover:border-tertiary/60 bg-surface'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarSrc(id)} alt={id} className="w-full h-full object-cover rounded pixelated" />
                        {avatarId === id && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-on-primary rounded-full flex items-center justify-center text-[9px] font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Name & Description */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-mono text-label-sm font-bold text-on-surface">Group Name</label>
                    <span className="font-mono text-[11px] text-tertiary">{name.length}/40</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-tertiary font-bold">#</span>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      minLength={2}
                      maxLength={40}
                      className="pl-8 bg-surface"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-mono text-label-sm font-bold text-on-surface">Description</label>
                    <span className="font-mono text-[11px] text-tertiary">{description.length}/240</span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={240}
                    rows={3}
                    placeholder="What is discussed in this room?"
                    className="bg-surface"
                  />
                </div>
              </div>
            </div>
          )}

          {/*
           * ============================================================
           * SECTION 2: MESSAGING PERMISSIONS
           * ============================================================
           */}
          {tab === 'messaging' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Who can send messages?
                </h4>
                <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                  Control messaging access across all group text rooms.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: EVERYONE */}
                <div
                  onClick={() => setAdminOnlyChat(false)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    !adminOnlyChat
                      ? 'border-primary bg-secondary-container/40 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[16px]">public</span>
                      </div>
                      <div>
                        <span className="font-mono text-label-sm font-bold text-on-surface block">EVERYONE</span>
                        <span className="font-mono text-[10px] text-outline">Default open channel</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        !adminOnlyChat
                          ? 'border-primary bg-primary text-surface-container'
                          : 'border-tertiary/40 bg-surface'
                      }`}
                    >
                      {!adminOnlyChat && <span className="material-symbols-outlined text-[13px] font-bold">check</span>}
                    </div>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-3 leading-relaxed">
                    All group members can send messages, post voxel stickers, and interact freely.
                  </p>
                </div>

                {/* Option B: ADMINS ONLY */}
                <div
                  onClick={() => setAdminOnlyChat(true)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    adminOnlyChat
                      ? 'border-primary bg-secondary-container/40 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-primary-container text-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                      </div>
                      <div>
                        <span className="font-mono text-label-sm font-bold text-primary block">ADMINS ONLY</span>
                        <span className="font-mono text-[10px] text-secondary font-bold">Broadcast Mode</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        adminOnlyChat
                          ? 'border-primary bg-primary text-surface-container'
                          : 'border-tertiary/40 bg-surface'
                      }`}
                    >
                      {adminOnlyChat && <span className="material-symbols-outlined text-[13px] font-bold">check</span>}
                    </div>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-3 leading-relaxed">
                    Only owners and admins can send messages. Perfect for announcements and stage lounges.
                  </p>
                </div>
              </div>

              {adminOnlyChat && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container border border-tertiary/30">
                  <span className="text-base leading-none">🔒</span>
                  <p className="font-body-sm text-[11px] text-tertiary leading-relaxed">
                    <span className="font-bold">Admin-only chat active</span> — Regular members can read announcements,
                    react, and listen in voice rooms without posting in the main chat feed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/*
           * ============================================================
           * SECTION 3: INVITATION PERMISSIONS
           * ============================================================
           */}
          {tab === 'invitations' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Who can invite new members?
                </h4>
                <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                  Control how the community grows and who has gatekeeping authority.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: ANY MEMBER */}
                <div
                  onClick={() => setInvitePermission('ANY_MEMBER')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    invitePermission === 'ANY_MEMBER'
                      ? 'border-primary bg-secondary-container/40 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                      </div>
                      <div>
                        <span className="font-mono text-label-sm font-bold text-on-surface block">ANY MEMBER</span>
                        <span className="font-mono text-[10px] text-outline">Open Community</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        invitePermission === 'ANY_MEMBER'
                          ? 'border-primary bg-primary text-surface-container'
                          : 'border-tertiary/40 bg-surface'
                      }`}
                    >
                      {invitePermission === 'ANY_MEMBER' && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-3 leading-relaxed">
                    Any member can search and send invitation requests to other players.
                  </p>
                </div>

                {/* Option B: ADMINS ONLY */}
                <div
                  onClick={() => setInvitePermission('ADMINS_ONLY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    invitePermission === 'ADMINS_ONLY'
                      ? 'border-primary bg-secondary-container/40 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-primary-container text-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                      </div>
                      <div>
                        <span className="font-mono text-label-sm font-bold text-primary block">ADMINS ONLY</span>
                        <span className="font-mono text-[10px] text-secondary font-bold">Vetted Gatekeeping</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        invitePermission === 'ADMINS_ONLY'
                          ? 'border-primary bg-primary text-surface-container'
                          : 'border-tertiary/40 bg-surface'
                      }`}
                    >
                      {invitePermission === 'ADMINS_ONLY' && (
                        <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-3 leading-relaxed">
                    Only owners and admins can invite new players to this room.
                  </p>
                </div>
              </div>

              {/* Consent Note */}
              <div className="bg-surface-container-low border border-tertiary/30 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded bg-surface-container text-tertiary flex items-center justify-center shrink-0 border border-tertiary/40">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                </div>
                <div>
                  <span className="font-mono text-[11px] font-bold text-tertiary uppercase block">
                    Invitation Approval Active
                  </span>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                    Invited players always receive a consent request and must accept before joining the group.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/*
           * ============================================================
           * SECTION 4: MEMBERS & ROLE HIERARCHY
           * ============================================================
           */}
          {tab === 'roles' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Role Hierarchy & Capabilities
                </h4>
                <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                  Four tier governance model enforced by backend authorization.
                </p>
              </div>

              {/* 4-Tier Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* TIER 1: OWNER */}
                <div className="bg-surface-bright rounded-xl border border-tertiary/30 p-2.5 shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#844721] text-[#FCECD8] rounded font-bold uppercase">
                      Tier 01
                    </span>
                    <h5 className="font-mono text-label-sm font-bold text-on-surface mt-1.5">OWNER</h5>
                    <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">
                      Supreme control, manage settings, assign roles, or disband room.
                    </p>
                  </div>
                </div>

                {/* TIER 2: ADMIN */}
                <div className="bg-surface-bright rounded-xl border border-tertiary/30 p-2.5 shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-secondary-container text-on-secondary-container rounded font-bold uppercase">
                      Tier 02
                    </span>
                    <h5 className="font-mono text-label-sm font-bold text-on-surface mt-1.5">ADMIN</h5>
                    <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">
                      Invite members, moderate content, assign roles, configure settings.
                    </p>
                  </div>
                </div>

                {/* TIER 3: MODERATOR */}
                <div className="bg-surface-bright rounded-xl border border-tertiary/30 p-2.5 shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-surface-variant text-tertiary rounded font-bold uppercase">
                      Tier 03
                    </span>
                    <h5 className="font-mono text-label-sm font-bold text-on-surface mt-1.5">MODERATOR</h5>
                    <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">
                      Mute troublesome users, purge messages, manage member roster.
                    </p>
                  </div>
                </div>

                {/* TIER 4: MEMBER */}
                <div className="bg-surface-bright rounded-xl border border-tertiary/30 p-2.5 shadow-[1px_1px_0_0_#6E3511] flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 bg-surface-container text-tertiary rounded font-bold uppercase">
                      Tier 04
                    </span>
                    <h5 className="font-mono text-label-sm font-bold text-on-surface mt-1.5">MEMBER</h5>
                    <p className="font-body-sm text-[10px] text-on-surface-variant mt-0.5">
                      Participate in text lounges, send emojis, view public member list.
                    </p>
                  </div>
                </div>
              </div>

              {/* Granular Capability Checkboxes */}
              <div className="space-y-1.5 pt-2">
                <span className="font-mono text-[11px] text-tertiary font-bold uppercase tracking-wider block">
                  Member Capability Flags
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'sendMessages', label: 'Send Messages', desc: 'Allow standard members to post messages' },
                    { key: 'inviteMembers', label: 'Invite Players', desc: 'Allow members to send invitations' },
                    { key: 'editRoom', label: 'Edit Room Profile', desc: 'Allow editing group name & description' },
                    { key: 'manageMembers', label: 'Manage Members', desc: 'Allow kicking or removing players' },
                    { key: 'manageRoles', label: 'Assign Roles', desc: 'Allow promoting or demoting members' },
                    { key: 'deleteMessages', label: 'Delete Messages', desc: 'Allow moderating offending messages' },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center justify-between p-2.5 bg-surface-container rounded-lg border border-tertiary/15 cursor-pointer hover:bg-surface-variant/40 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[11px] text-on-surface font-bold block truncate">{p.label}</span>
                        <span className="font-body-sm text-[10px] text-on-surface-variant block truncate">{p.desc}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!permissions[p.key]}
                        onChange={(e) => setPermissions({ ...permissions, [p.key]: e.target.checked })}
                        className="w-4 h-4 accent-primary shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/*
           * ============================================================
           * SECTION 5: PRIVACY & PASSCODE
           * ============================================================
           * WHAT: Admin-only management of room privacy and secret passcode.
           * Allows:
           * - Viewing current protection status
           * - Switching between Public, Password Protected, and Invite Only
           * - Setting or Editing secret passcode (min 4 chars)
           * - Removing password protection
           */}
          {tab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Room Access & Security
                  </h4>
                  <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                    Configure room privacy, set or edit secret passcodes, or remove password protection.
                  </p>
                </div>
                <span className="font-mono text-[10px] bg-primary-container text-surface-container font-bold px-2 py-0.5 rounded border border-[#6E3511] uppercase shrink-0">
                  Admin Only
                </span>
              </div>

              {/* Current Status Indicator Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  conversation?.privacy === 'private' || conversation?.hasPasscode
                    ? 'bg-secondary-container/40 border-primary/50 text-on-surface'
                    : conversation?.privacy === 'public'
                    ? 'bg-surface-container border-tertiary/30 text-on-surface'
                    : 'bg-surface-container border-tertiary/30 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      conversation?.privacy === 'private' || conversation?.hasPasscode
                        ? 'bg-primary text-surface-container border-[#6E3511]'
                        : 'bg-surface-variant text-tertiary border-tertiary/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {conversation?.privacy === 'private' || conversation?.hasPasscode
                        ? 'lock'
                        : conversation?.privacy === 'public'
                        ? 'public'
                        : 'mark_email_unread'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider block">
                      Current Room Status:
                    </span>
                    <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                      {conversation?.privacy === 'private' || conversation?.hasPasscode
                        ? 'Protected with a secret passcode'
                        : conversation?.privacy === 'public'
                        ? 'Public room — Anyone can join freely'
                        : 'Invite-only — Requires invitation to join'}
                    </p>
                  </div>
                </div>

                {(conversation?.privacy === 'private' || conversation?.hasPasscode) && (
                  <span className="font-mono text-[10px] bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded font-bold shrink-0">
                    LOCKED 🔒
                  </span>
                )}
              </div>

              {/* Access Mode Selector: 3 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. PUBLIC */}
                <div
                  onClick={() => {
                    sfx.click();
                    setPrivacy('public');
                    setPasscode('');
                  }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    privacy === 'public'
                      ? 'border-primary bg-secondary-container/50 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-primary border border-tertiary/20">
                        <span className="material-symbols-outlined text-[15px]">public</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          privacy === 'public'
                            ? 'border-primary bg-primary text-surface-container'
                            : 'border-tertiary/40 bg-surface'
                        }`}
                      >
                        {privacy === 'public' && (
                          <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-label-sm font-bold text-on-surface block">PUBLIC</span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                      Open to all players. No password needed.
                    </p>
                  </div>
                </div>

                {/* 2. PASSWORD PROTECTED */}
                <div
                  onClick={() => {
                    sfx.click();
                    setPrivacy('private');
                  }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    privacy === 'private'
                      ? 'border-primary bg-secondary-container/50 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-6 h-6 rounded bg-primary-container text-surface-container flex items-center justify-center border border-[#6E3511]">
                        <span className="material-symbols-outlined text-[15px]">lock</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          privacy === 'private'
                            ? 'border-primary bg-primary text-surface-container'
                            : 'border-tertiary/40 bg-surface'
                        }`}
                      >
                        {privacy === 'private' && (
                          <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-label-sm font-bold text-on-surface block">PASSCODE</span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                      Requires secret passcode to enter.
                    </p>
                  </div>
                </div>

                {/* 3. INVITE ONLY */}
                <div
                  onClick={() => {
                    sfx.click();
                    setPrivacy('invite');
                    setPasscode('');
                  }}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    privacy === 'invite'
                      ? 'border-primary bg-secondary-container/50 shadow-[2px_2px_0_0_#426010]'
                      : 'border-tertiary/25 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-secondary border border-tertiary/20">
                        <span className="material-symbols-outlined text-[15px]">mark_email_unread</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          privacy === 'invite'
                            ? 'border-primary bg-primary text-surface-container'
                            : 'border-tertiary/40 bg-surface'
                        }`}
                      >
                        {privacy === 'invite' && (
                          <span className="material-symbols-outlined text-[11px] font-bold">check</span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-label-sm font-bold text-on-surface block">INVITE ONLY</span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                      Requires invitation request approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail pane when PASSWORD PROTECTED is active */}
              {privacy === 'private' && (
                <div className="p-4 bg-surface-container-low rounded-xl border-2 border-primary/40 space-y-3 shadow-pixel-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                      <span>
                        {conversation?.privacy === 'private' || conversation?.hasPasscode
                          ? 'Edit / Change Room Password'
                          : 'Set New Room Password'}
                      </span>
                    </label>
                    <span className="font-mono text-[11px] text-tertiary">Min 4 chars</span>
                  </div>

                  <PasswordInput
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={
                      conversation?.privacy === 'private' || conversation?.hasPasscode
                        ? 'Enter new passcode (leave blank to keep current)'
                        : 'Set secret passcode (e.g. gameon123)'
                    }
                    minLength={4}
                    maxLength={64}
                    className="bg-surface"
                  />

                  {conversation?.privacy === 'private' || conversation?.hasPasscode ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                      <p className="font-body-sm text-[11px] text-on-surface-variant">
                        Leave blank to keep your existing password, or enter a new one above.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          sfx.click();
                          setPrivacy('public');
                          setPasscode('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-container/40 text-error border border-error/30 font-mono text-[11px] font-bold hover:bg-error-container/70 active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">lock_open</span>
                        <span>Remove Password</span>
                      </button>
                    </div>
                  ) : (
                    <p className="font-body-sm text-[11px] text-on-surface-variant">
                      Players will be required to enter this password when attempting to join.
                    </p>
                  )}
                </div>
              )}

              {/* Informative notice when removing password */}
              {(conversation?.privacy === 'private' || conversation?.hasPasscode) && privacy !== 'private' && (
                <div className="p-3 bg-secondary-container/40 border border-primary/50 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                    lock_open
                  </span>
                  <div>
                    <span className="font-mono text-[11px] font-bold text-on-surface block">
                      Removing Password Protection
                    </span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                      {privacy === 'public'
                        ? 'When you save, the password will be removed and this room will be open to all players.'
                        : 'When you save, the password will be removed and this room will require member invites.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/*
           * ============================================================
           * STITCH FLOATING / STICKY BOTTOM BAR: UNSAVED CHANGES
           * ============================================================
           * WHAT: Visual indicator when modifications exist, with Discard and Save Changes.
           * WHY: Prevents accidental loss of edits across multi-section group configuration.
           */}
          <div
            className={`transition-all duration-200 p-3 rounded-xl border-2 border-[#6E3511] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[3px_3px_0_0_#6E3511] ${
              isDirty
                ? 'bg-surface-container border-primary shadow-[3px_3px_0_0_#426010]'
                : 'bg-surface-container-low border-tertiary/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-none inline-block ${
                  isDirty ? 'bg-primary-container animate-pulse' : 'bg-tertiary/40'
                }`}
              />
              <span className="font-mono text-[11px] font-bold text-on-surface">
                {isDirty ? 'UNSAVED CHANGES' : 'All changes saved'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <SecondaryButton
                type="button"
                onClick={isDirty ? handleDiscard : onClose}
                disabled={busy}
                className="px-3 py-1.5 text-xs"
              >
                {isDirty ? 'Discard' : 'Close'}
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={handleSave}
                disabled={busy || !isDirty}
                className="px-4 py-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{busy ? 'Saving…' : 'Save Changes'}</span>
              </PrimaryButton>
            </div>
          </div>
        </div>
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
