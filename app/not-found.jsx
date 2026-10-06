/**
 * Custom PixelTalk 404 Not Found Page
 *
 * Features:
 * - PixelTalk warm cream retro design system.
 * - 5-second automatic countdown redirect to home.
 * - Immediate "Return Home" action button.
 * - Timer cleanup on unmount to prevent leaks or repeated redirects.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-on-surface font-mono select-none">
      <div className="w-full max-w-lg bg-surface-container-lowest border-4 border-tertiary rounded-2xl shadow-pixel-md p-8 text-center space-y-6">
        {/* Pixel Art 404 Badge */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary-container border-2 border-tertiary shadow-pixel-sm-solid text-surface-container mb-2">
          <span className="material-symbols-outlined text-[54px]">map</span>
        </div>

        <div>
          <span className="px-3 py-1 bg-amber-500/10 text-amber-600 font-mono text-label-xs font-bold rounded-md border border-amber-500/30 tracking-widest uppercase">
            ERROR 404
          </span>
          <h1 className="font-display font-bold text-headline-lg text-on-surface mt-3 tracking-tight">
            PIXEL NOT FOUND
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-md mx-auto">
            &quot;This page wandered outside the map.&quot;
          </p>
        </div>

        {/* Countdown Box */}
        <div className="p-4 rounded-xl bg-surface-container border border-tertiary/20 space-y-1">
          <p className="font-mono text-label-sm text-tertiary font-bold">
            Redirecting to Home in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
          </p>
          <div className="w-full bg-tertiary/20 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-outline font-semibold pt-1">
            Redirecting in {countdown}...
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-surface-container font-mono text-label-md font-bold rounded-xl border-2 border-tertiary shadow-pixel-sm-solid hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
