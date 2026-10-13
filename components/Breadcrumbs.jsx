/**
 * File: Breadcrumbs.jsx
 *
 * Responsibility:
 * Accessible, retro-styled breadcrumb navigation bar with embedded
 * Schema.org BreadcrumbList JSON-LD structured data for Google SEO rich snippets.
 *
 * Layer:
 * Frontend / UI Components
 */

'use client';

import Link from 'next/link';

export function Breadcrumbs({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://pixel-talk-qofh.vercel.app').replace(/\/+$/, '');
    const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={`flex items-center text-label-xs font-mono py-2 ${className}`}>
        <ol className="flex items-center flex-wrap gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="w-1.5 h-1.5 bg-tertiary/30 inline-block rotate-45 select-none" aria-hidden="true" />
                )}
                {isLast || !item.href ? (
                  <span className="font-bold text-on-surface tracking-wide" aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-tertiary hover:text-primary-container hover:underline underline-offset-2 transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
