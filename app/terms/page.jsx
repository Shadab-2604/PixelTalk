/**
 * File: page.jsx (Terms of Service)
 *
 * Responsibility:
 * Public terms of service and community standards defining respectful interaction,
 * anti-harassment rules, and acceptable usage of PixelTalk lounges.
 *
 * Layer:
 * Frontend / Legal & Informational Pages
 */

import Link from 'next/link';
import { LogoMark } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata = {
  title: 'Terms of Service — PixelTalk',
  description:
    'Guidelines, community standards, and terms of service for PixelTalk lounges, direct messaging, and voice rooms.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms of Service — PixelTalk',
    description:
      'Guidelines, community standards, and terms of service for PixelTalk lounges, direct messaging, and voice rooms.',
    url: '/terms',
  },
};

export default function TermsPage() {
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
              <Badge tone="green">COMMUNITY</Badge>
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
          { label: 'Terms of Service' },
        ]}
        className="mb-6"
      />

      {/* Terms Content */}
      <article className="flex-1 space-y-8 max-w-4xl">
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-md space-y-4">
          <Badge tone="green">CODE OF CONDUCT</Badge>
          <h1 className="font-display text-headline-lg sm:text-display-sm text-on-surface font-bold tracking-tight">
            PixelTalk Terms of Service
          </h1>
          <p className="font-mono text-label-sm text-tertiary">
            Effective Date: October 2026 • Version 1.0.4
          </p>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            By accessing PixelTalk or creating an account, you agree to these Terms of Service.
            Our community thrives on respectful, thoughtful conversations in calm, tactile spaces.
          </p>
        </section>

        {/* Section 1 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">1. Respectful Lounge Participation</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            All players are expected to treat peers with mutual courtesy. We prohibit:
          </p>
          <ul className="list-disc list-inside font-body-sm text-body-sm text-on-surface-variant space-y-2 pl-2">
            <li>Harassment, threats, stalking, hate speech, or targeted discrimination.</li>
            <li>Automated spamming, message flooding, or unauthorized bot automation.</li>
            <li>Distributing malicious links, phishing attempts, or illegal content.</li>
            <li>Impersonating administrators, moderators, or other community members.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">2. Room Governance &amp; Moderation</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Room creators and administrators have full autonomy over their lounges, including setting passcodes,
            inviting members, and removing disruptive participants. Platform administrators reserve the right
            to suspend accounts that violate systemic safety policies.
          </p>
        </section>

        {/* Section 3 */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">3. Service Availability</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            PixelTalk is provided &quot;as is&quot; without express or implied warranties. While we strive for 99.9% uptime
            across our WebSocket and database clusters, periodic maintenance may occur.
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
          <Link href="/privacy" className="hover:text-tertiary transition-colors">Privacy</Link>
          <Link href="/terms" className="text-primary font-bold">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
