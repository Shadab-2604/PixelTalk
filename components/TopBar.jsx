/**
 * TopBar — Main Application Navigation Header
 *
 * Responsibility:
 * Displays PixelTalk branding, active view context titles, audio mute/unmute quick toggle,
 * user status presence pip, and profile action dropdown menu (Profile, Settings, Admin, Logout).
 *
 * CONNECTED MODULES:
 * - Hooks: frontend/hooks/useAuth.jsx, frontend/hooks/useSound.js
 * - Components: frontend/components/AppShell.jsx, frontend/features/rooms/CreateRoomModal.jsx
 * - Lib: frontend/lib/avatars.js
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { LogoMark } from './Logo';
import { Badge, Avatar, PresencePip } from './ui';
import { APP_VERSION } from '@/lib/config';
import { avatarSrc, getUserAvatar } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { CreateRoomModal } from '@/features/rooms/CreateRoomModal';

export function TopBar({ title, adminBadge = false, onToggleSidebar, showSidebarToggle = false }) {
  const { user, logout } = useAuth();
  const { enabled, toggle } = useSound();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="bg-surface border-b border-tertiary/20 shadow-topbar sticky top-0 z-40 w-full h-16 px-3 sm:px-4 py-2 flex justify-between items-center">
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-container text-surface-container border-[1.5px] border-tertiary shadow-[2px_2px_0_0_#6E3511] flex items-center justify-center press active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex-shrink-0"
            title="Open navigation menu"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px]">menu</span>
          </button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
          <span className="p-1 bg-surface-container rounded border border-tertiary/30 shadow-pixel-terracotta group-hover:bg-secondary-container transition-colors">
            <LogoMark size={26} />
          </span>
          <span className="font-display text-headline-md font-bold text-primary tracking-tight hidden sm:block">PixelTalk</span>
        </Link>
        {adminBadge && (
          <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-surface-container border border-tertiary/30 rounded shadow-pixel-terracotta">
            <span className="w-2 h-2 bg-primary" />
            <span className="font-mono text-label-sm text-tertiary font-bold tracking-wider uppercase">Admin Console</span>
          </span>
        )}
        {title && <span className="hidden md:block font-display text-headline-sm text-on-surface-variant truncate">{title}</span>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          title={enabled ? 'Sound effects: on' : 'Sound effects: off'}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-tertiary/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all press shadow-pixel-sm"
        >
          <span className="material-symbols-outlined text-[20px]">{enabled ? 'volume_up' : 'volume_off'}</span>
        </button>

        <button
          onClick={() => setCreateOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 bg-primary-container text-surface-container font-mono text-label-md font-bold px-3 py-1.5 rounded-lg border-[1.5px] border-tertiary shadow-pixel-sm-solid active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add_box</span>
          <span>Create Room</span>
        </button>

        <div className="relative ml-1" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} className="relative flex items-center" title="Account menu">
            <Avatar src={getUserAvatar(user)} alt={user?.displayName || 'profile'} size={36} online={!!user} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-surface-container-lowest border-[1.5px] border-tertiary/40 rounded-xl shadow-pixel-md overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-tertiary/15">
                <p className="font-display text-body-md font-bold text-on-surface truncate">{user?.displayName}</p>
                <p className="font-mono text-label-sm text-tertiary truncate">@{user?.username}</p>
                {user?.role === 'admin' && (
                  <Badge tone="deep" className="mt-1.5">
                    Admin
                  </Badge>
                )}
              </div>
              <nav className="py-1.5">
                <MenuItem icon="settings" label="Settings" onClick={() => { setMenuOpen(false); router.push('/settings'); }} />
                <MenuItem icon="person" label="Profile" onClick={() => { setMenuOpen(false); router.push('/profile'); }} />
                {adminBadge && (
                  <MenuItem icon="shield_person" label="Admin Console" onClick={() => { setMenuOpen(false); router.push('/admin'); }} />
                )}
                <MenuItem icon="logout" label="Log out" onClick={() => { setMenuOpen(false); logout(); }} />
              </nav>
              <div className="px-4 py-2 border-t border-tertiary/15 flex items-center justify-between font-mono text-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <PresencePip online /> v{APP_VERSION}
                </span>
                <span>Live</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </header>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-secondary-container/30 transition-colors text-left"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}
