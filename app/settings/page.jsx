/**
 * File: page.jsx (Settings)
 *
 * Responsibility:
 * Unified user configuration hub:
 * - Profile tab: Avatar selection, display name, bio, custom status
 * - Security tab: Password change and self-service OTP reset
 * - Audio & Vibration tab: 8-bit sound effects volume, tactile haptics, test trigger
 * - Notifications tab: Desktop permission, notification mode (normal/vibrate/silent)
 * - Appearance tab: Light / Dark / System retro color themes
 *
 * Layer:
 * Frontend / Authenticated Pages
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/services/userService.js
 * - frontend/services/authService.js
 * - frontend/hooks/useSound.js
 * - frontend/hooks/useTheme.js
 * - frontend/lib/notifications.js
 */

'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSound } from '@/hooks/useSound';
import { AvatarSelector } from '@/features/auth/AuthForms';
import {
  Field,
  Input,
  PasswordInput,
  Textarea,
  PrimaryButton,
  SecondaryButton,
  ErrorText,
  PixelToggle,
  Badge,
  Avatar,
  PresencePip,
} from '@/components/ui';
import { avatarSrc, getUserAvatar, getUserBanner } from '@/lib/avatars';
import { dateShort, timeAgo } from '@/lib/format';
import { sfx } from '@/lib/sound';
import { requestNotificationPermission, getNotificationPermission, triggerVibration, showDesktopNotification } from '@/lib/notifications';
import { followService } from '@/services/followService';

const TABS = [
  { id: 'profile', icon: 'account_box', label: 'Profile' },
  { id: 'appearance', icon: 'palette', label: 'Appearance' },
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  { id: 'sounds', icon: 'volume_up', label: 'Sound FX' },
  { id: 'privacy', icon: 'lock', label: 'Privacy & Follows' },
  { id: 'security', icon: 'shield_person', label: 'Security' },
];

