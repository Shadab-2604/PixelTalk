/**
 * File: page.jsx (Admin Audit & Security Reports)
 *
 * Responsibility:
 * Displays the immutable historical audit log trail:
 * Captures all moderation events (user bans, suspensions, room deletions,
 * role changes, password resets) and security events (admin logins, failed attempts,
 * unauthorized access rejections) with actor IDs, target references, and metadata.
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/services/adminService.js
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { dateShort, timeShort, timeAgo } from '@/lib/format';
import { Badge, EmptyState, Spinner, Input, Select } from '@/components/ui';

const CATEGORIES = [
  { id: '', label: 'All Actions' },
  { id: 'ADMIN_LOGIN_SUCCESS', label: 'Login Success' },
  { id: 'ADMIN_LOGIN_FAILED', label: 'Login Failed' },
  { id: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', label: 'Unauthorized Attempts' },
  { id: 'USER_SUSPENDED', label: 'User Suspended' },
  { id: 'USER_BANNED', label: 'User Banned' },
  { id: 'USER_DELETED', label: 'User Deleted' },
  { id: 'USER_ROLE_CHANGED', label: 'Role Changed' },
  { id: 'GROUP_DELETED', label: 'Group Deleted' },
];

export default function AdminReportsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.auditLogs({
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        page,
        limit: 25,
      });
      setLogs(data.logs || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit records');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetTypeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const tone = (action) => {
    if (action.includes('BANNED') || action.includes('FAILED') || action.includes('UNAUTHORIZED') || action.includes('DELETED')) {
      return 'error';
    }
    if (action.includes('SUSPENDED')) return 'amber';
    if (action.includes('SUCCESS') || action.includes('UNBANNED') || action.includes('RESTORED')) return 'green';
    return 'brown';
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Audit & Security</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Security & Governance Audit Trail</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Read-only, immutable activity log tracking administrative decisions and security events.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low p-3 rounded-xl border border-tertiary/20 shadow-pixel-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-lowest border border-tertiary/30 rounded text-label-sm shadow-pixel-sm">
          <span className="text-on-surface-variant font-mono">Action:</span>
          <Select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-lowest border border-tertiary/30 rounded text-label-sm shadow-pixel-sm">
          <span className="text-on-surface-variant font-mono">Target:</span>
          <Select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Targets</option>
            <option value="user">User</option>
            <option value="group">Group</option>
            <option value="message">Message</option>
            <option value="security">Security</option>
            <option value="system">System</option>
          </Select>
        </div>

        {(actionFilter || targetTypeFilter) && (
          <button
            onClick={() => {
              setActionFilter('');
              setTargetTypeFilter('');
              setPage(1);
            }}
            className="font-mono text-label-sm text-tertiary hover:underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && (
        <div className="py-12 flex justify-center">
          <Spinner />
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <EmptyState
          icon="history"
          title="No audit entries found"
          hint="Administrative events, user bans, role adjustments, and security logs will appear here."
        />
      )}

      {/* Main Grid: List + Detail Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className={selectedLog ? 'xl:col-span-8' : 'xl:col-span-12'}>
          <div className="space-y-2.5">
            {!loading &&
              logs.map((l) => {
                const isSelected = selectedLog && (selectedLog._id || selectedLog.id) === (l._id || l.id);
                return (
                  <button
                    key={l._id || l.id}
                    onClick={() => setSelectedLog(l)}
                    className={`w-full text-left bg-surface-container-lowest border-[1.5px] rounded-xl p-3.5 shadow-pixel-sm transition-all flex items-start gap-3.5 ${
                      isSelected ? 'border-primary shadow-pixel-md bg-secondary-container/10' : 'border-tertiary/20 hover:border-tertiary/60'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 mt-1.5 shrink-0 rounded-sm ${tone(l.action) === 'error' ? 'bg-error' : tone(l.action) === 'amber' ? 'bg-amber-600' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={tone(l.action)} className="font-mono text-[10px] px-2 py-0.5">
                          {l.action}
                        </Badge>
                        <span className="font-mono text-label-sm font-bold text-on-surface">
                          {l.adminId ? `@${l.adminId.username}` : 'System / External'}
                        </span>
                        <span className="font-mono text-[11px] text-tertiary">
                          → {l.targetType} {l.targetId ? String(l.targetId).slice(-6) : ''}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant ml-auto">
                          {dateShort(l.createdAt)} {timeShort(l.createdAt)} ({timeAgo(l.createdAt)})
                        </span>
                      </div>

                      {l.metadata && Object.keys(l.metadata).length > 0 && (
                        <p className="font-mono text-[11px] text-on-surface-variant mt-1.5 truncate">
                          {Object.entries(l.metadata)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between font-mono text-label-sm pt-4">
              <span className="text-on-surface-variant">{total} total audit entries</span>
              <div className="flex gap-1.5 items-center">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-surface-container-lowest border border-tertiary/30 rounded font-bold hover:bg-surface-container disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-3 py-1 bg-primary text-on-primary rounded font-bold">
                  {page} / {pages}
                </span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-surface-container-lowest border border-tertiary/30 rounded font-bold hover:bg-surface-container disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Log Inspector Panel */}
        {selectedLog && (
          <div className="xl:col-span-4">
            <div className="bg-surface-container-low rounded-xl border border-tertiary/30 shadow-pixel-md p-4 space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-tertiary/20">
                <span className="font-mono text-label-sm font-bold text-tertiary uppercase">Audit Event Inspector</span>
                <button onClick={() => setSelectedLog(null)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="space-y-1">
                <Badge tone={tone(selectedLog.action)} className="font-mono text-xs">
                  {selectedLog.action}
                </Badge>
                <h3 className="font-display text-title-md font-bold text-on-surface pt-1">
                  Event Details
                </h3>
              </div>

              <dl className="font-mono text-label-sm space-y-1.5">
                <Row k="Event ID" v={selectedLog._id || selectedLog.id} />
                <Row k="Actor" v={selectedLog.adminId ? `@${selectedLog.adminId.username}` : 'System / Anonymous'} />
                <Row k="Target Type" v={selectedLog.targetType} />
                <Row k="Target ID" v={selectedLog.targetId || 'N/A (Platform)'} />
                <Row k="Timestamp" v={`${dateShort(selectedLog.createdAt)} ${timeShort(selectedLog.createdAt)}`} />
              </dl>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary font-bold block mb-1.5">
                    Event Metadata
                  </span>
                  <div className="p-3 bg-surface rounded border border-tertiary/20 font-mono text-[11px] text-on-surface space-y-1 overflow-x-auto">
                    {Object.entries(selectedLog.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-on-surface-variant">{k}:</span>
                        <span className="font-bold truncate max-w-[200px]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-surface rounded border border-tertiary/15">
      <dt className="text-on-surface-variant text-label-xs">{k}</dt>
      <dd className="font-bold text-on-surface truncate max-w-[60%] text-label-xs">{String(v ?? '—')}</dd>
    </div>
  );
}
