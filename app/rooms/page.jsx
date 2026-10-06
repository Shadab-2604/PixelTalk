/**
 * File: page.jsx (Community Rooms Index)
 *
 * Responsibility:
 * Community group lounges directory:
 * - Lists public and joined group conversations
 * - Hosts `CreateRoomModal` dialog launcher
 * - Navigates directly into selected room view
 *
 * Layer:
 * Frontend / Rooms Pages
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/features/rooms/CreateRoomModal.jsx
 * - frontend/services/conversationService.js
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, SidebarFooter } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { conversationService } from '@/services/conversationService';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { avatarSrc } from '@/lib/avatars';
import { timeAgo } from '@/lib/format';
import { Badge, Avatar, EmptyState, PrimaryButton, Input, ErrorText } from '@/components/ui';
import { CreateRoomModal } from '@/features/rooms/CreateRoomModal';

export default function RoomsIndexPage() {
  useRequireAuth();
  const { user } = useAuth();
  const { play } = useSound();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () =>
    conversationService
      .list()
      .then((d) => setGroups((d.conversations || []).filter((c) => c.type === 'group')))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
      <div className="p-6 lg:p-8 bg-surface-container/60">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-headline-lg font-bold text-on-surface">Rooms</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Group lounges you play in.</p>
          </div>
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            <span className="material-symbols-outlined text-[18px]">add</span> NEW ROOM
          </PrimaryButton>
        </div>

        {loading ? (
          <p className="font-mono text-label-sm text-on-surface-variant">Loading…</p>
        ) : groups.length === 0 ? (
          <EmptyState icon="group" title="No rooms yet" hint="Create a room or get invited to one." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link key={g._id} href={`/rooms/${g._id}`}>
                <article className="bg-surface-container-lowest border-[1.5px] border-tertiary/30 hover:border-tertiary rounded-xl p-4 shadow-pixel-sm transition-all flex items-center gap-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarSrc(g.avatarId || 'avatar-06')} alt="" className="w-11 h-11 rounded-lg border-[1.5px] border-tertiary pixelated" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-headline-sm font-bold text-on-surface truncate">{g.name}</h3>
                      {g.privacy === 'private' && <Badge tone="amber">🔒 Passcode</Badge>}
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{g.description || 'No description'}</p>
                    <p className="font-mono text-label-sm text-tertiary mt-0.5">{g.members?.length || 0} players • {timeAgo(g.updatedAt)}</p>
                  </div>
                  <span className="material-symbols-outlined text-tertiary/40">arrow_forward</span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
      <CreateRoomModal open={createOpen} onClose={() => { setCreateOpen(false); load(); }} />
    </AppShell>
  );
}
