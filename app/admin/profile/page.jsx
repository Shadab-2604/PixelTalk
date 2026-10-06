/**
 * File: page.jsx (Admin Account Profile)
 *
 * Responsibility:
 * Displays authenticated administrator credentials, privileged authority badge,
 * security credentials status, and recent personal administrative actions.
 *
 * Layer:
 * Frontend / Admin Pages
 *
 * Connected to:
 * - frontend/app/admin/layout.jsx
 * - frontend/hooks/useAuth.jsx
 * - frontend/services/adminService.js
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PixelAvatar } from '@/components/Avatar';
import { Badge, PrimaryButton, GhostButton, Spinner } from '@/components/ui';
import { adminService } from '@/services/adminService';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    adminService
      .auditLogs({ limit: 5 })
      .then((res) => {
        setAuditLogs(res.logs || res.auditLogs || []);
      })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'System Pioneer';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 font-mono text-label-sm text-tertiary mb-1">
          <span>Admin</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Profile</span>
        </div>
        <h1 className="font-display text-headline-lg text-on-surface font-bold tracking-tight">
          Administrator Identity
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Verified server-level administrative profile and privileges.
        </p>
      </div>

      {/* Main Admin Card */}
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-2xl p-6 sm:p-8 shadow-pixel-lg relative overflow-hidden">
        {/* Decorative corner pixel accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/10 border-b-2 border-l-2 border-tertiary/20 flex items-center justify-center pointer-events-none">
          <span className="material-symbols-outlined text-primary-container/30 text-5xl">security</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          {/* Avatar with Admin Glow */}
          <div className="relative">
            <div className="p-1.5 rounded-2xl bg-surface-container border-2 border-primary shadow-pixel-terracotta">
              <PixelAvatar
                avatarId={user.avatarId || 'avatar-01'}
                size={110}
                presence={user.presence || 'online'}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-surface-container font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-tertiary shadow-pixel-sm uppercase">
              Admin
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="font-display text-headline-md font-bold text-on-surface">
                {user.displayName || user.username}
              </h2>
              <Badge tone="deep">
                <span className="material-symbols-outlined text-xs mr-1">verified_user</span>
                SYSTEM ADMIN
              </Badge>
              <Badge tone="green">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block mr-1.5" />
                {user.status?.toUpperCase() || 'ACTIVE'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 font-mono text-label-md">
              <span className="text-primary font-bold">@{user.username}</span>
              <span className="text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">mail</span>
                {user.email}
              </span>
            </div>

            {user.bio && (
              <p className="font-body-sm text-on-surface-variant max-w-xl text-body-sm italic bg-surface-container/60 p-3 rounded-lg border border-tertiary/10">
                &ldquo;{user.bio}&rdquo;
              </p>
            )}

            {user.customStatus && (
              <div className="inline-flex items-center gap-2 font-mono text-label-sm bg-secondary-container text-on-secondary-container px-3 py-1 rounded-md border border-tertiary/20">
                <span className="material-symbols-outlined text-xs">chat_bubble_outline</span>
                <span>{user.customStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-tertiary/15 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-tertiary">calendar_month</span>
            <span>Commissioned on {joinDate}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/settings">
              <PrimaryButton className="py-2 px-4 text-label-sm">
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>Admin Settings</span>
              </PrimaryButton>
            </Link>
            <Link href="/dashboard">
              <GhostButton className="py-2 px-4 text-label-sm">
                <span className="material-symbols-outlined text-sm">forum</span>
                <span>Enter Chat</span>
              </GhostButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Permissions & System Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">verified</span>
            <h3 className="font-display text-title-md font-bold text-on-surface">Administrative Privileges</h3>
          </div>
          <ul className="space-y-2 font-mono text-label-sm text-on-surface-variant">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
              <span>Full User Governance & Moderation</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
              <span>Room Creation, Passcode & Lifecycle Override</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
              <span>Content Moderation & Message Purging</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
              <span>Immutable System Audit Trail Access</span>
            </li>
          </ul>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-tertiary text-xl">history</span>
            <h3 className="font-display text-title-md font-bold text-on-surface">Recent System Actions</h3>
          </div>
          {loadingLogs ? (
            <div className="py-4 flex justify-center">
              <Spinner />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="font-mono text-label-sm text-on-surface-variant py-3 text-center">
              No recent audit records found.
            </p>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 3).map((log, i) => (
                <div key={log._id || i} className="p-2 bg-surface-container rounded border border-tertiary/10 font-mono text-label-xs flex items-center justify-between">
                  <span className="font-bold text-primary truncate max-w-[200px]">{log.action}</span>
                  <span className="text-on-surface-variant text-[10px]">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div className="pt-1 text-right">
                <Link href="/admin/system" className="font-mono text-label-xs text-primary hover:underline">
                  View full audit log →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
