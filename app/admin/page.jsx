/**
 * File: page.jsx (Admin Overview Dashboard)
 *
 * Responsibility:
 * High-level administrative analytics overview displaying key system metrics:
 * Total Users, Active Users, Online Presence, Suspensions, Bans, Conversations,
 * and Today's Message Volume.
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/services/adminService.js
 */

'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { Badge, EmptyState, Spinner } from '@/components/ui';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .stats()
      .then((d) => setStats(d.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (error) return <EmptyState icon="error" title="Failed to load stats" hint={error} />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: 'group', tone: 'green' },
    { label: 'Active Users', value: stats.activeUsers, icon: 'how_to_reg', tone: 'brown' },
    { label: 'Online Users', value: stats.onlineUsers, icon: 'wifi', tone: 'deep' },
    { label: 'Total Conversations', value: stats.totalConversations, icon: 'chat_bubble', tone: 'brown' },
    { label: 'Total Groups', value: stats.totalGroups, icon: 'forum', tone: 'green' },
    { label: 'Messages Today', value: stats.messagesToday, icon: 'send', tone: 'deep' },
    { label: 'Suspended Users', value: stats.suspendedUsers, icon: 'pause_circle', tone: 'amber' },
    { label: 'Banned Users', value: stats.bannedUsers, icon: 'block', tone: 'error' },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Dashboard</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Server Administration</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Real-time governance across players, rooms, and messages.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface-container-lowest p-4 rounded-xl border border-tertiary/20 shadow-pixel-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-label-sm text-on-surface-variant uppercase tracking-wider block">{c.label}</span>
                <span className="font-display text-headline-md font-bold text-on-surface mt-1 block">{c.value}</span>
              </div>
              <div className={`p-2 rounded-lg border shadow-pixel-sm-solid ${
                c.tone === 'green' ? 'bg-secondary-container text-secondary border-tertiary/20'
                : c.tone === 'deep' ? 'bg-primary-container text-surface-container border-tertiary'
                : c.tone === 'error' ? 'bg-error-container text-error border-error/30'
                : 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/30'
              }`}>
                <span className="material-symbols-outlined text-lg">{c.icon}</span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-tertiary/10 flex items-center gap-1.5 font-mono text-label-sm">
              <span className="w-1.5 h-1.5 bg-primary-container" />
              <span className="text-on-surface-variant">live count</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
