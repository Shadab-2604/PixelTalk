/**
 * File: layout.jsx (Register Corridor Layout)
 *
 * Responsibility:
 * Server-rendered layout providing SEO metadata, canonical tag, and OpenGraph tags
 * for the player registration corridor.
 *
 * Layer:
 * Frontend / Public Pages
 */

export const metadata = {
  title: 'Create Account',
  description:
    'Join PixelTalk to start real-time messaging and group chats with custom retro avatars and low-noise lounges.',
  alternates: {
    canonical: '/register',
  },
  openGraph: {
    title: 'Create Account',
    description:
      'Join PixelTalk to start real-time messaging and group chats with custom retro avatars and low-noise lounges.',
    url: '/register',
  },
};

export default function RegisterLayout({ children }) {
  return children;
}
