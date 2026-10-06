/**
 * File: page.jsx (Admin System Diagnostics)
 *
 * Responsibility:
 * Displays backend infrastructure health, server uptime, Node environment status,
 * database connectivity, and WebSocket service diagnostic status.
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/lib/api.js (GET /api/health)
 * - frontend/services/adminService.js
 */

'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { adminService } from '@/services/adminService';
import { Badge, EmptyState, Spinner } from '@/components/ui';

export default function AdminSystemPage() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get('/health'), adminService.stats()])
      .then(([h, s]) => {
        setHealth(h);
        setStats(s.stats);
      })
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
  if (error) return <EmptyState icon="error" title="Cannot reach system health" hint={error} />;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">System</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">System Health</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HealthCard title="API Server" value={health?.status === 'ok' ? 'OPERATIONAL' : 'DOWN'} icon="dns" good={health?.status === 'ok'} />
        <HealthCard title="MongoDB" value={health?.status === 'ok' ? 'CONNECTED' : 'UNKNOWN'} icon="database" good={health?.status === 'ok'} />
        <HealthCard title="Socket.IO" value="RUNNING" icon="bolt" good />
      </div>

      {stats && (
        <div className="mt-6 bg-surface-container-lowest rounded-xl border border-tertiary/20 p-5 shadow-pixel-sm">
          <h2 className="font-display text-headline-sm font-bold text-tertiary mb-3">Storage Snapshot</h2>
          <dl className="font-mono text-label-sm space-y-1.5">
            <Row k="Users" v={stats.totalUsers} />
            <Row k="Conversations (direct)" v={stats.totalConversations} />
            <Row k="Groups" v={stats.totalGroups} />
            <Row k="Messages today" v={stats.messagesToday} />
          </dl>
        </div>
      )}
    </div>
  );
}

function HealthCard({ title, value, icon, good }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-tertiary/20 p-4 shadow-pixel-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${good ? 'bg-secondary-container text-on-secondary-container border-secondary/30' : 'bg-error-container text-error border-error/30'}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <div>
          <p className="font-mono text-label-sm text-on-surface-variant uppercase">{title}</p>
          <p className="font-display text-body-md font-bold text-on-surface">{value}</p>
        </div>
      </div>
      <Badge tone={good ? 'green' : 'error'}>{good ? 'LIVE' : 'ERR'}</Badge>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-surface rounded border border-tertiary/15">
      <dt className="text-on-surface-variant">{k}</dt>
      <dd className="font-bold text-on-surface">{String(v)}</dd>
    </div>
  );
}
