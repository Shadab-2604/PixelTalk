/**
 * File: sitemap.js
 *
 * Responsibility:
 * Generates dynamic sitemap.xml for search engines listing all indexable public routes
 * (landing page, about, registration, signup, privacy policy, terms of service)
 * with freshness timestamps and priority weights.
 *
 * Layer:
 * Frontend / SEO
 */
export default function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://pixel-talk-qofh.vercel.app').replace(/\/+$/, '');
  const lastMod = new Date('2026-10-13T00:00:00.000Z');

  return [
    {
      url: `${baseUrl}`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
