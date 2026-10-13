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
  title: 'Dashboard',
  description: 'Your PixelTalk dashboard.',
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

export default function DashboardLayout({ children }) {
  return children;
}
