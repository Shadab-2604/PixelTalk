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
  title: 'PixelTalk — Real-Time Pixel-Infused Messaging',
  description:
    'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, and tactile retro-micro visuals for focused communities.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PixelTalk — Real-Time Pixel-Infused Messaging',
    description:
      'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, and tactile retro-micro visuals for focused communities.',
    url: '/',
  },
};

export default function LoginPage() {
  return <LandingView />;
}
