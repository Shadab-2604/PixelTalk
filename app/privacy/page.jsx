/**
 * File: page.jsx (Privacy Policy)
 *
 * Responsibility:
 * Public privacy policy page detailing encryption, telemetry stance,
 * cookie usage, and account data deletion.
 *
 * Layer:
 * Frontend / Legal & Informational Pages
 */

import Link from 'next/link';
import { LogoMark } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata = {
  title: 'Privacy Policy — PixelTalk',
  description:
    'Learn how PixelTalk protects your data, handles real-time messages, and respects digital privacy without intrusive advertising or tracking.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy — PixelTalk',
    description:
      'Learn how PixelTalk protects your data, handles real-time messages, and respects digital privacy without intrusive advertising or tracking.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main className="w-full max-w-[1200px] mx-auto min-h-screen p-6 md:p-10 lg:p-12 flex flex-col bg-pixel-grid">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-tertiary/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex-shrink-0 bg-surface-container-lowest p-2 rounded-xl border-2 border-tertiary/20 shadow-pixel-terracotta flex items-center justify-center">
            <LogoMark size={40} className="w-full h-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-headline-sm text-tertiary font-bold tracking-tight">PIXELTALK</span>
              <Badge tone="green">LEGAL</Badge>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">&ldquo;A little pixel. A lot of talk.&rdquo;</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-mono text-label-sm font-bold text-tertiary hover:text-primary-container px-3 py-1.5 rounded-lg border border-tertiary/20 hover:border-tertiary transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="font-mono text-label-sm font-bold bg-primary-container text-surface-container px-3 py-1.5 rounded-lg border border-tertiary shadow-pixel-sm-solid hover:bg-primary transition-all"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Privacy Policy' },
        ]}
        className="mb-6"
      />

      {/* Policy Content */}
      <article className="flex-1 space-y-8 max-w-4xl">
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-md space-y-4">
          <Badge tone="green">DATA TRANSPARENCY</Badge>
          <h1 className="font-display text-headline-lg sm:text-display-sm text-on-surface font-bold tracking-tight">
            PixelTalk Privacy Policy
          </h1>
          <p className="font-mono text-label-sm text-tertiary">
            Last Updated: October 2026 • Effective Immediately
          </p>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            At PixelTalk, we believe privacy is not an afterthought or an optional toggle—it is the foundation of calm,
            honest conversation. We do not sell your personal data, we do not build behavioral advertising profiles,
            and we do not track you across the web.
          </p>
        </section>

        {/* Section 1 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">1. Information We Collect</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            We only collect information essential to operate your PixelTalk account and deliver real-time messages:
          </p>
          <ul className="list-disc list-inside font-body-sm text-body-sm text-on-surface-variant space-y-2 pl-2">
            <li><strong>Account Identity:</strong> Username, display name, email address (for authentication and OTP verification), and password hash (encrypted via bcrypt with 12 salt rounds).</li>
            <li><strong>Player Preferences:</strong> Chosen pixel avatar identifier, theme preference (light/dark/system), and sound notification settings.</li>
            <li><strong>Communications:</strong> Messages, media links, and lounge memberships created during active participation.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">2. Cookies &amp; Session Tokens</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            PixelTalk utilizes secure, encrypted JSON Web Tokens (JWT) stored exclusively in <code className="font-mono text-label-xs bg-surface-container px-1.5 py-0.5 rounded border border-tertiary/20">HttpOnly</code>, <code className="font-mono text-label-xs bg-surface-container px-1.5 py-0.5 rounded border border-tertiary/20">SameSite=Lax</code> cookies.
            These tokens cannot be accessed by client-side JavaScript, protecting your account against cross-site scripting (XSS) extraction.
          </p>
        </section>

        {/* Section 3 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">3. Admin Isolation &amp; Message Secrecy</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Our platform administration console is strictly partitioned. Administrators cannot browse private user messages,
            decrypt 1-on-1 conversations, or inspect private attachments. The backend enforces strict authorization guards
            returning 403 Forbidden on unauthorized message inspection attempts.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">4. Your Rights &amp; Data Deletion</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            You maintain full sovereignty over your data. You may request account deletion, clear personal chat histories,
            or update your credentials at any time in <Link href="/settings" className="text-primary hover:underline underline-offset-2 font-bold">Account Settings</Link>.
          </p>
        </section>
      </article>

      {/* Footer */}
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
          <Link href="/privacy" className="text-primary font-bold">Privacy</Link>
          <Link href="/terms" className="hover:text-tertiary transition-colors">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
