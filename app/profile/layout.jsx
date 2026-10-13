/**
 * File: layout.jsx (Player Profile Layout)
 *
 * Responsibility:
 * Layout providing SEO metadata and canonical tag for player profiles.
 *
 * Layer:
 * Frontend / Profile
 */

export const metadata = {
  title: 'Player Profile | PixelTalk',
  description:
    'View member bio, status, badge collection, and activity across PixelTalk.',
  alternates: {
    canonical: '/profile',
  },
  openGraph: {
    title: 'Player Profile — PixelTalk',
    description:
      'View member bio, status, badge collection, and activity across PixelTalk.',
    url: '/profile',
  },
};

export default function ProfileLayout({ children }) {
  return children;
}
