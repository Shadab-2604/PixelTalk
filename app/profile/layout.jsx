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
  title: 'Player Profile',
  description: 'PixelTalk user profile.',
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

export default function ProfileLayout({ children }) {
  return children;
}