export default function SettingsPage() {
  useRequireAuth();
  const { user, setUser, logout } = useAuth();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    avatarId: 'avatar-01',
    bio: '',
    customStatus: '',
  });
  const [unameStatus, setUnameStatus] = useState({ checking: false, available: null, message: '' });
  const [status, setStatus] = useState({ error: '', success: '', busy: false });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        username: user.username || '',
        email: user.email || '',
        avatarId: user.avatarId || 'avatar-01',
        bio: user.bio || '',
        customStatus: user.customStatus || '',
      });
    }
  }, [user]);

  // Username validation check
  useEffect(() => {
    const raw = form.username.trim().replace(/^@+/, '');
    if (!raw || raw.length < 3 || raw === user?.username) {
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
  }, [form.username, user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (unameStatus.available === false) {
      setStatus({ error: 'Please choose an available unique username', success: '', busy: false });
      return;
    }
    setStatus({ error: '', success: '', busy: true });
    try {
      const data = await userService.updateMe({
        displayName: form.displayName,
        username: form.username,
        email: form.email,
        avatarId: form.avatarId,
        bio: form.bio,
        customStatus: form.customStatus,
      });
      setUser(data.user);
      sfx.success();
      setStatus({ error: '', success: 'Profile saved successfully.', busy: false });
    } catch (err) {
      sfx.error();
      setStatus({ error: err.message, success: '', busy: false });
    }
  };

  return (
    <AppShell wide>
      <div className="max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col md:flex-row gap-6">
        {/* Left settings navigation */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0">
          <div className="bg-surface-container-low rounded-xl border border-tertiary/20 p-4 shadow-pixel-sm">
            <div className="mb-4 pb-3 border-b border-tertiary/15 flex items-center justify-between">
              <div>
                <h2 className="font-display text-headline-sm text-tertiary font-bold tracking-tight">Settings</h2>
                <p className="font-mono text-label-sm text-on-surface-variant">Player Preferences</p>
              </div>
              <Badge tone="green">ACTIVE</Badge>
            </div>
            <nav className="flex flex-row overflow-x-auto md:flex-col gap-1.5 pb-2 md:pb-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 md:w-full flex items-center justify-between font-mono text-label-md rounded-lg px-3.5 py-2 transition-all ${
                    tab === t.id
                      ? 'bg-primary-container text-surface-container font-bold border border-tertiary shadow-pixel-sm-solid'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary-container/30'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    {t.label}
                  </span>
                  {tab === t.id && <span className="hidden md:inline-block w-2 h-2 bg-secondary-fixed ml-2" />}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content pane */}
        <section className="flex-1 min-w-0 space-y-6">
          {tab === 'profile' && (
            <ProfileSection
              user={user}
              form={form}
              setForm={setForm}
              unameStatus={unameStatus}
              status={status}
              onSave={saveProfile}
            />
          )}
          {tab === 'appearance' && <AppearanceSection user={user} setUser={setUser} />}
          {tab === 'notifications' && <NotificationsSection user={user} setUser={setUser} />}
          {tab === 'sounds' && <SoundsSection user={user} setUser={setUser} />}
          {tab === 'privacy' && <PrivacySection user={user} setUser={setUser} />}
          {tab === 'security' && <SecuritySection user={user} logout={logout} />}
        </section>
      </div>
    </AppShell>
  );
}

function ProfileSection({ user, form, setForm, unameStatus, status, onSave }) {
  const { setUser } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setUploadError('Only JPG, JPEG, PNG, and WEBP image files are allowed.');
      sfx.error();
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Image file size must not exceed 25 MB.');
      sfx.error();
      return;
    }

    setUploadError('');
    setUploadingAvatar(true);
    try {
      const data = await userService.uploadAvatar(file);
      setUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Avatar upload failed');
      sfx.error();
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadError('');
    setUploadingAvatar(true);
    try {
      const data = await userService.deleteAvatar();
      setUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Avatar removal failed');
      sfx.error();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setUploadError('Only JPG, JPEG, PNG, and WEBP image files are allowed.');
      sfx.error();
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('Image file size must not exceed 25 MB.');
      sfx.error();
      return;
    }

    setUploadError('');
    setUploadingBanner(true);
    try {
      const data = await userService.uploadBanner(file);
      setUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Banner upload failed');
      sfx.error();
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    setUploadError('');
    setUploadingBanner(true);
    try {
      const data = await userService.deleteBanner();
      setUser(data.user);
      sfx.success();
    } catch (err) {
      setUploadError(err.message || 'Banner removal failed');
      sfx.error();
    } finally {
      setUploadingBanner(false);
    }
  };

  return (
    <>
      {uploadError && (
        <div className="mb-3">
          <ErrorText>{uploadError}</ErrorText>
        </div>
      )}

      {/* Profile banner card */}
      <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 shadow-pixel-sm overflow-hidden">
        <div className="relative h-36 border-b-2 border-tertiary/30 bg-surface-container group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getUserBanner(user)} alt="Player Banner" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-4 text-label-sm font-mono text-surface font-bold tracking-widest bg-tertiary/80 px-2 py-0.5 rounded shadow z-10">
            PLAYER IDENTITY &amp; AVATAR
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <label className="px-3 py-1 rounded bg-surface/90 text-on-surface text-[11px] font-mono font-bold border border-tertiary/40 shadow-pixel-sm cursor-pointer hover:bg-surface flex items-center gap-1.5 press transition-all">
              <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
              <span>{uploadingBanner ? 'Uploading…' : user?.bannerUrl ? 'Change Banner' : 'Upload Banner'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={uploadingBanner}
                onChange={handleBannerUpload}
              />
            </label>
            {user?.bannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={uploadingBanner}
                className="p-1.5 rounded bg-error-container/90 text-on-error-container border border-error/40 shadow-pixel-sm hover:bg-error-container press text-[14px]"
                title="Remove Banner"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 gap-4 pb-4 border-b border-tertiary/15">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-xl bg-surface-container-high border-4 border-surface shadow-pixel-md overflow-hidden relative">
                  <Avatar src={getUserAvatar(user)} alt={user?.displayName || form.displayName} size={96} ring={false} />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Spinner />
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 -left-1 flex items-center gap-1 z-10">
                  <label
                    className="w-7 h-7 rounded-lg bg-surface border border-tertiary/40 shadow-pixel-sm flex items-center justify-center cursor-pointer hover:bg-surface-container text-tertiary press"
                    title={user?.avatarUrl ? 'Change Custom Photo' : 'Upload Custom Photo'}
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {user?.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="w-7 h-7 rounded-lg bg-error-container border border-error/40 text-on-error-container shadow-pixel-sm flex items-center justify-center hover:bg-error-container/80 press"
                      title="Remove Custom Photo"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </div>

                <div className="absolute bottom-1 right-1 w-4 h-4 bg-primary-container border-2 border-surface shadow-pixel-sm" title="Online" />
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-headline-lg text-tertiary font-bold">{user?.displayName}</h1>
                  <span className="font-mono text-label-sm text-outline-variant">#{(user?.id || user?._id || '').slice(-4).toUpperCase()}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  <span className="font-mono text-label-md text-primary font-bold">@{user?.username}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public profile form */}
      <form onSubmit={onSave} className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 mb-2 border-b border-tertiary/15">
          <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
          <h2 className="font-display text-headline-md text-tertiary font-bold">Public Profile Information</h2>
        </div>

        <div className="p-3 bg-surface-container/50 rounded-xl border border-tertiary/20 space-y-2 mb-4">
          <label className="block font-mono text-label-md font-bold text-on-surface uppercase tracking-wide">
            Custom Media Photo (Cloudinary)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="px-3 py-1.5 rounded-lg bg-surface text-on-surface font-mono text-label-sm font-bold border border-tertiary/30 shadow-pixel-xs hover:bg-surface-container cursor-pointer flex items-center gap-1.5 press">
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>{uploadingAvatar ? 'Uploading Avatar…' : user?.avatarUrl ? 'Replace Custom Avatar' : 'Upload Custom Avatar'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={handleAvatarUpload}
              />
            </label>
            {user?.avatarUrl && (
              <SecondaryButton type="button" onClick={handleRemoveAvatar} disabled={uploadingAvatar} size="sm">
                Remove Custom Avatar
              </SecondaryButton>
            )}
          </div>
        </div>

        <AvatarSelector value={form.avatarId} onChange={(avatarId) => setForm({ ...form, avatarId })} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Display Name" required>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={32} />
          </Field>
          <Field label="Username" required>
            <div className="flex">
              <span className="inline-flex items-center px-3 font-mono text-label-md text-tertiary bg-surface-container border border-r-0 border-tertiary/40 rounded-l-[10px]">
                @
              </span>
              <Input
                className="rounded-l-none"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                pattern="[A-Za-z0-9_]+"
                minLength={3}
                maxLength={30}
              />
            </div>
            {unameStatus.message && (
              <p className={`font-mono text-[11px] font-bold mt-1 ${unameStatus.available ? 'text-primary' : unameStatus.checking ? 'text-tertiary' : 'text-error'}`}>
                {unameStatus.message}
              </p>
            )}
          </Field>
        </div>

        <Field label="Email" required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>

        <Field label="Custom Status" hint="Brief status for fellow players">
          <Input
            placeholder="e.g. Chatting in Pixel Lounge"
            value={form.customStatus}
            onChange={(e) => setForm({ ...form, customStatus: e.target.value })}
            maxLength={100}
          />
        </Field>

        <Field label="Bio" hint="Up to 240 characters">
          <Textarea
            rows={3}
            placeholder="Introduce yourself to the PixelTalk community..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={240}
          />
        </Field>

        <div className="flex items-center justify-between pt-2">
          <p className="font-body-sm text-body-sm text-on-surface-variant">Joined {dateShort(user?.createdAt)}</p>
          <div className="flex items-center gap-3">
            <SecondaryButton type="button" onClick={() => window.location.reload()}>
              Discard
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={status.busy}>
              {status.busy ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </div>
        </div>
        {status.error && <ErrorText>{status.error}</ErrorText>}
        {status.success && <p className="font-body-sm text-body-sm text-primary font-bold">{status.success}</p>}
      </form>
    </>
  );
}

function AppearanceSection({ user, setUser }) {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState(user?.preferences?.density || 'comfortable');

  const updateDensity = async (val) => {
    setDensity(val);
    try {
      const data = await userService.updateMe({ preferences: { density: val } });
      setUser(data.user);
    } catch {}
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-tertiary/15">
        <span className="material-symbols-outlined text-primary text-[22px]">palette</span>
        <h2 className="font-display text-headline-md text-tertiary font-bold">Chat Appearance</h2>
      </div>

      <div>
        <label className="block font-mono text-label-md font-bold text-tertiary uppercase tracking-wide mb-2">Color Theme</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['light', 'Light', 'light_mode'],
            ['dark', 'Dark', 'dark_mode'],
            ['system', 'System', 'contrast'],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border-[1.5px] text-left transition-all ${
                theme === value ? 'border-primary-container bg-secondary-container/30 shadow-pixel-sm' : 'border-tertiary/30 bg-surface hover:border-tertiary/60'
              }`}
            >
              <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
              <span className="font-body-sm font-bold text-on-surface">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-mono text-label-md font-bold text-tertiary uppercase tracking-wide mb-2">Message Density</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['compact', 'Compact', 'density_small'],
            ['comfortable', 'Comfortable', 'density_medium'],
            ['spacious', 'Spacious', 'density_large'],
          ].map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateDensity(value)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border-[1.5px] text-left transition-all ${
                density === value ? 'border-primary-container bg-secondary-container/30 shadow-pixel-sm' : 'border-tertiary/30 bg-surface hover:border-tertiary/60'
              }`}
            >
              <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
              <span className="font-body-sm font-bold text-on-surface">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationsSection({ user, setUser }) {
  const [notify, setNotify] = useState(user?.preferences?.notificationsEnabled ?? true);
  const [mode, setMode] = useState(user?.preferences?.notificationMode || 'normal');
  const [browserPerm, setBrowserPerm] = useState('default');
  const [vibrating, setVibrating] = useState(false);

  useEffect(() => {
    setBrowserPerm(getNotificationPermission());
  }, []);

  const toggleNotify = async (val) => {
    setNotify(val);
    try {
      const data = await userService.updateMe({ preferences: { notificationsEnabled: val } });
      setUser(data.user);
    } catch {}
  };

  const updateMode = async (val) => {
    setMode(val);
    try {
      const data = await userService.updateMe({ preferences: { notificationMode: val } });
      setUser(data.user);
    } catch {}
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setBrowserPerm(perm);
    if (perm === 'granted') {
      showDesktopNotification({
        title: 'PixelTalk Notifications Enabled!',
        body: 'You will now receive alerts for incoming messages when this tab is in the background.',
      });
    }
  };

  const testVibration = () => {
    setVibrating(true);
    triggerVibration([100, 50, 100, 50, 150]);
    setTimeout(() => setVibrating(false), 500);
  };

  const mutedCount = user?.mutedConversations?.length || 0;
  const vibrateCount = user?.vibrateConversations?.length || 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-tertiary/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">notifications</span>
          <h2 className="font-display text-headline-md text-tertiary font-bold">Notifications &amp; Alerts</h2>
        </div>
        <Badge tone="green">REALTIME</Badge>
      </div>

      {/* Global Toggle */}
      <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg border border-tertiary/30">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">mark_chat_unread</span>
          <div>
            <h3 className="font-mono text-label-lg text-tertiary font-bold">Allow Notifications</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Enable in-app toasts and desktop alerts when new messages arrive.</p>
          </div>
        </div>
        <PixelToggle checked={notify} onChange={toggleNotify} />
      </div>

      {/* Notification Mode Selection: Normal, Vibrate, Silent */}
      <div>
        <label className="block font-mono text-label-md font-bold text-tertiary uppercase tracking-wide mb-2.5">
          Notification Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'normal',
              label: 'Normal',
              icon: 'volume_up',
              desc: 'Show notifications with sound.',
            },
            {
              id: 'vibrate',
              label: 'Vibrate',
              icon: 'vibration',
              desc: 'Show notifications with vibration and no sound.',
            },
            {
              id: 'silent',
              label: 'Silent',
              icon: 'notifications_off',
              desc: 'Show notifications without sound or vibration.',
            },
          ].map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => updateMode(item.id)}
                className={`flex flex-col p-3.5 rounded-lg border-2 text-left transition-all relative ${
                  active
                    ? 'border-primary bg-secondary-container/40 shadow-pixel-sm'
                    : 'border-tertiary/20 bg-surface hover:border-tertiary/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {item.icon}
                    </span>
                    <span className="font-display font-bold text-on-surface text-label-lg">{item.label}</span>
                  </div>
                  {active && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-snug">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop system notifications */}
      <div className="p-4 bg-surface rounded-lg border border-tertiary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">desktop_windows</span>
            <div>
              <h3 className="font-mono text-label-lg text-tertiary font-bold">Browser Push Notifications</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Status: <span className="font-mono font-bold uppercase">{browserPerm}</span>
              </p>
            </div>
          </div>
          {browserPerm !== 'granted' ? (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-primary text-on-primary font-mono text-label-sm font-bold rounded-lg border border-tertiary shadow-pixel-xs hover:bg-primary-container"
            >
              REQUEST PERMISSION
            </button>
          ) : (
            <Badge tone="green">ENABLED</Badge>
          )}
        </div>
        <p className="font-mono text-label-xs text-on-surface-variant">
          Sends native system alerts when messages arrive and PixelTalk is running in a background tab or window.
        </p>
      </div>

      {/* Haptic & Vibration feedback */}
      <div className="p-4 bg-surface rounded-lg border border-tertiary/20 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">vibration</span>
          <div>
            <h3 className="font-mono text-label-lg text-tertiary font-bold">Device Haptic Vibration</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Supported on mobile and vibration-capable browsers.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={testVibration}
          className={`px-3 py-1.5 font-mono text-label-sm font-bold rounded-lg border border-tertiary transition-all ${
            vibrating ? 'bg-tertiary text-on-tertiary scale-95' : 'bg-surface-container text-on-surface hover:bg-secondary-container'
          }`}
        >
          {vibrating ? 'BUZZING…' : 'TEST VIBRATE'}
        </button>
      </div>

      {/* Per-Chat Quick Summary */}
      <div className="p-4 bg-surface-container rounded-lg border border-tertiary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
          <div className="text-body-sm">
            <span className="font-bold text-on-surface">Custom Chat Rules: </span>
            <span className="text-on-surface-variant">{mutedCount} muted, {vibrateCount} with vibration on</span>
          </div>
        </div>
        <p className="font-mono text-label-xs text-outline">Manage directly inside any chat&apos;s Info panel</p>
      </div>
    </div>
  );
}

function SoundsSection() {
  const { enabled, volume, update } = useSound();

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-tertiary/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">volume_up</span>
          <h2 className="font-display text-headline-md text-tertiary font-bold">Sound &amp; Tactile FX</h2>
        </div>
        <Badge tone="green">8-BIT SYNTH ENGINE</Badge>
      </div>

      <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-lg border border-tertiary/30">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">music_note</span>
          <div>
            <h3 className="font-mono text-label-lg text-tertiary font-bold">Retro Sound FX Pack</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Play charming micro-computed audio for chimes, room transitions, and keystrokes.</p>
          </div>
        </div>
        <PixelToggle checked={enabled} onChange={(v) => update({ enabled: v })} />
      </div>

      <div className="p-3.5 bg-surface rounded-lg border border-tertiary/20">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-label-md font-bold text-tertiary">Chime Output Level</span>
          <span className="font-mono text-label-sm text-primary font-bold">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="12.5"
          value={volume}
          onChange={(e) => update({ volume: Number(e.target.value) })}
          className="w-full h-2 bg-surface-variant rounded-none appearance-none cursor-pointer border border-tertiary/30"
        />
        <div className="flex justify-between text-[10px] font-mono text-outline mt-1.5 px-0.5">
          <span>MUTE</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>MAX</span>
        </div>
      </div>

      <div>
        <span className="block font-mono text-label-md font-bold text-tertiary mb-2">Audition Sound Library</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Play Click', 'click'],
            ['Message Chime', 'notify'],
            ['Achievement', 'success'],
          ].map(([label, sound]) => (
            <button
              key={sound}
              type="button"
              onClick={() => sfx[sound]?.()}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-surface-container text-tertiary font-mono text-label-md font-bold rounded-lg border border-tertiary shadow-pixel-sm-solid hover:bg-secondary-container/50 press"
            >
              <span className="material-symbols-outlined text-[16px]">touch_app</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ user, logout }) {
  const [mode, setMode] = useState('password'); // 'password' | 'otp'

  // Standard change password state
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [state, setState] = useState({ error: '', success: '', busy: false });

  // OTP password reset state
  const [otpForm, setOtpForm] = useState({ otp: '', newPassword: '', confirm: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpState, setOtpState] = useState({ error: '', success: '', busy: false });

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setState({ error: 'New passwords do not match', success: '', busy: false });
      return;
    }
    setState({ error: '', success: '', busy: true });
    try {
      await userService.changeMyPassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      sfx.success();
      setState({ error: '', success: 'Password updated successfully.', busy: false });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      sfx.error();
      setState({ error: err.message, success: '', busy: false });
    }
  };

  const handleSendOtp = async () => {
    if (!user?.email || cooldown > 0) return;
    setOtpState({ error: '', success: '', busy: true });
    try {
      await authService.sendPasswordResetOtp({ email: user.email });
      sfx.success();
      setOtpSent(true);
      setCooldown(60);
      setOtpState({ error: '', success: `6-digit reset code sent to ${user.email}`, busy: false });
    } catch (err) {
      sfx.error();
      setOtpState({ error: err.message, success: '', busy: false });
    }
  };

  const submitOtpReset = async (e) => {
    e.preventDefault();
    if (otpForm.otp.trim().length !== 6) {
      setOtpState({ error: 'Please enter the 6-digit verification code', success: '', busy: false });
      return;
    }
    if (otpForm.newPassword.length < 8) {
      setOtpState({ error: 'New password must be at least 8 characters', success: '', busy: false });
      return;
    }
    if (otpForm.newPassword !== otpForm.confirm) {
      setOtpState({ error: 'New passwords do not match', success: '', busy: false });
      return;
    }
    setOtpState({ error: '', success: '', busy: true });
    try {
      await authService.resetPasswordWithOtp({
        email: user.email,
        otp: otpForm.otp.trim(),
        newPassword: otpForm.newPassword,
      });
      sfx.success();
      setOtpState({ error: '', success: 'Password reset successfully via email verification!', busy: false });
      setOtpForm({ otp: '', newPassword: '', confirm: '' });
      setOtpSent(false);
    } catch (err) {
      sfx.error();
      setOtpState({ error: err.message, success: '', busy: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-tertiary/15">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">shield_person</span>
            <h2 className="font-display text-headline-md text-tertiary font-bold">Password & Security</h2>
          </div>
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-tertiary/20">
            <button
              type="button"
              onClick={() => { setMode('password'); setState({ error: '', success: '', busy: false }); }}
              className={`px-3 py-1 font-mono text-[11px] font-bold rounded transition-all ${
                mode === 'password' ? 'bg-primary-container text-surface-container shadow-pixel-sm-solid' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Current Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('otp'); setOtpState({ error: '', success: '', busy: false }); }}
              className={`px-3 py-1 font-mono text-[11px] font-bold rounded transition-all ${
                mode === 'otp' ? 'bg-primary-container text-surface-container shadow-pixel-sm-solid' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Reset via Email OTP
            </button>
          </div>
        </div>

        {mode === 'password' ? (
          <form onSubmit={submitPasswordChange} className="space-y-4">
            <Field label="Current password" required>
              <PasswordInput
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
                autoComplete="current-password"
                placeholder="Current password"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="New password" required hint="Minimum 8 characters.">
                <PasswordInput
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="New password"
                />
              </Field>
              <Field label="Confirm new password" required>
                <PasswordInput
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                />
              </Field>
            </div>

            {state.error && <ErrorText>{state.error}</ErrorText>}
            {state.success && <p className="font-body-sm text-body-sm text-primary font-bold">{state.success}</p>}

            <PrimaryButton type="submit" disabled={state.busy}>
              {state.busy ? 'Updating…' : 'Update password'}
            </PrimaryButton>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-surface-container rounded-lg border border-tertiary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-mono text-label-sm text-tertiary font-bold block">Registered Security Email</span>
                <span className="font-mono text-label-md text-on-surface font-bold">{user?.email || '—'}</span>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={cooldown > 0 || otpState.busy}
                className="px-3.5 py-1.5 bg-secondary-container border border-tertiary/40 rounded font-mono text-label-sm font-bold text-on-secondary-container shadow-pixel-sm press disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : otpSent ? 'Resend OTP' : 'Send Verification OTP'}
              </button>
            </div>

            {otpState.success && (
              <p className="p-2.5 bg-secondary-container/40 border border-tertiary/30 rounded font-mono text-label-sm text-on-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                {otpState.success}
              </p>
            )}

            {otpSent && (
              <form onSubmit={submitOtpReset} className="space-y-4 pt-2">
                <Field label="6-Digit OTP Code" required hint="Check your inbox or spam folder">
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otpForm.otp}
                    onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    required
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-headline-sm max-w-xs"
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="New password" required hint="Minimum 8 characters.">
                    <PasswordInput
                      value={otpForm.newPassword}
                      onChange={(e) => setOtpForm({ ...otpForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                      placeholder="New password"
                    />
                  </Field>
                  <Field label="Confirm new password" required>
                    <PasswordInput
                      value={otpForm.confirm}
                      onChange={(e) => setOtpForm({ ...otpForm, confirm: e.target.value })}
                      required
                      minLength={8}
                      placeholder="Confirm new password"
                    />
                  </Field>
                </div>

                {otpState.error && <ErrorText>{otpState.error}</ErrorText>}

                <PrimaryButton type="submit" disabled={otpState.busy}>
                  {otpState.busy ? 'Verifying & Resetting…' : 'Verify & Reset Password'}
                </PrimaryButton>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone: Logout */}
      <div className="bg-surface-container-lowest rounded-xl border border-error/30 p-6 shadow-pixel-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-error/20">
          <span className="material-symbols-outlined text-error text-[20px]">logout</span>
          <h3 className="font-display text-headline-sm text-error font-bold">Session</h3>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Log out of your active session on this device.</p>
        <button
          type="button"
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-error-container text-on-error-container font-mono text-label-md font-bold border border-error/40 shadow-pixel-sm hover:bg-error-container/80 press"
        >
          Sign Out of PixelTalk
        </button>
      </div>
    </div>
  );
}

function PrivacySection({ user, setUser }) {
  const [accountType, setAccountType] = useState(user?.privacy?.accountType || 'public');
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState('');
  const [privacyError, setPrivacyError] = useState('');

  // Pending follow requests queue
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [requestError, setRequestError] = useState('');

  const loadPending = async () => {
    try {
      setLoadingRequests(true);
      const data = await followService.getPendingRequests();
      setPendingRequests(data.requests || []);
    } catch (err) {
      setRequestError(err.message || 'Failed to load follow requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleUpdatePrivacy = async (type) => {
    if (savingPrivacy || type === accountType) return;
    setSavingPrivacy(true);
    setPrivacySuccess('');
    setPrivacyError('');
    try {
      const res = await userService.updateMe({ privacy: { accountType: type } });
      setAccountType(type);
      setUser(res.user);
      sfx.success();
      setPrivacySuccess(`Account privacy successfully set to ${type.toUpperCase()}.`);
      if (type === 'private') {
        loadPending();
      }
    } catch (err) {
      sfx.error();
      setPrivacyError(err.message || 'Failed to update account privacy');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleRespond = async (requestId, action) => {
    setRespondingId(requestId);
    setRequestError('');
    try {
      await followService.respondRequest(requestId, action);
      if (action === 'ACCEPTED') {
        sfx.success();
      } else {
        sfx.click();
      }
      setPendingRequests((prev) => prev.filter((r) => (r._id || r.id) !== requestId));
    } catch (err) {
      sfx.error();
      setRequestError(err.message || `Failed to ${action.toLowerCase()} follow request`);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-6 shadow-pixel-sm space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-tertiary/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
          <h2 className="font-display text-headline-md text-tertiary font-bold">Account Privacy &amp; Follow Requests</h2>
        </div>
        <Badge tone={accountType === 'private' ? 'deep' : 'green'}>
          {accountType === 'private' ? 'PRIVATE ACCOUNT' : 'PUBLIC ACCOUNT'}
        </Badge>
      </div>

      {/* Privacy Mode Radio Cards */}
      <div className="space-y-3">
        <div>
          <label className="block font-mono text-label-md font-bold text-tertiary uppercase tracking-wide mb-1">
            Account Visibility &amp; Direct Messaging
          </label>
          <p className="font-body-sm text-[12px] text-on-surface-variant mb-3">
            Choose who can discover your full profile, view your bio &amp; banner, and initiate direct conversations with you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Public Option */}
          <button
            type="button"
            disabled={savingPrivacy}
            onClick={() => handleUpdatePrivacy('public')}
            className={`flex flex-col p-4 rounded-xl border-2 text-left transition-all relative ${
              accountType === 'public'
                ? 'border-primary bg-secondary-container/40 shadow-pixel-sm'
                : 'border-tertiary/20 bg-surface hover:border-tertiary/60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[22px] ${accountType === 'public' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  public
                </span>
                <span className="font-display font-bold text-on-surface text-headline-sm">Public Account</span>
              </div>
              {accountType === 'public' && <span className="w-3 h-3 rounded-full bg-primary" />}
            </div>
            <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
              Anyone can view your full profile, bio, and banner. Fellow players can follow you automatically without prior approval and message you directly.
            </p>
            <div className="mt-3 pt-2 border-t border-tertiary/10 font-mono text-[10px] text-primary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Instant follow &amp; direct chats</span>
            </div>
          </button>

          {/* Private Option */}
          <button
            type="button"
            disabled={savingPrivacy}
            onClick={() => handleUpdatePrivacy('private')}
            className={`flex flex-col p-4 rounded-xl border-2 text-left transition-all relative ${
              accountType === 'private'
                ? 'border-primary bg-secondary-container/40 shadow-pixel-sm'
                : 'border-tertiary/20 bg-surface hover:border-tertiary/60'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[22px] ${accountType === 'private' ? 'text-primary' : 'text-on-surface-variant'}`}>
                  lock
                </span>
                <span className="font-display font-bold text-on-surface text-headline-sm">Private Account</span>
              </div>
              {accountType === 'private' && <span className="w-3 h-3 rounded-full bg-primary" />}
            </div>
            <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
              Strict backend isolation: non-approved users only see your username and avatar. Your bio, banner, and details remain hidden, and new direct chats require accepted follow approval.
            </p>
            <div className="mt-3 pt-2 border-t border-tertiary/10 font-mono text-[10px] text-tertiary font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>Requires your follow approval</span>
            </div>
          </button>
        </div>

        {privacyError && <ErrorText>{privacyError}</ErrorText>}
        {privacySuccess && (
          <p className="font-mono text-label-sm text-primary font-bold flex items-center gap-1.5 p-2 bg-secondary-container/30 border border-tertiary/20 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {privacySuccess}
          </p>
        )}
      </div>

      {/* Pending Follow Requests Queue */}
      <div className="pt-4 border-t border-tertiary/15 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-label-md font-bold text-tertiary uppercase tracking-wide">
              Pending Follow Requests
            </h3>
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              Approve or reject follow requests from players who want to follow your account.
            </p>
          </div>
          {pendingRequests.length > 0 && <Badge tone="deep">{pendingRequests.length} Pending</Badge>}
        </div>

        {requestError && <ErrorText>{requestError}</ErrorText>}

        {loadingRequests ? (
          <p className="font-mono text-label-sm text-on-surface-variant py-4 text-center">Loading requests…</p>
        ) : pendingRequests.length === 0 ? (
          <div className="p-6 bg-surface-container/40 rounded-xl border border-tertiary/15 text-center space-y-1">
            <span className="material-symbols-outlined text-tertiary/50 text-[32px]">person_check</span>
            <p className="font-mono text-label-sm text-on-surface font-bold">No Pending Requests</p>
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              When players request to follow your private account, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {pendingRequests.map((req) => {
              const follower = req.followerId || {};
              const reqId = req._id || req.id;
              const isBusy = respondingId === reqId;
              return (
                <div
                  key={reqId}
                  className="p-3 bg-surface rounded-xl border border-tertiary/20 shadow-pixel-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={getUserAvatar(follower)}
                      alt={follower.displayName || follower.username}
                      size={40}
                      ring={false}
                    />
                    <div className="min-w-0">
                      <p className="font-display text-body-md font-bold text-on-surface truncate">
                        {follower.displayName || follower.username}
                      </p>
                      <p className="font-mono text-[11px] text-tertiary truncate">
                        @{follower.username} • {timeAgo(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRespond(reqId, 'REJECTED')}
                      className="px-3 py-1.5 bg-surface-container text-on-surface font-mono text-label-xs font-bold rounded-lg border border-tertiary/30 hover:bg-surface-container-high press disabled:opacity-50"
                    >
                      {isBusy ? '…' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRespond(reqId, 'ACCEPTED')}
                      className="px-3.5 py-1.5 bg-primary-container text-surface-container font-mono text-label-xs font-bold rounded-lg border border-tertiary shadow-pixel-xs hover:brightness-105 press disabled:opacity-50"
                    >
                      {isBusy ? '…' : 'Accept'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
