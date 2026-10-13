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
    default: 'PixelTalk — Real-Time Pixel-Infused Messaging',
    template: '%s | PixelTalk',
  },
  description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, and tactile retro-micro visuals.',
  applicationName: 'PixelTalk',
  keywords: [
    'chat',
    'messaging',
    'pixel art',
    'retro chat',
    'realtime messenger',
    'rooms',
    'lounges',
    'encrypted chat',
    'web messenger',
  ],
  authors: [{ name: 'PixelTalk Team', url: APP_URL }],
  creator: 'PixelTalk Labs',
  publisher: 'PixelTalk Studios',
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
    title: 'PixelTalk — Real-Time Pixel-Infused Messaging',
    description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, tactile retro-micro visuals.',
    url: APP_URL,
    siteName: 'PixelTalk',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'PixelTalk — Real-Time Pixel-Infused Messaging',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PixelTalk — Real-Time Pixel-Infused Messaging',
    description: 'Real-time pixel-infused messaging. Low-noise lounges, frictionless text, tactile retro-micro visuals.',
    images: ['/og-image.svg'],
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
      '@type': 'WebApplication',
      '@id': `${APP_URL}/#app`,
      name: 'PixelTalk',
      url: APP_URL,
      description:
        'Real-time pixel-infused retro messenger. Low-noise lounges, frictionless text, and tactile 8-bit visuals.',
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'All modern web browsers (Chrome, Firefox, Safari, Edge)',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      softwareVersion: '1.0.4',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      creator: {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: 'PixelTalk Labs',
        url: APP_URL,
        logo: `${APP_URL}/logo/icon-mark.svg`,
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${APP_URL}/#business`,
      name: 'PixelTalk Studios',
      description: 'Creators of pixel-crafted real-time communication software and retro community lounges.',
      url: APP_URL,
      telephone: '+1-415-555-0142',
      priceRange: 'Free',
      image: `${APP_URL}/logo/icon-mark.svg`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '742 Evergreen Pixel Blvd',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94107',
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 37.7749,
        longitude: -122.4194,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: '00:00',
          closes: '23:59',
        },
      ],
      sameAs: [
        'https://github.com/pixeltalk',
        'https://twitter.com/pixeltalk',
      ],
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
