/**
 * File: Logo.jsx
 *
 * Responsibility:
 * Renders the official PixelTalk branding assets (icon mark and full logo brand mark)
 * using optimized Next.js Image components with pixel aspect ratios.
 *
 * Layer:
 * Frontend / UI Components
 *
 * Connected to:
 * - frontend/components/TopBar.jsx
 * - frontend/app/page.jsx (Landing page)
 * - frontend/features/auth/AuthForms.jsx
 */

import Image from 'next/image';

export function LogoMark({ size = 36, className = '' }) {
  return (
    <Image
      src="/logo/icon-mark.svg"
      alt="PixelTalk — Real-Time Messaging & Group Chat App"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  );
}

export function LogoFull({ height = 36, className = '' }) {
  return (
    <Image
      src="/logo/logo-full.svg"
      alt="PixelTalk — Real-Time Messaging Platform"
      height={height}
      width={height * (800 / 240)}
      className={`object-contain ${className}`}
      priority
    />
  );
}
