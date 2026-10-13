/**
 * File: robots.js
 *
 * Responsibility:
 * Generates dynamic robots.txt search engine crawling policy:
 * - Allows public indexing of landing, signup, about, privacy, and terms pages
 * - Disallows private user inboxes, direct chat threads, rooms, settings, and admin consoles
 * - Directs automated agents to sitemap.xml and llms.txt
 *
 * Layer:
 * Frontend / SEO
 */
export default function robots() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://pixel-talk-qofh.vercel.app').replace(/\/+$/, '');
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/signup',
        '/register',
        '/about',
        '/privacy',
        '/terms',
        '/icon.svg',
        '/og-image.svg',
        '/llms.txt',
        '/llms-full.txt',
      ],
      disallow: [
        '/chat/',
        '/rooms/',
        '/dashboard',
        '/settings',
        '/profile',
        '/admin',
        '/admin/',
        '/admin/*',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
