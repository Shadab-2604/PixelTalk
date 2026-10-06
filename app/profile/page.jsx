/**
 * File: page.jsx (Profile)
 *
 * Responsibility:
 * Displays user identity card, retro pixel avatar or custom uploaded Cloudinary avatar,
 * banner media, bio, status, joined date, and direct message launch CTA.
 * Hosts profile mutation modal dialog and direct image upload handlers for the account owner.
 *
 * Layer:
 * Frontend / Authenticated Pages
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/services/userService.js
 * - frontend/features/auth/AuthForms.jsx (AvatarSelector)
 * - frontend/components/ui.jsx (Modal portal)
 * - frontend/lib/avatars.js (getUserAvatar, avatarSrc)
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell, SidebarFooter } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { conversationService } from '@/services/conversationService';
import { followService } from '@/services/followService';
import { avatarSrc, getUserAvatar, getUserBanner } from '@/lib/avatars';
import { dateShort } from '@/lib/format';
import { sfx } from '@/lib/sound';
import { Badge, Avatar, Modal, Field, Input, Textarea, PrimaryButton, SecondaryButton, ErrorText, Spinner, PresencePip } from '@/components/ui';
import { AvatarSelector } from '@/features/auth/AuthForms';
import { MediaCropCameraModal } from '@/components/MediaCropCameraModal';
import { EditBannerModal } from '@/components/EditBannerModal';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetId = searchParams.get('id') || searchParams.get('userId');
  const { user: currentUser, setUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [busyMsg, setBusyMsg] = useState(false);
  const [busyFollow, setBusyFollow] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followersCount: 0, followingCount: 0 });
  const [followListModal, setFollowListModal] = useState({ open: false, type: 'followers' });

  // Cloudinary media crop/camera modal states
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerCropModalOpen, setBannerCropModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    avatarId: 'avatar-01',
    bio: '',
    customStatus: '',
  });
  const [unameStatus, setUnameStatus] = useState({ checking: false, available: null, message: '' });
  const [editStatus, setEditStatus] = useState({ error: '', success: '', busy: false });

  const isSelf = !targetId || targetId === (currentUser?._id || currentUser?.id);
  const effectiveUserId = isSelf ? (currentUser?._id || currentUser?.id) : targetId;

  const loadCounts = async (uid) => {
    if (!uid) return;
    try {
      const data = await followService.getCounts(uid);
      setFollowCounts({
        followersCount: data.followersCount || 0,
        followingCount: data.followingCount || 0,
      });
    } catch {
      /* counts masked or unavailable */
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      if (isSelf) {
        const data = await userService.me();
        setProfileUser(data.user);
        loadCounts(data.user?._id || data.user?.id);
      } else {
        const data = await userService.getUser(targetId);
        setProfileUser(data.user);
        loadCounts(targetId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profileUser || isSelf || busyFollow) return;
    const currentStatus = profileUser.followStatus || 'NONE';
    const targetUserId = profileUser.id || profileUser._id;
    setBusyFollow(true);
    try {
      if (currentStatus === 'ACCEPTED' || currentStatus === 'PENDING') {
        await followService.unfollow(targetUserId);
        sfx.click();
        setProfileUser((prev) => ({
          ...prev,
          followStatus: 'NONE',
          ...(prev?.isPrivate ? { bio: '', bannerUrl: '', bannerId: null } : {}),
        }));
        loadProfile();
      } else {
        const res = await followService.follow(targetUserId);
        sfx.success();
        setProfileUser((prev) => ({
          ...prev,
          followStatus: res.status,
        }));
        if (res.status === 'ACCEPTED') {
          loadProfile();
        }
      }
      loadCounts(targetUserId);
    } catch (err) {
      sfx.error();
      setError(err.message || 'Follow action failed');
    } finally {
      setBusyFollow(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [targetId, isSelf]);

  useEffect(() => {
    if (isSelf && profileUser) {
      setEditForm({
        displayName: profileUser.displayName || '',
        username: profileUser.username || '',
        avatarId: profileUser.avatarId || 'avatar-01',
        bio: profileUser.bio || '',
        customStatus: profileUser.customStatus || '',
      });
    }
  }, [profileUser, isSelf]);

  // Username validation during edit
  useEffect(() => {
    const raw = editForm.username.trim().replace(/^@+/, '');
    if (!raw || raw.length < 3 || raw === profileUser?.username) {
      setUnameStatus({ checking: false, available: null, message: '' });
      return undefined;
    }
    const timer = setTimeout(async () => {
      setUnameStatus({ checking: true, available: null, message: 'Checking…' });
      try {
        const res = await userService.checkUsername(raw);
        if (res.available) {
          setUnameStatus({ checking: false, available: true, message: '✓ Username available' });
        } else {
          setUnameStatus({ checking: false, available: false, message: `✕ ${res.reason || 'Username taken'}` });
        }
      } catch {
        setUnameStatus({ checking: false, available: null, message: '' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editForm.username, profileUser]);

  const handleMessage = async () => {
    if (!profileUser) return;
    setBusyMsg(true);
    sfx.click();
    try {
      const data = await conversationService.startDirect(profileUser.id || profileUser._id);
      router.push(`/chat/${data.conversation._id}`);
    } catch (err) {
      setError(err.message);
      sfx.error();
    } finally {
      setBusyMsg(false);
    }
  };

  const handleAvatarFileDirect = async (file) => {
    setUploadError('');
    setUploadingAvatar(true);
    try {
      const data = await userService.uploadAvatar(file);
      setUser(data.user);
      setProfileUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Avatar upload failed');
      sfx.error();
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadError('');
    setUploadingAvatar(true);
    try {
      const data = await userService.deleteAvatar();
      setUser(data.user);
      setProfileUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Avatar removal failed');
      sfx.error();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerFileDirect = async (file) => {
    setUploadError('');
    setUploadingBanner(true);
    try {
      const data = await userService.uploadBanner(file);
      setUser(data.user);
      setProfileUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Banner upload failed');
      sfx.error();
      throw err;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    setUploadError('');
    setUploadingBanner(true);
    try {
      const data = await userService.deleteBanner();
      setUser(data.user);
      setProfileUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Banner removal failed');
      sfx.error();
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (unameStatus.available === false) {
      setEditStatus({ error: 'Please choose an available unique username', success: '', busy: false });
      return;
    }
    setEditStatus({ error: '', success: '', busy: true });
    try {
      const data = await userService.updateMe({
        displayName: editForm.displayName,
        username: editForm.username,
        avatarId: editForm.avatarId,
        bio: editForm.bio,
        customStatus: editForm.customStatus,
      });
      setUser(data.user);
      setProfileUser(data.user);
      sfx.success();
      setEditStatus({ error: '', success: 'Profile updated successfully!', busy: false });
      setTimeout(() => setEditOpen(false), 800);
    } catch (err) {
      sfx.error();
      setEditStatus({ error: err.message, success: '', busy: false });
    }
  };

  const user = profileUser || currentUser;
  const isPrivateRestricted = user?.isPrivate && !isSelf && user?.followStatus !== 'ACCEPTED';

  return (
    <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {uploadError && (
          <div className="mb-2">
            <ErrorText>{uploadError}</ErrorText>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : error && !user ? (
          <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-8 shadow-pixel-sm text-center">
            <ErrorText>{error}</ErrorText>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl border-2 border-tertiary shadow-pixel-sm overflow-hidden mb-6">
            {/*
             * SOLVED STRUCTURAL PROFILE HEADER (STITCH SPEC)
             * Respects private account masking: if restricted, displays minimal dark horizon banner.
             */}
            <div className="w-full h-56 sm:h-64 md:h-72 relative overflow-hidden bg-surface-container border-b-2 border-tertiary group">
              {isPrivateRestricted ? (
                <div className="w-full h-full bg-gradient-to-br from-surface-container-high via-surface-container-lowest to-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary/20 text-[96px] select-none">lock</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getUserBanner(user)}
                  alt="Player Banner"
                  className="w-full h-full object-cover object-center"
                />
              )}
              {/* Atmospheric overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

              {/* Top-Left Banner Metadata Tag */}
              <div className="absolute top-3.5 left-3.5 sm:left-4 z-10">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-label-sm px-2.5 py-1 rounded bg-surface/90 text-tertiary border border-tertiary/30 backdrop-blur-sm shadow-sm font-bold">
                  <span className="material-symbols-outlined text-[14px]">
                    {isPrivateRestricted ? 'lock' : 'image'}
                  </span>
                  <span>
                    {isPrivateRestricted
                      ? 'Private Profile'
                      : user?.bannerUrl
                      ? 'Active: Custom Banner'
                      : user?.bannerId
                      ? `Active: PixelTalk #${user.bannerId.replace('banner-', '')}`
                      : 'Active: Default Meadow'}
                  </span>
                </span>
              </div>

              {/* Banner Action Controls inside top-right of banner */}
              {isSelf && (
                <div className="absolute top-3.5 right-3.5 sm:right-4 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setBannerModalOpen(true)}
                    disabled={uploadingBanner}
                    className="flex items-center gap-1.5 font-mono text-label-sm sm:text-label-md bg-surface-container/95 text-tertiary hover:text-on-surface px-3 py-1.5 rounded-lg border-1.5 border-tertiary shadow-pixel-sm-solid hover:bg-surface active:translate-x-0.5 active:translate-y-0.5 backdrop-blur-sm transition-all group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:rotate-12 transition-transform">palette</span>
                    <span>{uploadingBanner ? 'Updating…' : 'Edit Banner'}</span>
                  </button>
                  {user?.bannerUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      disabled={uploadingBanner}
                      className="p-1.5 rounded-lg bg-error-container/95 text-on-error-container border border-error/40 shadow-pixel-xs hover:bg-error-container active:translate-x-0.5 active:translate-y-0.5 text-[14px] cursor-pointer"
                      title="Remove Custom Banner"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              )}

              {/* Banner Bottom Horizon Strip */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-tertiary/40" />
            </div>

            {/* IDENTITY & AVATAR STRIP */}
            <div className="px-5 sm:px-6 md:px-8 pb-6 pt-0 bg-surface">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-14 relative z-20">
                {/* Left Side: Overlapping Avatar + Identity Info Block */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5">
                  {/* Avatar Frame: 112px with 4px border & ring */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-surface-container border-4 border-surface shadow-pixel-md overflow-hidden ring-2 ring-tertiary relative">
                      <Avatar src={getUserAvatar(user)} alt={user?.displayName} size={112} ring={false} />
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Spinner />
                        </div>
                      )}
                    </div>

                    {/* Live Presence Pixel Dot */}
                    <span
                      className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-none border-2 border-surface ring-1 ring-tertiary ${
                        user?.presence === 'online' ? 'bg-primary' : user?.presence === 'away' ? 'bg-amberpix' : 'bg-brown/40'
                      }`}
                      title={user?.presence || 'offline'}
                    />

                    {/* Quick Avatar Upload / Camera Trigger */}
                    {isSelf && (
                      <div className="absolute -bottom-1 -left-1 flex items-center gap-1 z-30">
                        <button
                          type="button"
                          onClick={() => setAvatarModalOpen(true)}
                          disabled={uploadingAvatar}
                          className="w-7 h-7 rounded-md bg-surface border border-tertiary/40 shadow-pixel-xs flex items-center justify-center hover:bg-surface-container text-tertiary active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                          title={user?.avatarUrl ? 'Change Photo (Crop / Camera)' : 'Upload Photo (Crop / Camera)'}
                        >
                          <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                        </button>
                        {user?.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                            className="w-7 h-7 rounded-md bg-error-container border border-error/40 text-on-error-container shadow-pixel-xs flex items-center justify-center hover:bg-error-container/80 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                            title="Remove Custom Photo"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Identity Details Block */}
                  <div className="flex flex-col gap-1 pb-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg font-bold text-on-surface uppercase tracking-tight break-words">
                        {user?.displayName}
                      </h1>
                      {user?.isPrivate && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold border border-secondary/40">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          PRIVATE ACCOUNT
                        </span>
                      )}
                      {user?.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-tertiary text-on-tertiary px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-tertiary">
                          <span className="material-symbols-outlined text-[12px]">shield</span>
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold border border-secondary/40">
                          <span className="material-symbols-outlined text-[12px]">bolt</span>
                          PLAYER
                        </span>
                      )}
                    </div>

                    {/* Handle & ID Badge */}
                    <div className="flex items-center gap-2 font-mono text-label-md text-on-surface-variant flex-wrap">
                      <span className="text-tertiary font-bold">@{user?.username}</span>
                      <span>•</span>
                      <span>Node #{((user?.id || user?._id || '')).slice(-4).toUpperCase()}</span>
                      <span className="material-symbols-outlined text-primary text-[16px]" title="Verified PixelTalk Player">verified</span>
                    </div>

                    {/* Status Thought Bubble (Only if not restricted) */}
                    {!isPrivateRestricted && user?.customStatus && (
                      <div className="mt-1 inline-flex items-center gap-2 bg-surface-container-high border border-tertiary/30 px-3 py-1 rounded-full text-body-sm text-on-surface shadow-pixel-xs w-fit">
                        <span className="text-xs">💬</span>
                        <span className="font-medium italic">&ldquo;{user.customStatus}&rdquo;</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end pt-2 md:pt-0">
                  {isSelf ? (
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-surface-container text-tertiary font-mono text-label-md px-4 py-2 rounded-lg border-1.5 border-tertiary shadow-pixel-sm-solid hover:bg-secondary-container/40 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">tune</span>
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                      {/* Follow Action Button */}
                      {user?.followStatus === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={busyFollow}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container text-tertiary font-mono text-label-md font-bold border-1.5 border-tertiary shadow-pixel-sm hover:bg-secondary-container/40 press"
                          title="Click to cancel follow request"
                        >
                          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                          <span>{busyFollow ? '…' : 'Requested'}</span>
                        </button>
                      ) : user?.followStatus === 'ACCEPTED' ? (
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={busyFollow}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-mono text-label-md font-bold border-1.5 border-tertiary shadow-pixel-sm hover:brightness-105 press"
                          title="Click to unfollow"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          <span>{busyFollow ? '…' : 'Following'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={busyFollow}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-surface-container font-mono text-label-md font-bold border-1.5 border-tertiary shadow-pixel-sm hover:brightness-105 press"
                        >
                          <span className="material-symbols-outlined text-[18px]">person_add</span>
                          <span>{busyFollow ? '…' : 'Follow'}</span>
                        </button>
                      )}

                      {/* Direct Message Button */}
                      {isPrivateRestricted ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container/60 text-outline font-mono text-label-md border border-tertiary/20 cursor-not-allowed opacity-60"
                          title="Follow request must be accepted before you can message this player"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                          <span>Message</span>
                        </button>
                      ) : (
                        <PrimaryButton onClick={handleMessage} disabled={busyMsg} className="flex-1 sm:flex-initial px-5 py-2">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          <span>{busyMsg ? 'Opening…' : 'Message'}</span>
                        </PrimaryButton>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Private Account Restricted State OR Full Profile Information */}
              {isPrivateRestricted ? (
                <div className="pt-6 space-y-4 border-t border-tertiary/15 mt-5">
                  <div className="py-8 px-6 bg-surface-container/30 rounded-2xl border-2 border-dashed border-tertiary/25 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-surface-container-high border border-tertiary/30 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[28px]">lock</span>
                    </div>
                    <h3 className="font-display text-headline-sm text-tertiary font-bold">This Account is Private</h3>
                    <p className="font-body-sm text-[13px] text-on-surface-variant max-w-md mx-auto leading-relaxed">
                      Follow @{user?.username} to view their full player profile, personal bio, custom banners, and start direct conversations.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Visibility</span>
                      <span className="font-mono text-label-md font-bold text-tertiary mt-0.5 block flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Private
                      </span>
                    </div>
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Joined</span>
                      <span className="font-mono text-label-md font-bold text-on-surface mt-0.5 block">
                        {dateShort(user?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Allowed Profile Information */
                <div className="pt-6 space-y-4 border-t border-tertiary/15 mt-5">
                  <div>
                    <h3 className="font-mono text-[11px] uppercase font-bold text-tertiary tracking-wider mb-1.5">About Player</h3>
                    <p className="font-body text-body-md text-on-surface bg-surface-container/40 p-4 rounded-xl border border-tertiary/15 leading-relaxed">
                      {user?.bio || 'No bio written yet.'}
                    </p>
                  </div>

                  {/* Account Metadata Bento */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFollowListModal({ open: true, type: 'followers' })}
                      className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs hover:border-tertiary transition-all press"
                    >
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Followers</span>
                      <span className="font-mono text-label-md font-bold text-on-surface mt-0.5 block">{followCounts.followersCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFollowListModal({ open: true, type: 'following' })}
                      className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs hover:border-tertiary transition-all press"
                    >
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Following</span>
                      <span className="font-mono text-label-md font-bold text-on-surface mt-0.5 block">{followCounts.followingCount}</span>
                    </button>
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Presence</span>
                      <span className="font-mono text-label-md font-bold text-on-surface capitalize flex items-center justify-center gap-1.5 mt-0.5">
                        <PresencePip online={user?.presence === 'online'} away={user?.presence === 'away'} />
                        {user?.presence || 'offline'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Status</span>
                      <span className="font-mono text-label-md font-bold text-primary uppercase mt-0.5 block">
                        {user?.status || 'ACTIVE'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Joined</span>
                      <span className="font-mono text-label-md font-bold text-on-surface mt-0.5 block">
                        {dateShort(user?.createdAt)}
                      </span>
                    </div>
                    <div className="p-3.5 bg-surface rounded-xl border border-tertiary/20 text-center shadow-pixel-xs">
                      <span className="block font-mono text-[10px] text-tertiary/70 uppercase font-bold">Identifier</span>
                      <span className="font-mono text-label-md font-bold text-tertiary mt-0.5 block">
                        #{(user?.id || user?._id || '').slice(-4).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Crop/Camera Upload Dialogs & Banner Selector Modal */}
      {isSelf && (
        <>
          <MediaCropCameraModal
            open={avatarModalOpen}
            onClose={() => setAvatarModalOpen(false)}
            title="Upload Profile Picture"
            aspectRatio={1}
            uploadType="avatar"
            onUploadSuccess={handleAvatarFileDirect}
          />
          <MediaCropCameraModal
            open={bannerCropModalOpen}
            onClose={() => setBannerCropModalOpen(false)}
            title="Upload Profile Banner"
            aspectRatio={3}
            uploadType="banner"
            onUploadSuccess={handleBannerFileDirect}
          />
          <EditBannerModal
            open={bannerModalOpen}
            onClose={() => setBannerModalOpen(false)}
            user={user}
            onBannerUpdated={(updatedUser) => {
              setUser(updatedUser);
              setProfileUser(updatedUser);
            }}
            onOpenUploadCustom={() => setBannerCropModalOpen(true)}
            onRemoveCustomBanner={handleRemoveBanner}
            isRemovingCustom={uploadingBanner}
          />
        </>
      )}

      {/* Edit Profile Modal */}
      {isSelf && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile" kicker="PLAYER CUSTOMIZATION" maxW="max-w-xl">
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="p-3.5 bg-surface-container/50 rounded-xl border border-tertiary/20 space-y-2">
              <label className="block font-mono text-label-md font-bold text-on-surface uppercase tracking-wide">
                Custom Profile Media (Cloudinary & Camera)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface text-on-surface font-mono text-label-sm font-bold border border-tertiary/30 shadow-pixel-xs hover:bg-surface-container cursor-pointer flex items-center gap-1.5 press"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  <span>{user?.avatarUrl ? 'Crop / Camera Custom Photo' : 'Upload / Snap Custom Photo'}</span>
                </button>
                {user?.avatarUrl && (
                  <SecondaryButton type="button" onClick={handleRemoveAvatar} disabled={uploadingAvatar} size="sm">
                    Remove Custom Photo
                  </SecondaryButton>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setBannerModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-surface text-on-surface font-mono text-label-sm font-bold border border-tertiary/30 shadow-pixel-xs hover:bg-surface-container cursor-pointer flex items-center gap-1.5 press"
                >
                  <span className="material-symbols-outlined text-[16px]">palette</span>
                  <span>Customize Banner</span>
                </button>
              </div>
            </div>

            <AvatarSelector value={editForm.avatarId} onChange={(avatarId) => setEditForm({ ...editForm, avatarId })} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Display Name" required>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  required
                  maxLength={32}
                />
              </Field>

              <Field label="Username" required>
                <div className="relative">
                  <Input
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[A-Za-z0-9_]+"
                  />
                </div>
                {unameStatus.message && (
                  <p className={`font-mono text-[11px] font-bold mt-1 ${unameStatus.available ? 'text-primary' : unameStatus.checking ? 'text-tertiary' : 'text-error'}`}>
                    {unameStatus.message}
                  </p>
                )}
              </Field>
            </div>

            <Field label="Custom Status" hint="Brief status shown to players">
              <Input
                placeholder="e.g. Building PixelTalk"
                value={editForm.customStatus}
                onChange={(e) => setEditForm({ ...editForm, customStatus: e.target.value })}
                maxLength={100}
              />
            </Field>

            <Field label="Bio" hint="Up to 240 characters">
              <Textarea
                rows={3}
                placeholder="Tell players a little about yourself..."
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                maxLength={240}
              />
            </Field>

            {editStatus.error && <ErrorText>{editStatus.error}</ErrorText>}
            {editStatus.success && <p className="font-body-sm text-body-sm text-primary font-bold">{editStatus.success}</p>}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-tertiary/20">
              <SecondaryButton type="button" onClick={() => setEditOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={editStatus.busy}>
                {editStatus.busy ? 'Saving…' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* Follow List Modal (Followers / Following) */}
      <FollowListModal
        open={followListModal.open}
        onClose={() => setFollowListModal({ open: false, type: 'followers' })}
        type={followListModal.type}
        userId={effectiveUserId}
      />
    </AppShell>
  );
}

function FollowListModal({ open, onClose, type, userId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!open || !userId) return;
    let active = true;
    const fetchList = async () => {
      setLoading(true);
      setError('');
      try {
        const data =
          type === 'followers'
            ? await followService.getFollowers(userId)
            : await followService.getFollowing(userId);
        if (active) setList(data.users || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load list');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchList();
    return () => {
      active = false;
    };
  }, [open, type, userId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={type === 'followers' ? 'Followers' : 'Following'}
      kicker="PLAYER NETWORK"
      maxW="max-w-md"
    >
      <div className="space-y-3">
        {error && <ErrorText>{error}</ErrorText>}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <p className="font-mono text-label-sm text-on-surface-variant py-6 text-center">
            {type === 'followers' ? 'No followers yet.' : 'Not following any players yet.'}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {list.map((u) => (
              <div
                key={u._id || u.id}
                onClick={() => {
                  onClose();
                  router.push(`/profile?id=${u._id || u.id}`);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface hover:bg-surface-container border border-tertiary/15 transition-all cursor-pointer press"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={getUserAvatar(u)} alt={u.displayName || u.username} size={36} ring={false} />
                  <div className="min-w-0">
                    <p className="font-display text-body-md font-bold text-on-surface truncate">
                      {u.displayName || u.username}
                    </p>
                    <p className="font-mono text-[11px] text-tertiary truncate">@{u.username}</p>
                  </div>
                </div>
                <span className="font-mono text-label-xs text-primary font-bold">VIEW</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
