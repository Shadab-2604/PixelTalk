/**
 * File: page.jsx (Admin Groups Management)
 *
 * Responsibility:
 * Administrative console for searching, inspecting, and moderating community lounges:
 * - Paginated list of group conversations with member counts and creation timestamps
 * - Soft-deletion and restoration of policy-violating or abusive rooms
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
import { avatarSrc } from '@/lib/avatars';
import { dateShort } from '@/lib/format';
import { Avatar, Badge, ErrorText, EmptyState, Input, Spinner } from '@/components/ui';
import { sfx } from '@/lib/sound';

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.groups({ q, page, limit: 20 });
      setGroups(data.groups || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const del = async (g) => {
    if (!window.confirm(`Delete group “${g.name}”? Members will lose access.`)) return;
    setError('');
    try {
      await adminService.deleteGroup(g._id || g.id);
      sfx.success();
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
      sfx.error();
    }
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Group Management</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Room Governance</h1>
      </div>

      <div className="bg-surface-container-low p-3 rounded-xl border border-tertiary/20 shadow-pixel-sm mb-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary/60 text-[18px]">search</span>
          <Input className="pl-9 py-1.5" placeholder="Search groups by name…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-3">
          {loading && <Spinner />}
          {!loading && groups.length === 0 && <EmptyState icon="forum" title="No groups found" />}
          {!loading &&
            groups.map((g) => (
              <button
                key={g._id || g.id}
                onClick={() => setSelected(g)}
                className={`w-full text-left bg-surface-container-lowest border-[1.5px] rounded-xl p-4 shadow-pixel-sm transition-all flex items-center gap-3.5 ${
                  selected && (selected._id || selected.id) === (g._id || g.id) ? 'border-tertiary shadow-pixel-md' : 'border-tertiary/30 hover:border-tertiary'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc(g.avatarId || 'avatar-06')} alt="" className="w-11 h-11 rounded-lg border-[1.5px] border-tertiary pixelated" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-headline-sm font-bold text-on-surface truncate">{g.name}</h3>
                    {g.privacy === 'private' && <Badge tone="amber">🔒 Passcode</Badge>}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{g.description || 'No description'}</p>
                  <p className="font-mono text-label-sm text-tertiary mt-0.5">
                    Owner: @{g.createdBy?.username || 'unknown'} • {g.members?.length || 0} members • created {dateShort(g.createdAt)}
                  </p>
                </div>
                <span className="material-symbols-outlined text-tertiary/40">chevron_right</span>
              </button>
            ))}

          {pages > 1 && (
            <div className="flex items-center justify-between font-mono text-label-sm pt-2">
              <span className="text-on-surface-variant">{total} groups</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded disabled:opacity-40">Prev</button>
                <span className="px-2.5 py-1 bg-primary text-on-primary rounded font-bold">{page} / {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-4">
          {selected ? (
            <div className="bg-surface-container-low rounded-xl border border-tertiary/30 shadow-pixel-md p-4 space-y-4 sticky top-20">
              <div className="flex items-center justify-between pb-3 border-b border-tertiary/20">
                <span className="font-mono text-label-sm font-bold text-tertiary uppercase">Group Inspector</span>
                <button onClick={() => setSelected(null)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div>
                <h3 className="font-display text-headline-md font-bold text-on-surface">{selected.name}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{selected.description || 'No description'}</p>
              </div>
              <dl className="font-mono text-label-sm space-y-1.5">
                <Row k="Privacy" v={selected.privacy} />
                <Row k="Owner" v={`@${selected.createdBy?.username || '?'}`} />
                <Row k="Members" v={selected.members?.length || 0} />
                <Row k="Created" v={dateShort(selected.createdAt)} />
              </dl>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary font-bold block mb-1.5">Members</span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(selected.members || []).map((m) => (
                    <div key={m._id || m} className="flex items-center gap-2 p-1.5 bg-surface rounded border border-tertiary/15">
                      <Avatar src={avatarSrc(m.avatarId)} size={20} ring={false} />
                      <span className="font-body-sm text-body-sm truncate">{m.displayName}</span>
                      <span className="font-mono text-[10px] text-tertiary ml-auto">@{m.username}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => del(selected)}
                className="w-full px-3 py-2 bg-error-container border border-error/40 rounded-lg font-mono text-label-md font-bold text-on-error-container hover:bg-error hover:text-on-error press"
              >
                DELETE GROUP
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl border border-tertiary/30 shadow-pixel-md p-4 flex items-center justify-center min-h-[300px]">
              <p className="font-mono text-label-sm text-on-surface-variant">Select a group to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-surface rounded border border-tertiary/15">
      <dt className="text-on-surface-variant">{k}</dt>
      <dd className="font-bold text-on-surface truncate max-w-[60%]">{String(v ?? '—')}</dd>
    </div>
  );
}
