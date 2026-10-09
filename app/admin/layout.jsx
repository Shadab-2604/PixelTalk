/**
 * File: layout.jsx (Admin Console Layout)
 *
 * Responsibility:
 * Protected administrative console root layout:
 * - Emits strict `noindex, nofollow, nocache` search engine robots metadata
 * - Wraps child pages inside the authenticated AdminConsoleShell
 *
 * Layer:
 * Frontend / Admin Pages
 */

import { AdminConsoleShell } from './AdminConsoleShell';

export const metadata = {
  title: 'Admin Console | PixelTalk',
  description: 'PixelTalk Server Management & Restricted Administrative Console',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function AdminLayout({ children }) {
  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
