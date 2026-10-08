/**
 * AppShell — Authenticated Layout & Global Event Shell
 *
 * Responsibility:
 * Renders the responsive 3-pane structure (collapsible sidebar, fluid workspace, optional
 * right inspection panel, and mobile bottom bar) for all authenticated corridors.
 * Mounts global WebSocket notification listeners to ensure messages trigger alerts
 * across every view (Dashboard, Rooms, Settings, Profile, Admin).
 *
 * CONNECTED MODULES:
 * - Hooks: frontend/hooks/useAuth.jsx, frontend/hooks/useConnectionStatus.js
 * - Services: frontend/services/notificationService.js
 * - Lib: frontend/lib/socket.js
 * - Components: frontend/components/TopBar.jsx, frontend/components/NotificationToastContainer.jsx
 *
 * CONCEPT: Context-Aware Notification Delivery
 * Computes `activeConversationId` from the URL path. If an incoming message belongs to
 * the active conversation currently in focus, sound/notification alerts are suppressed
 * to avoid annoying chime repetition while chatting.
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { TopBar } from './TopBar';
import { Avatar } from './ui';
import { useAuth } from '@/hooks/useAuth';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { avatarSrc } from '@/lib/avatars';
import { NewConversationModal } from '@/features/conversations/NewConversationModal';
import { NotificationToastContainer } from './NotificationToastContainer';
import { getSocket } from '@/lib/socket';
import { handleIncomingMessageNotification, handleIncomingInvitationNotification } from '@/services/notificationService';
import { conversationService } from '@/services/conversationService';
import { sfx } from '@/lib/sound';

const NAV = [
  { href: '/dashboard', icon: 'home', label: 'Home' },
  { href: '/chat', icon: 'chat_bubble', label: 'Messages' },
  { href: '/rooms', icon: 'group', label: 'Rooms' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

const MOBILE_NAV = [
  { href: '/dashboard', icon: 'home', label: 'Home' },
  { href: '/chat', icon: 'chat_bubble', label: 'Messages' },
  { href: '/rooms', icon: 'group', label: 'Rooms' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

/**
 * Responsive 3-pane shell:
 * - Desktop (lg+): fixed 280px sidebar + fluid main (+ page-level right inspector).
 * - Tablet (md): sidebar collapses to slide-over drawer.
 * - Mobile: drawer + fixed bottom navigation.
 */
export function AppShell({
  children,
  sidebar = null,
  rightPanel = null,
  rightDrawerOpen = false,
  onCloseRightDrawer = null,
  wide = false,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const online = useConnectionStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    onCloseRightDrawer?.();
  }, [pathname, onCloseRightDrawer]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!drawerOpen && !rightDrawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, rightDrawerOpen]);

  const activeConversationId = useMemo(() => {
    const match = pathname ? pathname.match(/^\/(?:chat|rooms)\/([^/?#]+)/) : null;
    return match ? match[1] : null;
  }, [pathname]);

  // Global socket listener: handles notifications on every page (dashboard, chat, rooms, settings, profile, admin)
  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewMessage = (payload) => {
      handleIncomingMessageNotification({
        eventData: payload,
        currentUser: user,
        activeConversationId,
        onNavigate: (route) => router.push(route),
      });
    };

    const onGroupInvitation = (payload) => {
      handleIncomingInvitationNotification({
        eventData: payload,
        currentUser: user,
        onAccept: async (toast) => {
          await conversationService.respondToInvitation(toast.invitationId, 'ACCEPT');
          sfx.success();
          router.push(`/rooms/${toast.groupId}`);
        },
        onReject: async (toast) => {
          await conversationService.respondToInvitation(toast.invitationId, 'REJECT');
          sfx.click();
        },
      });
    };

    socket.on('new_message', onNewMessage);
    socket.on('group_invitation_received', onGroupInvitation);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('group_invitation_received', onGroupInvitation);
    };
  }, [user, activeConversationId, router]);

  const sidebarNode = sidebar;

  return (
    <div className="min-h-screen bg-surface-container bg-pixel-grid">
      <TopBar onToggleSidebar={() => setDrawerOpen((o) => !o)} showSidebarToggle={Boolean(sidebarNode)} />
      <NotificationToastContainer />
      <div className={`flex mx-auto ${wide ? 'max-w-[1600px]' : 'max-w-7xl'}`}>

        {/* Sidebar: static on lg, drawer below */}
        {sidebarNode && (
          <>
            <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-tertiary/20 bg-surface-container-low pixel-dither-pattern sticky top-16 h-[calc(100dvh-4rem)]">
              {sidebarNode}
            </aside>
            {drawerOpen && (
              <div className="lg:hidden fixed inset-0 z-40 flex">
                <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                <aside className="relative w-72 max-w-[85vw] h-full bg-surface-container-low border-r-2 border-tertiary pixel-dither-pattern flex flex-col overflow-y-auto">
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="self-end m-2 w-8 h-8 rounded-lg bg-surface-container border border-tertiary/30 text-tertiary flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  {sidebarNode}
                </aside>
              </div>
            )}
          </>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 h-[calc(100dvh-4rem)] sticky top-16 overflow-y-auto">{children}</main>

        {/* Optional right inspector (xl only desktop) */}
        {rightPanel && (
          <aside className="hidden xl:flex w-80 xl:w-[330px] flex-shrink-0 border-l border-tertiary/20 bg-surface/80 sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto p-3.5">
            {rightPanel}
          </aside>
        )}

        {/* Mobile / Tablet Right Inspector Drawer */}
        {rightPanel && rightDrawerOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => onCloseRightDrawer?.()} />
            <aside className="relative w-80 max-w-[88vw] h-full bg-surface-container-low border-l-2 border-tertiary pixel-dither-pattern flex flex-col overflow-y-auto p-3.5 z-50">
              <button
                onClick={() => onCloseRightDrawer?.()}
                className="self-end mb-2 w-8 h-8 rounded-lg bg-surface-container border border-tertiary/30 text-tertiary flex items-center justify-center cursor-pointer"
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              {rightPanel}
            </aside>
          </div>
        )}
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around bg-surface border-t border-tertiary/20 py-2 pt-safe-bottom">
        {MOBILE_NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + '/');
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center font-mono text-[10px] gap-0.5 px-3 py-1 ${
                active ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="lg:hidden h-14" />
    </div>
  );
}

export function SidebarFooter() {
  const { user } = useAuth();
  const online = useConnectionStatus();
  if (!user) return null;
  return (
    <div className="p-3 bg-surface-container border-t border-tertiary/20 flex items-center justify-between mt-auto">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar src={avatarSrc(user.avatarId)} alt={user.displayName} size={32} online />
        <div className="min-w-0">
          <p className="font-display text-[12px] font-bold text-on-surface truncate">{user.displayName}</p>
          <p className="font-mono text-[10px] text-tertiary truncate">@{user.username}</p>
        </div>
      </div>
      <span
        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          online ? 'text-primary bg-secondary-container/50 border-secondary/30' : 'text-on-surface-variant border-tertiary/20'
        }`}
      >
        {online ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );
}
