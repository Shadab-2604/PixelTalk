/**
 * File: page.jsx (Admin Console Settings)
 *
 * Responsibility:
 * Administrator configuration console:
 * - Account identity and profile preferences
 * - Administrative password updates
 * - Visual console theme toggles
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/services/userService.js
 * - frontend/hooks/useAuth.jsx
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { AVATARS } from '@/components/Avatar';
import { PixelAvatar } from '@/components/Avatar';
import {
  Input,
  Textarea,
  PrimaryButton,
  GhostButton,
  Badge,
  Spinner,
  ErrorText,
  PasswordInput,
} from '@/components/ui';
import { sfx } from '@/lib/sound';

const THEMES = [
  { id: 'cream', name: 'Warm Cream (Default)' },
  { id: 'slate', name: 'Dark Slate' },
  { id: 'forest', name: 'Deep Forest' },
  { id: 'earth', name: 'Earth Terracotta' },
];

export default function AdminSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'appearance' | 'admin' | 'security'

  // Account form
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: bool, message: string }
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-01');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Appearance & preferences
  const [theme, setTheme] = useState('cream');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [density, setDensity] = useState('comfortable');
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState('');

  // Admin moderation prefs (local client state)
  const [autoRefreshStats, setAutoRefreshStats] = useState(true);
  const [strictAuditMode, setStrictAuditMode] = useState(true);
  const [adminPrefSuccess, setAdminPrefSuccess] = useState('');

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Populate from user
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setCustomStatus(user.customStatus || '');
      setSelectedAvatar(user.avatarId || 'avatar-01');

      if (user.preferences) {
        setTheme(user.preferences.theme || 'cream');
        setSoundEnabled(user.preferences.soundEnabled !== false);
        setSoundVolume(user.preferences.soundVolume ?? 0.8);
        setNotificationsEnabled(user.preferences.notificationsEnabled !== false);
        setDensity(user.preferences.density || 'comfortable');
      }
    }
  }, [user]);

  // Debounced username availability check
  useEffect(() => {
    const raw = username.trim().replace(/^@/, '');
    if (!raw || (user && raw.toLowerCase() === user.username.toLowerCase())) {
      setUsernameStatus(null);
      setCheckingUsername(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(raw)) {
      setUsernameStatus({ available: false, message: '3-30 chars (letters, numbers, underscore)' });
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await userService.checkUsername(raw);
        setUsernameStatus(res);
      } catch (err) {
        setUsernameStatus({ available: false, message: 'Failed to verify username' });
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user]);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountSaving(true);
    setAccountError('');
    setAccountSuccess('');

    try {
      await userService.updateProfile({
        displayName: displayName.trim(),
        username: username.trim().replace(/^@/, ''),
        bio: bio.trim(),
        customStatus: customStatus.trim(),
        avatarId: selectedAvatar,
      });
      await refreshUser();
      sfx.success();
      setAccountSuccess('Admin identity updated successfully!');
    } catch (err) {
      sfx.error();
      setAccountError(err.message || 'Failed to update admin account');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setPrefSaving(true);
    setPrefSuccess('');

    try {
      await userService.updateProfile({
        preferences: {
          theme,
          soundEnabled,
          soundVolume,
          notificationsEnabled,
          density,
        },
      });
      await refreshUser();
      sfx.success();
      setPrefSuccess('Appearance & sensory settings saved!');
    } catch (err) {
      sfx.error();
    } finally {
      setPrefSaving(false);
    }
  };

  const handleSaveAdminPrefs = (e) => {
    e.preventDefault();
    sfx.success();
    setAdminPrefSuccess('Administrative runtime parameters updated!');
    setTimeout(() => setAdminPrefSuccess(''), 3000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      setPasswordSaving(false);
      sfx.error();
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      setPasswordSaving(false);
      sfx.error();
      return;
    }

    try {
      await userService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      sfx.success();
      setPasswordSuccess('Admin password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      sfx.error();
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const TABS = [
    { id: 'account', label: 'Admin Identity', icon: 'badge' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'admin', label: 'Administration', icon: 'admin_panel_settings' },
    { id: 'security', label: 'Security & Auth', icon: 'lock' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Settings</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">
          Admin Control Center
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Configure administrative identity, moderation tooling, and console security.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-tertiary/20 pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              sfx.click();
              setActiveTab(t.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-label-sm uppercase font-bold transition-all shrink-0 ${
              activeTab === t.id
                ? 'bg-secondary-container text-on-secondary-container border border-tertiary/30 shadow-pixel-terracotta'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ACCOUNT TAB */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="space-y-6 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-tertiary/20 shadow-pixel-sm">
          <div>
            <h2 className="font-display text-title-lg font-bold text-on-surface">Admin Identity & Avatar</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Update your public name and administrative presence.</p>
          </div>

          {/* Avatar selector */}
          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-2">Select Admin Avatar</label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setSelectedAvatar(av.id);
                  }}
                  className={`p-1 rounded-xl border-2 transition-all aspect-square flex items-center justify-center ${
                    selectedAvatar === av.id
                      ? 'border-primary bg-secondary-container/60 shadow-pixel-terracotta scale-105'
                      : 'border-tertiary/20 hover:border-tertiary/40 bg-surface-container'
                  }`}
                >
                  <PixelAvatar avatarId={av.id} size={44} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={40}
                placeholder="Admin Display Name"
                className="bg-surface"
              />
            </div>

            <div>
              <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">
                Admin Username (Unique)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-mono text-tertiary font-bold">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  required
                  maxLength={30}
                  className="pl-8 bg-surface"
                />
              </div>
              <div className="mt-1 font-mono text-label-xs">
                {checkingUsername && <span className="text-tertiary">Verifying availability…</span>}
                {!checkingUsername && usernameStatus && (
                  <span className={usernameStatus.available ? 'text-secondary font-bold' : 'text-error font-bold'}>
                    {usernameStatus.available ? '✓ Username available' : `✕ ${usernameStatus.message}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Admin Email (Read-Only)</label>
            <Input value={user.email} disabled className="bg-surface-container text-on-surface-variant font-mono text-sm opacity-80" />
          </div>

          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Admin Custom Status</label>
            <Input
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. Overseeing Server Operations"
              maxLength={100}
              className="bg-surface"
            />
          </div>

          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Administrative Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief overview of your administrative jurisdiction..."
              rows={3}
              maxLength={240}
              className="bg-surface"
            />
          </div>

          {accountError && <ErrorText>{accountError}</ErrorText>}
          {accountSuccess && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg font-mono text-label-sm border border-secondary/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
              <span>{accountSuccess}</span>
            </div>
          )}

          <div className="pt-2">
            <PrimaryButton type="submit" disabled={accountSaving || (usernameStatus && !usernameStatus.available)}>
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{accountSaving ? 'Saving Changes…' : 'Save Admin Identity'}</span>
            </PrimaryButton>
          </div>
        </form>
      )}

      {/* APPEARANCE TAB */}
      {activeTab === 'appearance' && (
        <form onSubmit={handleSavePreferences} className="space-y-6 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-tertiary/20 shadow-pixel-sm">
          <div>
            <h2 className="font-display text-title-lg font-bold text-on-surface">Console Appearance & Sensories</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Customize your dashboard theme and audio feedback.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-2">Dashboard Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-surface border-2 border-tertiary/30 rounded-lg px-3 py-2 font-mono text-label-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-2">Display Density</label>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="w-full bg-surface border-2 border-tertiary/30 rounded-lg px-3 py-2 font-mono text-label-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="comfortable">Comfortable (Standard)</option>
                <option value="compact">Compact (High Density)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="font-mono text-label-sm text-on-surface font-bold">Enable Pixel SFX Audio Feedback</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="font-mono text-label-sm text-on-surface font-bold">Enable Desktop / Sound Notifications</span>
            </label>
          </div>

          {prefSuccess && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg font-mono text-label-sm border border-secondary/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
              <span>{prefSuccess}</span>
            </div>
          )}

          <div className="pt-2">
            <PrimaryButton type="submit" disabled={prefSaving}>
              <span className="material-symbols-outlined text-sm">palette</span>
              <span>{prefSaving ? 'Saving…' : 'Save Appearance'}</span>
            </PrimaryButton>
          </div>
        </form>
      )}

      {/* ADMINISTRATION TAB */}
      {activeTab === 'admin' && (
        <form onSubmit={handleSaveAdminPrefs} className="space-y-6 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-tertiary/20 shadow-pixel-sm">
          <div>
            <h2 className="font-display text-title-lg font-bold text-on-surface">Administrative Runtime Preferences</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Control moderation behavior and real-time telemetry polling.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-surface-container rounded-xl border border-tertiary/20 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-mono text-label-sm text-on-surface font-bold block">Live Telemetry Auto-Polling</span>
                  <span className="font-body-sm text-label-xs text-on-surface-variant">Automatically query active counters and user presence every 30s.</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoRefreshStats}
                  onChange={(e) => setAutoRefreshStats(e.target.checked)}
                  className="w-5 h-5 accent-primary ml-4"
                />
              </label>
            </div>

            <div className="p-4 bg-surface-container rounded-xl border border-tertiary/20 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-mono text-label-sm text-on-surface font-bold block">Strict Audit Logging Mode</span>
                  <span className="font-body-sm text-label-xs text-on-surface-variant">Log all administrative reads and search actions in addition to write operations.</span>
                </div>
                <input
                  type="checkbox"
                  checked={strictAuditMode}
                  onChange={(e) => setStrictAuditMode(e.target.checked)}
                  className="w-5 h-5 accent-primary ml-4"
                />
              </label>
            </div>
          </div>

          {adminPrefSuccess && (
            <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg font-mono text-label-sm border border-secondary/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
              <span>{adminPrefSuccess}</span>
            </div>
          )}

          <div className="pt-2">
            <PrimaryButton type="submit">
              <span className="material-symbols-outlined text-sm">settings_suggest</span>
              <span>Save Admin Runtime Rules</span>
            </PrimaryButton>
          </div>
        </form>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="space-y-4 bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-tertiary/20 shadow-pixel-sm">
            <div>
              <h2 className="font-display text-title-lg font-bold text-on-surface">Change Administrator Password</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Secure your account with high-entropy credentials.
              </p>
            </div>

            <div>
              <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Current Password</label>
              <PasswordInput
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="bg-surface"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">New Password</label>
                <PasswordInput
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="bg-surface"
                />
              </div>

              <div>
                <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1">Confirm New Password</label>
                <PasswordInput
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="bg-surface"
                />
              </div>
            </div>

            {passwordError && <ErrorText>{passwordError}</ErrorText>}
            {passwordSuccess && (
              <div className="p-3 bg-secondary-container text-on-secondary-container rounded-lg font-mono text-label-sm border border-secondary/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-secondary">check_circle</span>
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="pt-2">
              <PrimaryButton type="submit" disabled={passwordSaving}>
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                <span>{passwordSaving ? 'Updating Password…' : 'Update Admin Password'}</span>
              </PrimaryButton>
            </div>
          </form>

          {/* Session Termination Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-error/30 shadow-pixel-sm flex items-center justify-between">
            <div>
              <h3 className="font-display text-title-md font-bold text-error">End Admin Session</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Securely sign out and clear your administrative session tokens.
              </p>
            </div>
            <GhostButton
              type="button"
              onClick={() => {
                sfx.click();
                logout();
              }}
              className="text-error border-error/30 hover:bg-error-container/40"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  );
}
