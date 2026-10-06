/*
 * ============================================================
 * PIXELTALK — PLATFORM ADMIN MESSAGE PRIVACY (page.jsx)
 * ============================================================
 *
 * WHAT:
 * Privacy protection landing view for the message moderation corridor.
 *
 * WHY:
 * PixelTalk enforces strict privacy: Platform Admins cannot read private user
 * conversations, 1-to-1 chats, private group messages, or media.
 * Backend endpoints strictly return 403 Forbidden for generic message listing.
 *
 * SECURITY:
 * Backend is the final authority. Platform Admins cannot read chat content.
 * ============================================================
 */

'use client';

import Link from 'next/link';
import { Badge, PrimaryButton } from '@/components/ui';

export default function AdminMessagesPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-surface-container-lowest border-2 border-tertiary/30 rounded-2xl p-8 shadow-pixel-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary-container/60 border-2 border-primary flex items-center justify-center shadow-pixel-sm-solid">
          <span className="material-symbols-outlined text-primary text-3xl">lock</span>
        </div>

        <div>
          <Badge tone="deep" className="mb-2">
            PRIVACY PROTECTION ACTIVE
          </Badge>
          <h1 className="font-display text-headline-md font-bold text-on-surface">
            Private Messages are Protected
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto mt-2">
            In accordance with PixelTalk&apos;s privacy architecture, Platform Administrators
            cannot browse, read, or export private 1-to-1 chat history or private group conversation content.
          </p>
        </div>

        <div className="p-4 bg-surface-container rounded-xl border border-tertiary/20 text-left font-mono text-label-xs space-y-1.5 text-tertiary">
          <p className="font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
            <span>Security Guarantees:</span>
          </p>
          <p>• Backend APIs reject bulk message queries with 403 Forbidden.</p>
          <p>• Group messages are visible only to permitted group members.</p>
          <p>• Audit logs record administrative actions without capturing message text.</p>
        </div>

        <div className="pt-2">
          <Link href="/admin">
            <PrimaryButton className="px-6 py-2.5">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Admin Dashboard</span>
            </PrimaryButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
