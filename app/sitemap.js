/**
 * File: sitemap.js
 *
 * Responsibility:
 * Generates dynamic sitemap.xml for search engines listing indexable public routes
 * (landing page, signup, register) with freshness and priority attributes.
 *
 * Layer:
 * Frontend / SEO
 */
export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pixeltalk.shad.dev';
  const now = new Date();

  return [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/signup`,
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
  ];
}
