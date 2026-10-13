/**
 * File: page.jsx (Signup Corridor Route)
 *
 * Responsibility:
 * Public player signup corridor hosting the `SignupForm` with mandatory
 * 6-digit email OTP verification via Brevo/Resend.
 *
 * Layer:
 * Frontend / Public Pages
 *
 * Connected to:
 * - frontend/features/auth/AuthForms.jsx (SignupForm)
 * - frontend/components/Logo.jsx
 * - frontend/components/Breadcrumbs.jsx
 */

'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { SignupForm } from '@/features/auth/AuthForms';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export default function SignupPage() {
  return (
    <main className="w-full max-w-[1440px] mx-auto min-h-screen p-6 md:p-10 lg:p-12 flex flex-col justify-between bg-pixel-grid">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 bg-surface-container-lowest p-2 rounded-2xl border-2 border-tertiary/20 shadow-pixel-terracotta flex items-center justify-center">
              <LogoMark size={52} className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-headline-lg text-tertiary font-bold tracking-tight">PIXELTALK</h1>
                <Badge tone="green">EST. 2025</Badge>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">&ldquo;A little pixel. A lot of talk.&rdquo;</p>
            </div>
          </div>
          <Link
            href="/"
            className="font-mono text-label-md font-bold text-primary hover:text-primary-container underline underline-offset-4"
          >
            Already have an account? Sign in
          </Link>
        </header>

        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Sign Up' },
          ]}
          className="mb-8"
        />

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
      </div>

      <footer className="w-full mt-12 pt-4 border-t border-tertiary/15 flex flex-wrap items-center justify-between gap-4 font-mono text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-tertiary">
            <span className="w-2 h-2 bg-primary inline-block" />
            PixelTalk
          </span>
          <span>•</span>
          <span>EST. 2025</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-tertiary transition-colors">Home</Link>
          <Link href="/about" className="hover:text-tertiary transition-colors">About</Link>
          <Link href="/privacy" className="hover:text-tertiary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-tertiary transition-colors">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
