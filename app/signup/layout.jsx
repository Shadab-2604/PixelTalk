/**
 * File: layout.jsx (Signup Corridor Layout)
 *
 * Responsibility:
 * Server-rendered layout providing SEO metadata, canonical tag, and OpenGraph tags
 * for the player signup corridor.
 *
 * Layer:
 * Frontend / Public Pages
 */

export const metadata = {
  title: 'Sign Up — PixelTalk',
  description:
    'Sign up for PixelTalk. Low-noise lounges, real-time messaging, and pixel-styled community rooms.',
  alternates: {
    canonical: '/signup',
  },
  openGraph: {
    title: 'Sign Up — PixelTalk',
    description:
      'Sign up for PixelTalk. Low-noise lounges, real-time messaging, and pixel-styled community rooms.',
    url: '/signup',
  },
};

export default function SignupLayout({ children }) {
  return children;
}
