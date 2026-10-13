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
  const now = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
