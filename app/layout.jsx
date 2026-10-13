/**
 * File: layout.jsx
 *
 * Responsibility:
 * Root Next.js layout providing global HTML skeleton, typography preloading,
 * SEO/OpenGraph metadata configuration, JSON-LD structured data (WebApplication & LocalBusiness),
 * top-level Providers wrapping, and the root `#modal-root` container.
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

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://pixel-talk-qofh.vercel.app').replace(/\/+$/, '');

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'PixelTalk – Real-Time Messaging & Group Chat',
    template: '%s | PixelTalk',
  },
  description:
    'Discover PixelTalk, a modern messaging app for real-time conversations and group chats. Low-noise lounges, instant text, and tactile retro visuals.',
  applicationName: 'PixelTalk',
  keywords: [
    'PixelTalk',
    'Pixel Talk',
    'PixelTalk app',
    'Pixel Talk messaging app',
    'PixelTalk chat app',
    'real-time messaging',
    'group chat',
    'retro chat',
    'pixel art messenger',
  ],
  authors: [{ name: 'PixelTalk Team', url: APP_URL }],
  creator: 'PixelTalk',
  publisher: 'PixelTalk',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/logo/icon-mark.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo/icon-mark.svg',
  },
  openGraph: {
    title: 'PixelTalk – Real-Time Messaging & Group Chat',
    description:
      'Discover PixelTalk, a modern messaging app for real-time conversations and group chats. Low-noise lounges, instant text, and tactile retro visuals.',
    url: APP_URL,
    siteName: 'PixelTalk',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'PixelTalk – Real-Time Messaging & Group Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PixelTalk – Real-Time Messaging & Group Chat',
    description:
      'Discover PixelTalk, a modern messaging app for real-time conversations and group chats. Low-noise lounges, instant text, and tactile retro visuals.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'PixelTalk',
      alternateName: ['Pixel Talk', 'PixelTalk App', 'Pixel Talk Messaging App'],
      description:
        'A modern messaging app for real-time conversations and group chats with tactile retro aesthetics.',
      publisher: {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: 'PixelTalk',
        url: APP_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${APP_URL}/logo/icon-mark.svg`,
        },
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebApplication',
      '@id': `${APP_URL}/#app`,
      name: 'PixelTalk',
      alternateName: ['Pixel Talk', 'PixelTalk App'],
      url: APP_URL,
      description:
        'Real-time messaging and group chat platform featuring low-noise lounges, instant text, and tactile retro pixel visuals.',
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'All modern web browsers (Chrome, Firefox, Safari, Edge)',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@id': `${APP_URL}/#organization`,
      },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
