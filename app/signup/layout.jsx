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
  title: 'Sign Up',
  description:
    'Sign up for PixelTalk. Low-noise lounges, real-time messaging, and pixel-styled community rooms.',
  alternates: {
    canonical: '/register',
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'Sign Up',
    description:
      'Sign up for PixelTalk. Low-noise lounges, real-time messaging, and pixel-styled community rooms.',
    url: '/register',
  },
};

export default function SignupLayout({ children }) {
  return children;
}
