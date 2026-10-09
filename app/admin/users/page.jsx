/**
 * File: page.jsx (Admin User Moderation)
 *
 * Responsibility:
 * Comprehensive user management and moderation console:
 * - Paginated list of registered users with search, role, and status filters
 * - Moderation actions: Suspend, unsuspend, ban, unban, promote/demote role
 * - Hard deletion of user accounts with confirmation modal and consequence warnings
 * - Strict privacy protection: Admins manage user metadata with zero message content access
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
import { dateShort, timeAgo } from '@/lib/format';
import { Avatar, Badge, ErrorText, EmptyState, Input, Select, Spinner, Modal, PrimaryButton, GhostButton } from '@/components/ui';
import { sfx } from '@/lib/sound';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.users({ q, status, role, page, limit: 20 });
      setUsers(data.users || []);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [q, status, role, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (fn, ...args) => {
    setError('');
    try {
      await fn(...args);
      sfx.success();
      await load();
      if (selected) {
        const d = await adminService.user(selected._id || selected.id);
        setSelected(d.user);
      }
    } catch (err) {
      setError(err.message || 'Action failed');
      sfx.error();
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    setError('');
    try {
      await adminService.deleteUser(deleteCandidate._id || deleteCandidate.id);
      sfx.success();
      setDeleteCandidate(null);
      if (selected && (selected._id || selected.id) === (deleteCandidate._id || deleteCandidate.id)) {
        setSelected(null);
      }
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete account');
      sfx.error();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">User Management</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">Player Governance</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Search, moderate, inspect metadata, and manage account statuses.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-low p-3 rounded-xl border border-tertiary/20 shadow-pixel-sm flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary/60 text-[18px]">search</span>
          <Input
            className="pl-9 py-1.5 font-mono text-sm"
            placeholder="Search username, display name, email…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-lowest border border-tertiary/30 rounded text-label-sm shadow-pixel-sm">
          <span className="text-on-surface-variant font-mono">Role:</span>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            <option value="user">Player</option>
            <option value="admin">Platform Admin</option>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-lowest border border-tertiary/30 rounded text-label-sm shadow-pixel-sm">
          <span className="text-on-surface-variant font-mono">Status:</span>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </Select>
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table */}
        <div className="xl:col-span-8">
          <div className="bg-surface-container-lowest rounded-xl border border-tertiary/30 shadow-pixel-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-tertiary/30 font-mono text-label-sm text-tertiary">
                    <th className="py-3 px-4 font-bold">Player</th>
                    <th className="py-3 px-3 font-bold">Role</th>
                    <th className="py-3 px-3 font-bold">Status</th>
                    <th className="py-3 px-3 font-bold">Joined</th>
                    <th className="py-3 px-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/15 font-body-sm text-body-sm">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Spinner />
                      </td>
                    </tr>
                  )}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8">
                        <EmptyState icon="person_off" title="No players found" />
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    users.map((u) => (
                      <tr
                        key={u._id || u.id}
                        className={`hover:bg-surface-container-low/60 transition-colors ${
                          selected && (selected._id || selected.id) === (u._id || u.id) ? 'bg-secondary-container/20' : ''
                        } ${u.status !== 'active' ? 'bg-error-container/10' : ''}`}
                      >
                        <td className="py-3 px-4 cursor-pointer" onClick={() => setSelected(u)}>
                          <div className="flex items-center gap-3">
                            <Avatar src={avatarSrc(u.avatarId)} size={32} online={u.presence === 'online'} />
                            <div>
                              <span className="font-display text-sm font-bold text-on-surface block">{u.displayName}</span>
                              <span className="font-mono text-label-sm text-on-surface-variant">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {u.role === 'admin' ? <Badge tone="deep">Admin</Badge> : <Badge tone="brown">Player</Badge>}
                        </td>
                        <td className="py-3 px-3">
                          <StatusCell status={u.status} presence={u.presence} lastSeen={u.lastSeen} />
                        </td>
                        <td className="py-3 px-3 font-mono text-label-sm text-on-surface-variant">{dateShort(u.createdAt)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {u.status !== 'suspended' && u.status !== 'banned' ? (
                              <>
                                <button
                                  onClick={() => act(adminService.setUserStatus, u._id || u.id, 'suspended')}
                                  className="px-2 py-1 bg-surface-container border border-tertiary/30 rounded font-mono text-label-sm text-tertiary hover:bg-secondary-container press"
                                  title="Suspend player"
                                >
                                  Suspend
                                </button>
                                <button
                                  onClick={() => act(adminService.setUserStatus, u._id || u.id, 'banned')}
                                  className="px-2 py-1 bg-error-container border border-error/30 rounded font-mono text-label-sm text-on-error-container hover:bg-error hover:text-on-error press"
                                  title="Ban player"
                                >
                                  Ban
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => act(adminService.setUserStatus, u._id || u.id, 'active')}
                                className="px-2 py-1 bg-secondary-container border border-tertiary/30 rounded font-mono text-label-sm text-on-secondary-container font-bold hover:brightness-105 press"
                                title="Reinstate player"
                              >
                                Reinstate
                              </button>
                            )}
                            <button
                              onClick={() => setSelected(u)}
                              className="px-1.5 py-1 text-on-surface-variant hover:text-on-surface"
                              title="Inspect player metadata"
                            >
                              <span className="material-symbols-outlined text-sm">more_vert</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-surface-container border-t border-tertiary/20 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-label-sm">
              <span className="text-on-surface-variant">{total} total registered players</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded text-tertiary hover:bg-surface-container disabled:opacity-40 press"
                >
                  Prev
                </button>
                <span className="px-2.5 py-1 bg-primary text-on-primary border border-tertiary rounded font-bold">
                  {page} / {pages}
                </span>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 bg-surface-container-lowest border border-tertiary/30 rounded text-tertiary hover:bg-surface-container disabled:opacity-40 press"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detail inspector */}
        <div className="xl:col-span-4">
          {selected ? (
            <UserInspector
              user={selected}
              onClose={() => setSelected(null)}
              onStatus={(s) => act(adminService.setUserStatus, selected._id || selected.id, s)}
              onRole={(r) => act(adminService.setUserRole, selected._id || selected.id, r)}
              onRequestDelete={(u) => setDeleteCandidate(u)}
            />
          ) : (
            <div className="bg-surface-container-low rounded-xl border border-tertiary/30 shadow-pixel-md p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
              <span className="material-symbols-outlined text-tertiary/40 text-4xl mb-2">person_search</span>
              <p className="font-mono text-label-sm text-on-surface-variant">Select a player row to inspect account details</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Permanent Account Deletion */}
      {deleteCandidate && (
        <Modal
          open={!!deleteCandidate}
          onClose={() => setDeleteCandidate(null)}
          title="Delete Account Permanently"
          icon="warning"
        >
          <div className="space-y-4">
            <p className="font-body-sm text-on-surface">
              Are you sure you want to permanently delete account{' '}
              <strong className="font-bold text-error">@{deleteCandidate.username}</strong> ({deleteCandidate.displayName})?
            </p>
            <div className="p-3 bg-error-container/20 border border-error/30 rounded-lg font-mono text-label-xs space-y-1 text-on-surface">
              <p className="font-bold text-error">Important Consequences:</p>
              <p>• Account credentials and profile metadata will be permanently deleted.</p>
              <p>• The player will be removed from all community lounges and conversations.</p>
              <p>• Sent message records remain intact in chats without cascade data loss for other players.</p>
              <p>• This action is irreversible and recorded in the audit log.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <GhostButton onClick={() => setDeleteCandidate(null)} disabled={deleting}>
                Cancel
              </GhostButton>
              <button
                onClick={confirmDeleteUser}
                disabled={deleting}
                className="px-4 py-2 bg-error text-on-error rounded-lg font-mono text-label-md font-bold shadow-pixel-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting Account…' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusCell({ status, presence, lastSeen }) {
  if (status === 'banned') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-label-sm text-error font-bold">
        <span className="w-2 h-2 bg-error" /> Banned
      </span>
    );
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-label-sm text-amberpix font-bold">
        <span className="w-2 h-2 bg-amberpix" /> Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-label-sm text-primary font-bold">
      <span className={`w-2 h-2 ${presence === 'online' ? 'bg-primary-container' : 'bg-brown/40'}`} />
      {presence === 'online' ? 'Active' : `Offline (${timeAgo(lastSeen)})`}
    </span>
  );
}

function UserInspector({ user, onClose, onStatus, onRole, onRequestDelete }) {
  const id = user._id || user.id;

  return (
    <div className="bg-surface-container-low rounded-xl border border-tertiary/30 shadow-pixel-md p-4 space-y-4 sticky top-20">
      <div className="flex items-center justify-between pb-3 border-b border-tertiary/20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-error" />
          <span className="w-2.5 h-2.5 bg-tertiary" />
          <span className="w-2.5 h-2.5 bg-primary" />
          <span className="font-mono text-label-sm font-bold text-tertiary ml-2 uppercase">Player Inspector</span>
        </div>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="flex items-center gap-3 bg-surface-container p-3 rounded-lg border border-tertiary/20">
        <Avatar src={avatarSrc(user.avatarId)} size={48} online={user.presence === 'online'} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-headline-sm font-bold text-on-surface truncate">{user.displayName}</h3>
          <span className="font-mono text-label-sm text-tertiary font-bold block truncate">@{user.username}</span>
          <span className="font-mono text-[10px] text-on-surface-variant block truncate">{user.email}</span>
        </div>
      </div>

      <dl className="font-mono text-label-sm space-y-1.5 px-1">
        <Row k="User ID" v={id} />
        <Row k="Status" v={user.status} />
        <Row k="Platform Role" v={user.role === 'admin' ? 'PLATFORM_ADMIN' : 'USER'} />
        <Row k="Presence" v={user.presence} />
        <Row k="Last seen" v={timeAgo(user.lastSeen)} />
        <Row k="Joined" v={dateShort(user.createdAt)} />
      </dl>

      <div className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary font-bold">Status Enforcement</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onStatus('active')}
            className="px-2 py-2 bg-secondary-container border border-tertiary rounded font-mono text-label-sm font-bold text-on-secondary-container shadow-pixel-sm-solid press"
          >
            Activate
          </button>
          <button
            onClick={() => onStatus('suspended')}
            className="px-2 py-2 bg-surface-container border border-tertiary/40 rounded font-mono text-label-sm text-tertiary shadow-pixel-sm press"
          >
            Suspend
          </button>
          <button
            onClick={() => onStatus('banned')}
            className="px-2 py-2 bg-error-container border border-error/30 rounded font-mono text-label-sm text-on-error-container press"
          >
            Ban
          </button>
        </div>

        <span className="font-mono text-[10px] uppercase tracking-wider text-tertiary font-bold block pt-2">Platform Role</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onRole('user')}
            className={`px-2 py-2 border rounded font-mono text-label-sm press ${
              user.role === 'user' ? 'bg-secondary-container text-on-secondary-container font-bold border-tertiary' : 'bg-surface-container border-tertiary/40 text-tertiary'
            }`}
          >
            Player
          </button>
          <button
            onClick={() => onRole('admin')}
            className={`px-2 py-2 border rounded font-mono text-label-sm press ${
              user.role === 'admin' ? 'bg-primary-container text-on-primary font-bold border-tertiary shadow-pixel-sm-solid' : 'bg-surface-container border-tertiary/40 text-tertiary'
            }`}
          >
            Admin
          </button>
        </div>

        <div className="pt-3 border-t border-error/20">
          <button
            type="button"
            onClick={() => onRequestDelete(user)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-error-container text-on-error-container border border-error/40 rounded font-mono text-label-sm font-bold shadow-pixel-sm press hover:bg-error-container/80"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Delete Account Permanently
          </button>
        </div>
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
