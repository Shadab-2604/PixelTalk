/**
 * File: layout.jsx (Community Rooms Layout)
 *
 * Responsibility:
 * Layout providing SEO metadata and canonical tag for community rooms and lounges.
 *
 * Layer:
 * Frontend / Rooms
 */

export const metadata = {
  title: 'Community Rooms & Lounges',
  description: 'Community rooms and lounges on PixelTalk.',
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

export default function RoomsLayout({ children }) {
  return children;
}
