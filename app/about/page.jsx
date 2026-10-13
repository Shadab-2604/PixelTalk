/**
 * File: page.jsx (About PixelTalk)
 *
 * Responsibility:
 * Public about page explaining the origins, philosophy, low-noise ethos,
 * and retro-tactile aesthetics of PixelTalk.
 *
 * Layer:
 * Frontend / Public Informational Pages
 */

import Link from 'next/link';
import { LogoMark } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata = {
  title: 'About the Retro Real-Time Messenger',
  description:
    'Discover the story and design philosophy behind PixelTalk: a tactile, low-noise retro real-time messaging app and group chat lounge.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About the Retro Real-Time Messenger',
    description:
      'Discover the story and design philosophy behind PixelTalk: a tactile, low-noise retro real-time messaging app and group chat lounge.',
    url: '/about',
  },
};

export default function AboutPage() {
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
              <Badge tone="green">MANIFESTO</Badge>
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

      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]}
        className="mb-6"
      />

      {/* Main Content Area */}
      <article className="flex-1 space-y-8 max-w-4xl">
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-md space-y-4">
          <Badge tone="green">OUR MISSION</Badge>
          <h1 className="font-display text-headline-lg sm:text-display-sm text-on-surface font-bold tracking-tight">
            Why we built PixelTalk.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Modern social software is exhausting. Algorithmic recommendation feeds, intrusive read-receipt surveillance,
            endless red notification pings, and sanitized corporate interfaces have turned communication into a chore.
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            PixelTalk was born from a simple desire: bring back the cozy, tactile intimacy of early internet chat rooms
            and retro bulletin boards, backed by rock-solid modern infrastructure and zero telemetry noise.
          </p>
        </section>

        {/* Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-surface-container flex items-center justify-center border border-tertiary shadow-pixel-sm-solid">
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">volume_off</span>
            </div>
            <h2 className="font-display text-headline-sm text-on-surface font-bold">Zero Noise</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No sponsored posts, no algorithmic curation, no engagement traps. You only see messages from players and rooms you actively join.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-surface-container flex items-center justify-center border border-tertiary shadow-pixel-sm-solid">
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">speed</span>
            </div>
            <h2 className="font-display text-headline-sm text-on-surface font-bold">Instant Latency</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Socket.IO bidirectional WebSocket conduits deliver keystrokes and messages in 0 milliseconds, synchronized with Redis Cloud caching.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border-2 border-tertiary/20 shadow-pixel-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-surface-container flex items-center justify-center border border-tertiary shadow-pixel-sm-solid">
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">palette</span>
            </div>
            <h2 className="font-display text-headline-sm text-on-surface font-bold">Tactile Micro-Visuals</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Hand-shaded 8-bit character avatars, terracotta borders, audio equalizer cues, and nostalgic warmth built for focused minds.
            </p>
          </div>
        </section>

        {/* Technical Architecture */}
        <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border-2 border-tertiary/20 shadow-pixel-md space-y-4">
          <Badge tone="green">ARCHITECTURE</Badge>
          <h2 className="font-display text-headline-md text-on-surface font-bold">Modern engineering, retro spirit.</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Behind the pixel-art aesthetic sits an uncompromising web engine: Next.js 14 App Router on the client,
            an Express and Socket.IO real-time cluster, MongoDB persistence with strict sanitization guards, and WebRTC
            for peer-to-peer audio and video calling.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 font-mono text-label-sm">
            <Link href="/register" className="text-primary hover:underline underline-offset-4 font-bold">
              Join the community &rarr;
            </Link>
            <Link href="/privacy" className="text-tertiary hover:underline underline-offset-4">
              Review Privacy Standards &rarr;
            </Link>
            <Link href="/terms" className="text-tertiary hover:underline underline-offset-4">
              Community Guidelines &rarr;
            </Link>
          </div>
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
          <Link href="/about" className="text-primary font-bold">About</Link>
          <Link href="/privacy" className="hover:text-tertiary transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-tertiary transition-colors">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
