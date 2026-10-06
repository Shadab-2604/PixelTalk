/**
 * File: page.jsx (Landing / Auth Gateway)
 *
 * Responsibility:
 * Public landing page and authentication portal:
 * - Brand presentation with pure CSS/SVG retro landscape animation
 * - Inline login form with "Forgot password?" OTP recovery
 * - Auto-redirection to `/dashboard` if an active session is detected
 *
 * Layer:
 * Frontend / Public Page
 *
 * Connected to:
 * - frontend/features/auth/AuthForms.jsx
 * - frontend/hooks/useAuth.jsx
 * - frontend/components/Logo.jsx
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoFull } from '@/components/Logo';
import { Badge } from '@/components/ui';
import { LoginForm } from '@/features/auth/AuthForms';
import { useAuth } from '@/hooks/useAuth';
import { APP_VERSION } from '@/lib/config';

/** Pixel landscape illustration from the Stitch design (pure CSS/SVG, no external images). */
function PixelLandscape() {
  return (
    <div className="w-full bg-surface-container-low rounded-2xl border-2 border-tertiary/20 p-6 shadow-pixel-sm overflow-hidden relative">
      {/* Floating pixel sun + clouds */}
      <div className="absolute top-6 right-8 animate-pixel-float">
        <div className="grid grid-cols-3 gap-0.5 w-7 h-7">
          <div /><div className="bg-primary-fixed" /><div />
          <div className="bg-primary-fixed" /><div className="bg-primary-container" /><div className="bg-primary-fixed" />
          <div /><div className="bg-primary-fixed" /><div />
        </div>
      </div>
      <div className="absolute top-8 left-12 animate-pixel-float-delayed opacity-90">
        <div className="flex flex-col items-center">
          <div className="w-8 h-2 bg-white rounded-t-sm" />
          <div className="w-16 h-3 bg-white" />
          <div className="w-12 h-2 bg-surface-variant rounded-b-sm" />
        </div>
      </div>
      {/* Live room pill */}
      <div className="absolute top-24 left-1/3 hidden md:flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-tertiary/30 shadow-pixel-terracotta">
        <span className="w-2 h-2 bg-primary" />
        <span className="font-mono text-label-sm text-tertiary font-bold tracking-wider">ROOM #042 LIVE</span>
        <span className="material-symbols-outlined text-[14px] text-primary">graphic_eq</span>
      </div>

      {/* Landscape SVG (verbatim composition from the Stitch page) */}
      <div className="w-full pt-16">
        <svg className="w-full h-44" fill="none" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect fill="#f0e0cd" height="120" width="80" x="40" y="80" />
          <rect fill="#f0e0cd" height="130" width="90" x="100" y="70" />
          <rect fill="#f0e0cd" height="115" width="70" x="180" y="85" />
          <rect fill="#b4d087" height="90" width="100" x="20" y="110" />
          <rect fill="#91ac67" height="105" width="120" x="110" y="95" />
          <rect fill="#b4d087" height="95" width="140" x="220" y="105" />
          <rect fill="#91ac67" height="110" width="130" x="340" y="90" />
          <rect fill="#b4d087" height="85" width="130" x="450" y="115" />
          <rect fill="#597928" height="40" width="14" x="70" y="70" />
          <rect fill="#426010" height="18" width="22" x="66" y="60" />
          <rect fill="#6e3511" height="20" width="6" x="74" y="100" />
          <rect fill="#597928" height="50" width="18" x="150" y="55" />
          <rect fill="#426010" height="22" width="30" x="144" y="42" />
          <rect fill="#6e3511" height="20" width="6" x="156" y="95" />
          <rect fill="#597928" height="42" width="16" x="390" y="60" />
          <rect fill="#426010" height="20" width="28" x="384" y="48" />
          <rect fill="#6e3511" height="18" width="6" x="395" y="92" />
          <rect fill="#597928" height="35" width="10" x="260" y="75" />
          <rect fill="#426010" height="50" width="10" x="274" y="60" />
          <rect fill="#844721" height="62" width="10" x="288" y="48" />
          <rect fill="#597928" height="45" width="10" x="302" y="65" />
          <rect fill="#426010" height="30" width="10" x="316" y="80" />
          <rect fill="#597928" height="70" width="600" x="0" y="130" />
          <rect fill="#597928" height="5" width="40" x="0" y="125" />
          <rect fill="#597928" height="5" width="70" x="50" y="125" />
          <rect fill="#597928" height="5" width="90" x="130" y="125" />
          <rect fill="#597928" height="5" width="60" x="230" y="125" />
          <rect fill="#597928" height="5" width="110" x="300" y="125" />
          <rect fill="#597928" height="5" width="90" x="420" y="125" />
          <rect fill="#597928" height="5" width="80" x="520" y="125" />
          <rect fill="#6e3511" height="35" width="600" x="0" y="165" />
          <rect fill="#844721" height="6" width="15" x="30" y="175" />
          <rect fill="#a25e37" height="6" width="22" x="90" y="180" />
          <rect fill="#844721" height="6" width="18" x="180" y="172" />
          <rect fill="#a25e37" height="5" width="25" x="260" y="182" />
          <rect fill="#844721" height="6" width="20" x="360" y="175" />
          <rect fill="#a25e37" height="6" width="16" x="470" y="178" />
          <rect fill="#844721" height="6" width="22" x="530" y="172" />
        </svg>
      </div>

      <div className="mt-4 pt-3 border-t border-tertiary/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-primary-container inline-block shadow-pixel-sm" />
          <p className="font-mono text-label-sm text-on-surface-variant">Tactile Audio Spatial Channels &amp; Pixel Chat</p>
        </div>
        <span className="font-mono text-label-sm text-tertiary font-bold tracking-tight">LATENCY: 12ms [OPTIMAL]</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <main className="w-full max-w-[1440px] mx-auto min-h-screen p-6 md:p-10 lg:p-12 flex flex-col justify-between bg-pixel-grid">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1">
        {/* LEFT: brand hero */}
        <section className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="flex flex-col space-y-4">
            <div className="inline-flex items-center gap-3">
              <div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 bg-surface-container-lowest p-1.5 rounded-xl border-2 border-tertiary/20 shadow-pixel-terracotta">
                <LogoFull height={64} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-headline-lg text-tertiary font-bold tracking-tight">PIXELTALK</h1>
                  <Badge tone="green">EST. 2025</Badge>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">&ldquo;A little pixel. A lot of talk.&rdquo;</p>
              </div>
            </div>
          </div>

          <PixelLandscape />

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-tertiary/20 shadow-pixel-sm flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-secondary-container rounded-lg border border-secondary/30 text-on-secondary-container">
                <span className="material-symbols-outlined text-[20px]">forum</span>
              </div>
              <div>
                <h2 className="font-display text-headline-sm text-on-surface font-semibold">Welcome to the quiet, cozy corner of real-time talk.</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Low-noise voice lounges, frictionless text, and tactile retro-micro visuals.</p>
              </div>
            </div>
            <div className="hidden sm:flex flex-shrink-0 items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-lg border border-tertiary/20">
              <span className="w-2 h-2 bg-primary inline-block" />
              <span className="font-mono text-label-sm text-tertiary font-bold whitespace-nowrap">Pixel Audio Active 🔊</span>
            </div>
          </div>
        </section>

        {/* RIGHT: auth card */}
        <section className="lg:col-span-5 flex justify-center w-full">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-7 sm:p-9 border-2 border-tertiary/20 shadow-pixel-md relative">
            <div className="absolute top-2.5 left-2.5 flex gap-1">
              <span className="w-1.5 h-1.5 bg-tertiary/30" />
              <span className="w-1.5 h-1.5 bg-tertiary/20" />
            </div>
            <div className="absolute top-2.5 right-2.5 flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/40" />
              <span className="w-1.5 h-1.5 bg-primary/20" />
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 bg-primary-container inline-block" />
                <span className="font-mono text-label-sm uppercase font-bold tracking-wider text-secondary">Player Sign-In</span>
              </div>
              <h2 className="font-display text-headline-md text-on-surface font-bold tracking-tight">Welcome back, player.</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Your conversations are waiting.</p>
            </div>

            <LoginForm />
          </div>
        </section>
      </div>

      <footer className="w-full mt-10 pt-4 border-t border-tertiary/15 flex flex-wrap items-center justify-between gap-4 font-mono text-label-sm text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-tertiary">
            <span className="w-2 h-2 bg-primary inline-block" />
            PixelTalk
          </span>
          <span>•</span>
          <span>v{APP_VERSION}</span>
          <span>•</span>
          <span className="text-tertiary">Loading your world...</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            All servers operational
            <span className="inline-block w-2 h-2 bg-primary-container" />
          </span>
          <span>•</span>
          <span className="hover:text-tertiary transition-colors cursor-default">Privacy</span>
          <span className="hover:text-tertiary transition-colors cursor-default">Terms</span>
        </div>
      </footer>
    </main>
  );
}
