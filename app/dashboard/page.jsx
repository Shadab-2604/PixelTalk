/**
 * File: page.jsx (Dashboard)
 *
 * Responsibility:
 * Authenticated user home hub displaying recent direct conversations,
 * pinned chats, joined community lounges, and real-time quick actions.
 *
 * Layer:
 * Frontend / Authenticated Pages
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/features/conversations/ConversationSidebar.jsx
 * - frontend/services/conversationService.js
 * - frontend/hooks/useAuth.jsx
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { SidebarFooter } from '@/components/AppShell';
import { conversationService } from '@/services/conversationService';
import { conversationLabel, conversationAvatarId } from '@/features/conversations/conversationUtils';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { avatarSrc } from '@/lib/avatars';
import { timeAgo } from '@/lib/format';
import { Badge, Avatar, EmptyState, PrimaryButton } from '@/components/ui';

export default function DashboardPage() {
  useRequireAuth();
  const { user } = useAuth();
  const { play } = useSound();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    conversationService
      .list()
      .then((d) => setConvos(d.conversations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const filtered = useMemo(() => {
    if (filter === 'direct') return convos.filter((c) => c.type === 'direct');
    if (filter === 'group') return convos.filter((c) => c.type === 'group');
    return convos;
  }, [convos, filter]);

  const unread = convos.reduce((n, c) => n + (c.unreadCount || 0), 0);

  return (
    <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
      <div className="p-6 lg:p-8 bg-surface-container/60 min-h-full">
        {/* Welcome hero */}
        <section className="mb-8 bg-surface border-[1.5px] border-tertiary rounded-xl p-6 lg:p-7 shadow-pixel-sm-solid relative overflow-hidden">
          <div className="absolute right-0 top-0 w-36 h-36 bg-secondary-container/20 pixel-dither-pattern pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-secondary-container/60 border border-tertiary/20 text-on-secondary-container font-mono text-label-sm mb-2.5">
                <span className="w-2 h-2 bg-primary-container" />
                <span>NETWORK STATUS: {unread > 0 ? `${unread} UNREAD` : 'ONLINE & READY'}</span>
              </div>
              <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">
                {greeting}, {user?.displayName}.
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">What&rsquo;s happening in your world?</p>
            </div>
            <Link href="/rooms">
              <PrimaryButton size="lg" onClick={() => play('click')}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>+ NEW ROOM</span>
              </PrimaryButton>
            </Link>
          </div>
        </section>

        {/* Bento stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <BentoCard kicker="DAILY STATS" icon="trending_up">
            <div className="font-display text-display-lg text-primary font-bold">{convos.length}</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Active conversations across your lounges</p>
          </BentoCard>
          <BentoCard kicker="UNREAD" icon="mark_email_unread">
            <div className="font-display text-display-lg text-primary font-bold">{unread}</div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Messages waiting for you right now</p>
          </BentoCard>
          <BentoCard kicker="AUDIO PROFILE" icon="graphic_eq">
            <h3 className="font-display text-headline-sm text-on-surface font-bold">Chiptune Pack 01</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Snappy 8-bit blips for keypresses and popups</p>
            <div className="mt-4 pt-3 border-t border-tertiary/15 flex items-center justify-between">
              <span className="font-mono text-[10px] text-primary-container font-bold">ENABLED</span>
              <Link href="/settings" className="font-mono text-[11px] text-tertiary hover:underline">Change Sound</Link>
            </div>
          </BentoCard>
        </div>

        {/* Conversation stream */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-headline-md text-on-surface font-bold">Conversation Stream</h2>
              <Badge tone="brown">Active</Badge>
            </div>
            <div className="flex items-center gap-2">
              {[
                ['all', 'All'],
                ['direct', 'Direct'],
                ['group', 'Squads'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1 rounded font-mono text-label-sm border transition-all ${
                    filter === key ? 'bg-surface-container-lowest border-tertiary/25 text-on-surface' : 'border-transparent text-on-surface-variant hover:border-tertiary/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="font-mono text-label-sm text-on-surface-variant">Loading conversations…</p>
          ) : filtered.length === 0 ? (
            <EmptyState icon="forum" title="No conversations yet" hint="Start a direct chat from the sidebar or create a room." />
          ) : (
            filtered.map((c) => {
              const href = c.type === 'group' ? `/rooms/${c._id}` : `/chat/${c._id}`;
              const memberCount = c.members?.length || 0;
              return (
                <Link key={c._id} href={href}>
                  <article className="bg-surface-container-lowest border-[1.5px] border-tertiary/30 hover:border-tertiary rounded-xl p-5 shadow-pixel-sm transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <Avatar src={avatarSrc(conversationAvatarId(c))} alt={conversationLabel(c, user)} size={44} online={c.type === 'direct'} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-headline-sm text-on-surface font-bold group-hover:text-primary transition-colors truncate">
                              {conversationLabel(c, user)}
                            </h3>
                            {c.type === 'group' ? (
                              <Badge tone="green">{memberCount} PLAYERS</Badge>
                            ) : (
                              <Badge tone="brown">DIRECT</Badge>
                            )}
                            <span className="font-mono text-label-sm text-on-surface-variant/70">{timeAgo(c.updatedAt)}</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 truncate">
                            {c.description || (c.type === 'group' ? `${memberCount} members in this room` : 'Direct conversation')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {(c.unreadCount || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-primary-container text-surface-container font-mono text-label-sm rounded font-bold shadow-pixel-sm">
                            {c.unreadCount} UNREAD
                          </span>
                        )}
                        <span className="material-symbols-outlined text-tertiary/40 group-hover:text-tertiary transition-colors">arrow_forward</span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}

function BentoCard({ kicker, icon, children }) {
  return (
    <div className="bg-surface-container-lowest border-[1.5px] border-tertiary rounded-xl p-4 shadow-pixel-sm flex flex-col justify-between hover:border-tertiary transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container-high text-tertiary border border-tertiary/20 font-bold">{kicker}</span>
        <span className="material-symbols-outlined text-tertiary text-[18px]">{icon}</span>
      </div>
      {children}
    </div>
  );
}
