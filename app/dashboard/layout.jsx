/**
 * File: layout.jsx (Dashboard Layout)
 *
 * Responsibility:
 * Layout providing SEO metadata and canonical tag for authenticated dashboard hub.
 *
 * Layer:
 * Frontend / Authenticated Hub
 */

export const metadata = {
  title: 'Lounge Hub & Dashboard | PixelTalk',
  description:
    'Your PixelTalk dashboard with quick access to recent chats, active rooms, and direct messages.',
  alternates: {
    canonical: '/dashboard',
  },
  openGraph: {
    title: 'Lounge Hub & Dashboard — PixelTalk',
    description:
      'Your PixelTalk dashboard with quick access to recent chats, active rooms, and direct messages.',
    url: '/dashboard',
  },
};

export default function DashboardLayout({ children }) {
  return children;
}
