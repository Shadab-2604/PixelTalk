/**
 * File: page.jsx (Landing / Auth Gateway)
 *
 * Responsibility:
 * Server component providing SEO metadata, canonical tag, OpenGraph tags,
 * and rendering the client-side LandingView.
 *
 * Layer:
 * Frontend / Public Page
 *
 * Connected to:
 * - frontend/features/auth/LandingView.jsx
 */

import { LandingView } from '@/features/auth/LandingView';

export const metadata = {
  title: 'PixelTalk – Real-Time Messaging & Group Chat',
  description:
    'Discover PixelTalk, a modern messaging app for real-time conversations and group chats. Low-noise lounges, instant text, and tactile retro visuals.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PixelTalk – Real-Time Messaging & Group Chat',
    description:
      'Discover PixelTalk, a modern messaging app for real-time conversations and group chats. Low-noise lounges, instant text, and tactile retro visuals.',
    url: '/',
  },
};

export default function LoginPage() {
  return <LandingView />;
}
