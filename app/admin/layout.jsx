/**
 * File: layout.jsx (Admin Console Layout)
 *
 * Responsibility:
 * Protected administrative console shell:
 * - Restricts access strictly to verified `role === 'admin'` accounts
 * - Renders dedicated admin navigation sidebar with system status
 * - Fallback login gate for unauthenticated or non-admin access attempts
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/hooks/useAuth.jsx
 * - frontend/components/TopBar.jsx
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { SidebarFooter } from '@/components/AppShell';
import { LogoFull } from '@/components/Logo';
import { Badge, Input, PrimaryButton, ErrorText, PasswordInput } from '@/components/ui';
import { sfx } from '@/lib/sound';

const ADMIN_NAV = [
  { href: '/admin', icon: 'dashboard', label: 'Dashboard' },
  { href: '/admin/profile', icon: 'badge', label: 'Admin Profile' },
  { href: '/admin/settings', icon: 'settings', label: 'Admin Settings' },
  { href: '/admin/users', icon: 'group', label: 'Users' },
  { href: '/admin/groups', icon: 'forum', label: 'Groups' },
  { href: '/admin/reports', icon: 'flag', label: 'Reports' },
  { href: '/admin/system', icon: 'terminal', label: 'System' },
];

export default function AdminLayout({ children }) {
  const { user, loading, login, logout } = useAuth();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => setMobileNavOpen(false), [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container flex items-center justify-center">
        <p className="font-mono text-label-md text-on-surface-variant">Verifying access…</p>
      </div>
    );
  }

  // If user is not authenticated or not an admin, render the dedicated hidden Admin Login Portal
  if (!user || user.role !== 'admin') {
    return <AdminLoginGate onLogin={login} onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-surface-container bg-pixel-grid">
      <TopBar adminBadge onToggleSidebar={() => setMobileNavOpen((o) => !o)} showSidebarToggle />
      <div className="flex w-full min-h-[calc(100vh-4rem)]">
        <aside className="hidden lg:flex flex-col justify-between w-64 p-4 border-r border-tertiary/20 bg-surface-container-low shadow-pixel-sm sticky top-16 h-[calc(100vh-4rem)] shrink-0">
          <div className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center gap-2.5 p-2.5 bg-surface-container rounded-lg border border-tertiary/20 shadow-pixel-sm">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary font-bold shadow-pixel-sm-solid">
                <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-headline-sm font-bold text-tertiary leading-none">PixelTalk</span>
                <span className="font-mono text-label-sm text-on-surface-variant">Admin Console</span>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-tertiary uppercase tracking-wider font-bold px-4 py-1">Moderation</span>
              {ADMIN_NAV.map((n) => {
                const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-3 font-mono text-label-md rounded-lg px-4 py-2 transition-all ${
                      active
                        ? 'bg-secondary-container text-on-secondary-container font-bold border border-tertiary/30 shadow-pixel-terracotta'
                        : 'text-on-surface-variant hover:bg-secondary-container/40 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 pt-3 border-t border-tertiary/20">
              <span className="font-mono text-[10px] text-tertiary uppercase tracking-wider font-bold block mb-2 px-4">Player space</span>
              <Link href="/dashboard" className="flex items-center gap-3 font-mono text-label-md rounded-lg px-4 py-2 text-on-surface-variant hover:bg-secondary-container/40">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to app
              </Link>
            </div>
          </div>
          <SidebarFooter />
        </aside>

        {/* Mobile top admin nav rail */}
        <div className="lg:hidden w-full bg-surface-container-low border-b border-tertiary/20 p-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
          {ADMIN_NAV.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex-shrink-0 flex items-center gap-1.5 font-mono text-[11px] font-bold rounded-lg px-3 py-1.5 transition-all ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container border border-tertiary/30'
                    : 'text-on-surface-variant hover:bg-secondary-container/30'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}

/** Hidden Admin Access Portal rendered when accessing /admin unauthenticated */
function AdminLoginGate({ onLogin, onLogout }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const loggedUser = await onLogin({ identifier: identifier.trim(), password });
      if (!loggedUser || loggedUser.role !== 'admin') {
        await onLogout();
        throw new Error('Access denied: Account is not an administrator');
      }
      sfx.success();
    } catch (err) {
      sfx.error();
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container bg-pixel-grid flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-container-lowest border-2 border-tertiary/40 rounded-2xl p-7 sm:p-9 shadow-pixel-lg relative">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-tertiary/15">
          <div className="w-12 h-12 flex-shrink-0 bg-surface-container p-1 rounded-xl border border-tertiary/30 shadow-pixel-terracotta">
            <LogoFull height={40} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-primary-container inline-block" />
              <span className="font-mono text-label-sm uppercase font-bold tracking-wider text-tertiary">Restricted Console</span>
            </div>
            <h1 className="font-display text-headline-sm text-on-surface font-bold">Admin Portal</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1.5">Admin Email or Username</label>
            <Input
              type="text"
              autoFocus
              required
              placeholder="e.g. admin@pixeltalk.dev"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={busy}
              className="bg-surface"
            />
          </div>

          <div>
            <label className="block font-mono text-label-sm uppercase font-bold text-tertiary mb-1.5">Admin Password</label>
            <PasswordInput
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="bg-surface"
            />
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          <PrimaryButton type="submit" disabled={busy} className="w-full justify-center py-2.5 mt-2">
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>{busy ? 'Authenticating…' : 'Access Admin Console'}</span>
          </PrimaryButton>
        </form>

        <div className="mt-6 pt-4 border-t border-tertiary/15 flex items-center justify-between font-mono text-label-sm text-on-surface-variant">
          <Link href="/" className="hover:text-tertiary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">arrow_back</span> Return to Lounge
          </Link>
          <span className="text-[10px] text-tertiary/60 font-bold uppercase">ENV Protected</span>
        </div>
      </div>
    </div>
  );
}
