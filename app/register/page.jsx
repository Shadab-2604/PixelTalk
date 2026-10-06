/**
 * File: page.jsx (Registration Route)
 *
 * Responsibility:
 * Public player registration corridor hosting the `SignupForm` with mandatory
 * 6-digit email OTP verification via Resend.
 *
 * Layer:
 * Frontend / Public Pages
 *
 * Connected to:
 * - frontend/features/auth/AuthForms.jsx (SignupForm)
 * - frontend/components/Logo.jsx
 */

'use client';

import Link from 'next/link';
import { LogoFull } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { SignupForm } from '@/features/auth/AuthForms';

export default function RegisterPage() {
  return (
    <main className="w-full max-w-[1440px] mx-auto min-h-screen p-6 md:p-10 lg:p-12 flex flex-col bg-pixel-grid">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-14 h-14 flex-shrink-0 bg-surface-container-lowest p-1.5 rounded-xl border-2 border-tertiary/20 shadow-pixel-terracotta">
          <LogoFull height={50} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg text-tertiary font-bold tracking-tight">PIXELTALK</h1>
            <Badge tone="green">EST. 2025</Badge>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">&ldquo;A little pixel. A lot of talk.&rdquo;</p>
        </div>
        <Link href="/" className="ml-auto font-mono text-label-md font-bold text-primary hover:text-primary-container underline underline-offset-4">
          Sign in
        </Link>
      </div>

      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-7 sm:p-9 border-2 border-tertiary/20 shadow-pixel-md relative">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 bg-primary-container inline-block" />
              <span className="font-mono text-label-sm uppercase font-bold tracking-wider text-secondary">New Player</span>
            </div>
            <h2 className="font-display text-headline-md text-on-surface font-bold tracking-tight">Create your account.</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Pick an avatar frame and jump into the lounge.</p>
          </div>
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
