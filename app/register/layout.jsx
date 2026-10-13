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
  title: 'Create Account — Join PixelTalk',
  description:
    'Join the PixelTalk retro community. Create an account, customize your 8-bit avatar, and join live chat lounges.',
  alternates: {
    canonical: '/register',
  },
  openGraph: {
    title: 'Create Account — Join PixelTalk',
    description:
      'Join the PixelTalk retro community. Create an account, customize your 8-bit avatar, and join live chat lounges.',
    url: '/register',
  },
};

export default function RegisterLayout({ children }) {
  return children;
}
