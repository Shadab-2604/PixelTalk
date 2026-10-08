/**
 * File: page.jsx (My Profile / Default Profile Route)
 *
 * Layer:
 * Frontend / Authenticated Pages
 *
 * Connected to:
 * - frontend/features/profile/ProfileView.jsx
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProfileView } from '@/features/profile/ProfileView';
import { Spinner } from '@/components/ui';

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container flex items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id') || searchParams.get('userId');
  const targetUsername = searchParams.get('username');

  return <ProfileView username={targetUsername} targetId={targetId} />;
}
