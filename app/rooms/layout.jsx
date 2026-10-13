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
  title: 'Community Rooms & Retro Lounges | PixelTalk',
  description:
    'Browse open rooms, themed lounges, and retro-aesthetic hangouts across the PixelTalk network.',
  alternates: {
    canonical: '/rooms',
  },
  openGraph: {
    title: 'Community Rooms & Retro Lounges — PixelTalk',
    description:
      'Browse open rooms, themed lounges, and retro-aesthetic hangouts across the PixelTalk network.',
    url: '/rooms',
  },
};

export default function RoomsLayout({ children }) {
  return children;
}
