/**
 * File: robots.js
 *
 * Responsibility:
 * Generates dynamic robots.txt search engine crawling policy:
 * Allows public indexation of landing and signup pages while disallowing
 * private user inboxes, rooms, profile data, settings, and admin consoles.
 *
 * Layer:
 * Frontend / SEO
 */
export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pixeltalk.shad.dev';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/signup', '/register'],
      disallow: [
        '/chat/',
        '/rooms/',
        '/dashboard',
        '/settings',
        '/profile',
        '/admin/',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
