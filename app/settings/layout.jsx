/**
 * File: layout.jsx (Settings Layout)
 *
 * Responsibility:
 * Layout providing SEO metadata and canonical tag for account & app settings.
 *
 * Layer:
 * Frontend / Settings
 */

export const metadata = {
  title: 'Settings',
  description: 'PixelTalk account and appearance settings.',
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

export default function SettingsLayout({ children }) {
  return children;
}
