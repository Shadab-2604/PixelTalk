/**
 * File: page.jsx (Admin Audit Reports)
 *
 * Responsibility:
 * Displays the immutable historical audit log trail:
 * Captures all moderation events (user bans, suspensions, room deletions,
 * role changes, password resets) with timestamps, admin ID, and metadata.
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
import { Badge, EmptyState, Spinner } from '@/components/ui';
export default function AdminReportsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.auditLogs({ page, limit: 40 });
      setLogs(data.logs || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const tone = (action) => {
    if (action.includes('BANNED')) return 'error';
    if (action.includes('SUSPENDED')) return 'amber';
    if (action.includes('DELETED')) return 'error';
    return 'green';
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Reports & Audit</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Audit Trail</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Every destructive admin action is logged here.</p>
      </div>

      {loading && <Spinner />}
      {!loading && logs.length === 0 && !error && <EmptyState icon="history" title="No audit entries yet" hint="Actions like bans, role changes, and deletions will appear here." />}

      <div className="space-y-2">
        {!loading &&
          logs.map((l) => (
            <div key={l._id || l.id} className="bg-surface-container-lowest border-[1.5px] border-tertiary/25 rounded-xl p-3.5 shadow-pixel-sm flex items-start gap-3">
              <span className={`w-2 h-2 mt-1.5 shrink-0 ${l.action.includes('BANNED') || l.action.includes('DELETED') ? 'bg-error' : 'bg-primary-container'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={tone(l.action)}>{l.action}</Badge>
                  <span className="font-mono text-label-sm text-on-surface-variant">
                    by @{l.adminId?.username || 'system'} on {l.targetType} {String(l.targetId).slice(-6)}
                  </span>
                  <span className="font-mono text-[10px] text-outline ml-auto">
                    {dateShort(l.createdAt)} {timeShort(l.createdAt)} • {timeAgo(l.createdAt)}
                  </span>
                </div>
                {l.metadata && Object.keys(l.metadata).length > 0 && (
                  <p className="font-mono text-[10px] text-on-surface-variant mt-1 truncate">{JSON.stringify(l.metadata)}</p>
                )}
              </div>
            </div>
          ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between font-mono text-label-sm pt-4">
          <span className="text-on-surface-variant">{total} entries</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded disabled:opacity-40">Prev</button>
            <span className="px-2.5 py-1 bg-primary text-on-primary rounded font-bold">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
