/**
 * File: page.jsx (Admin Overview Dashboard)
 *
 * Responsibility:
 * High-level administrative analytics overview displaying key system metrics:
 * Total Users, Active Users, Online Presence, Suspensions, Bans, Conversations,
 * and Today's Message Volume, alongside recent audit events.
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/services/adminService.js
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminService } from '@/services/adminService';
import { Badge, EmptyState, Spinner, PrimaryButton } from '@/components/ui';
import { dateShort, timeShort, timeAgo } from '@/lib/format';
import { sfx } from '@/lib/sound';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError('');
    try {
      const [statsData, logsData] = await Promise.all([
        adminService.stats(),
        adminService.auditLogs({ limit: 6 }),
      ]);
      setStats(statsData.stats);
      setRecentLogs(logsData.logs || []);
      if (isManual) sfx.success();
    } catch (err) {
      setError(err.message || 'Failed to fetch platform metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner />
        <p className="font-mono text-label-sm text-on-surface-variant">Loading platform analytics…</p>
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

  const toneForAction = (action) => {
    if (action.includes('BANNED') || action.includes('FAILED') || action.includes('UNAUTHORIZED')) return 'error';
    if (action.includes('SUSPENDED')) return 'amber';
    if (action.includes('DELETED')) return 'error';
    if (action.includes('SUCCESS')) return 'green';
    return 'brown';
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
            <span>Admin</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-bold">Dashboard</span>
          </div>
          <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Platform Administration</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Real-time telemetry, user management, and security governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest border border-tertiary/30 rounded-lg font-mono text-label-sm font-bold text-tertiary shadow-pixel-sm hover:bg-surface-container active:scale-95 transition-all"
            title="Refresh analytics data"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
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
                : c.tone === 'amber' ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/30'
              }`}>
                <span className="material-symbols-outlined text-lg">{c.icon}</span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-tertiary/10 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-secondary inline-block rounded-full animate-pulse" />
                Live metric
              </span>
              <span className="text-tertiary font-bold">Verified</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access & Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Hub */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm space-y-3">
            <h2 className="font-display text-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
              <span>Moderation Quick Actions</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <Link href="/admin/users" className="flex items-center gap-2.5 p-3 rounded-lg bg-surface border border-tertiary/20 hover:border-tertiary hover:bg-secondary-container/20 shadow-pixel-sm transition-all">
                <span className="material-symbols-outlined text-secondary text-[20px]">manage_accounts</span>
                <div>
                  <span className="font-display text-label-sm font-bold text-on-surface block">Player Accounts</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">Manage, ban, delete</span>
                </div>
              </Link>
              <Link href="/admin/groups" className="flex items-center gap-2.5 p-3 rounded-lg bg-surface border border-tertiary/20 hover:border-tertiary hover:bg-secondary-container/20 shadow-pixel-sm transition-all">
                <span className="material-symbols-outlined text-primary text-[20px]">forum</span>
                <div>
                  <span className="font-display text-label-sm font-bold text-on-surface block">Community Rooms</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">Inspect & moderate</span>
                </div>
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-2.5 p-3 rounded-lg bg-surface border border-tertiary/20 hover:border-tertiary hover:bg-secondary-container/20 shadow-pixel-sm transition-all">
                <span className="material-symbols-outlined text-tertiary text-[20px]">policy</span>
                <div>
                  <span className="font-display text-label-sm font-bold text-on-surface block">Audit Trail</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">Security events</span>
                </div>
              </Link>
              <Link href="/admin/system" className="flex items-center gap-2.5 p-3 rounded-lg bg-surface border border-tertiary/20 hover:border-tertiary hover:bg-secondary-container/20 shadow-pixel-sm transition-all">
                <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                <div>
                  <span className="font-display text-label-sm font-bold text-on-surface block">System Health</span>
                  <span className="font-mono text-[10px] text-on-surface-variant">Uptime & database</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm">
            <h2 className="font-display text-title-md font-bold text-on-surface flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">security</span>
              <span>Privacy Shield Active</span>
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              PixelTalk strictly enforces zero-knowledge private message privacy. Admins cannot read private chats, inspect message texts, or browse attachments.
            </p>
          </div>
        </div>

        {/* Recent Audit Actions Feed */}
        <div className="lg:col-span-7">
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">history</span>
                  <span>Recent System & Audit Events</span>
                </h2>
                <Link href="/admin/reports" className="font-mono text-[11px] text-primary font-bold hover:underline">
                  View full trail →
                </Link>
              </div>

              {recentLogs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-mono text-label-sm text-on-surface-variant">No recent audit records found.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div
                      key={log._id || log.id}
                      className="p-2.5 bg-surface rounded-lg border border-tertiary/15 flex items-center justify-between gap-3 text-label-sm font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge tone={toneForAction(log.action)} className="text-[10px] px-1.5 py-0.5 shrink-0">
                          {log.action}
                        </Badge>
                        <span className="text-on-surface truncate">
                          {log.adminId ? `@${log.adminId.username}` : 'System'} on {log.targetType}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant shrink-0">
                        {timeAgo(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-tertiary/10 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
              <span>Total Audit Records: {stats.totalAuditLogs || 0}</span>
              <span className="text-secondary font-bold">Immutable Logging</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
