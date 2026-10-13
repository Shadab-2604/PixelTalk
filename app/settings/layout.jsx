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
  title: 'Account & App Settings | PixelTalk',
  description:
    'Manage your appearance, theme preferences, notification sounds, and security keys on PixelTalk.',
  alternates: {
    canonical: '/settings',
  },
  openGraph: {
    title: 'Account & App Settings — PixelTalk',
    description:
      'Manage your appearance, theme preferences, notification sounds, and security keys on PixelTalk.',
    url: '/settings',
  },
};

export default function SettingsLayout({ children }) {
  return children;
}
