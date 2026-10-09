/**
 * File: layout.jsx
 *
 * Responsibility:
 * Root Next.js layout providing global HTML skeleton, typography preloading,
 * SEO/OpenGraph metadata configuration, top-level Providers wrapping, and the
 * root `#modal-root` container for viewport-level dialog portals.
 *
 * Layer:
 * Frontend / Root Layout
 *
 * Connected to:
 * - frontend/app/globals.css
 * - frontend/app/providers.jsx
 * - frontend/components/ui.jsx (targets #modal-root)
 */

import './globals.css';
import { Providers } from './providers';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://pixeltalk.shad.dev'),
  title: {
    default: 'PixelTalk — A little pixel. A lot of talk.',
    template: '%s | PixelTalk',
  },
  description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, tactile retro-micro visuals.',
  applicationName: 'PixelTalk',
  keywords: ['chat', 'messaging', 'pixel art', 'retro chat', 'realtime messenger', 'rooms'],
  authors: [{ name: 'PixelTalk Team' }],
  icons: {
    icon: '/logo/icon-mark.svg',
    shortcut: '/logo/icon-mark.svg',
  },
  openGraph: {
    title: 'PixelTalk — A little pixel. A lot of talk.',
    description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, tactile retro-micro visuals.',
    url: '/',
    siteName: 'PixelTalk',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PixelTalk — A little pixel. A lot of talk.',
    description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, tactile retro-micro visuals.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Apply persisted theme before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pixeltalk:theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-surface-container">
        <Providers>{children}</Providers>
        <div id="modal-root" />
      </body>
    </html>
  );
}
