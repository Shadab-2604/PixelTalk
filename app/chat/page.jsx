/**
 * File: page.jsx (Direct Messages Index)
 *
 * Responsibility:
 * Index route for direct player messages. Displays active conversations or
 * prompt to select/start a conversation.
 *
 * Layer:
 * Frontend / Messaging Pages
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/features/conversations/ConversationSidebar.jsx
 * - frontend/services/conversationService.js
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell, SidebarFooter } from '@/components/AppShell';
import { ConversationSidebar } from '@/features/conversations/ConversationSidebar';
import { conversationService } from '@/services/conversationService';
import { conversationLabel, conversationAvatarId } from '@/features/conversations/conversationUtils';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { avatarSrc } from '@/lib/avatars';
import { timeAgo } from '@/lib/format';
import { Badge, Avatar, EmptyState } from '@/components/ui';

export default function MessagesIndexPage() {
  useRequireAuth();
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = usePresence();

  useEffect(() => {
    conversationService
      .list()
      .then((d) => setConvos((d.conversations || []).filter((c) => c.type === 'direct')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell sidebar={<><ConversationSidebar /><SidebarFooter /></>}>
      <div className="p-6 lg:p-8 bg-surface-container/60">
        <h1 className="font-display text-headline-lg font-bold text-on-surface mb-1">Messages</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">Your direct conversations.</p>

        {loading ? (
          <p className="font-mono text-label-sm text-on-surface-variant">Loading…</p>
        ) : convos.length === 0 ? (
          <EmptyState icon="chat_bubble" title="No direct chats yet" hint="Use “New Chat” in the sidebar to find a player." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {convos.map((c) => (
              <Link key={c._id} href={`/chat/${c._id}`}>
                <article className="bg-surface-container-lowest border-[1.5px] border-tertiary/30 hover:border-tertiary rounded-xl p-4 shadow-pixel-sm transition-all flex items-center gap-3.5">
                  <Avatar src={avatarSrc(conversationAvatarId(c))} size={44} online={isOnline(c.otherUser?._id)} />
                  <div className="min-w-0">
                    <p className="font-display text-headline-sm font-bold text-on-surface truncate">{conversationLabel(c, user)}</p>
                    <p className="font-mono text-label-sm text-tertiary truncate">@{c.otherUser?.username}</p>
                  </div>
                  <span className="ml-auto font-mono text-label-sm text-on-surface-variant">{timeAgo(c.updatedAt)}</span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
