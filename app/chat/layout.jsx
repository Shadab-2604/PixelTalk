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
  title: 'Direct Messages | PixelTalk',
  description:
    'Private, low-noise direct messaging in real time with end-to-end conversation controls.',
  alternates: {
    canonical: '/chat',
  },
  openGraph: {
    title: 'Direct Messages — PixelTalk',
    description:
      'Private, low-noise direct messaging in real time with end-to-end conversation controls.',
    url: '/chat',
  },
};

export default function ChatLayout({ children }) {
  return children;
}
