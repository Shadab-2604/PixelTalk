/**
 * File: [username]/page.jsx (Canonical User Profile Route)
 *
 * Layer:
 * Frontend / Authenticated Pages
 *
 * Connected to:
 * - frontend/features/profile/ProfileView.jsx
 */

'use client';

import { useParams } from 'next/navigation';
import { ProfileView } from '@/features/profile/ProfileView';

export default function CanonicalUserProfilePage() {
  const params = useParams();
  const rawUsername = params?.username ? decodeURIComponent(params.username) : '';

  return <ProfileView username={rawUsername} />;
}
