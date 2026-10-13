/**
 * File: layout.jsx (Direct Messages Layout)
 *
 * Responsibility:
 * Layout providing SEO metadata and canonical tag for direct message corridors.
 *
 * Layer:
 * Frontend / Messaging Pages
 */

export const metadata = {
  title: 'Direct Messages',
  description: 'Private direct messaging on PixelTalk.',
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

export default function ChatLayout({ children }) {
  return children;
}
