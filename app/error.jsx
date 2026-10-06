/**
 * App Route Error Boundary
 *
 * Responsibility:
 * Catches unhandled client-side render exceptions in app pages without crashing
 * the root shell, providing a PixelTalk-styled error recovery view with retry action.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-mono text-on-surface select-none">
      <div className="w-full max-w-md bg-surface-container-lowest border-4 border-tertiary rounded-2xl shadow-pixel-md p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-error/10 border-2 border-error/30 text-error mb-1">
          <span className="material-symbols-outlined text-[48px]">warning</span>
        </div>

        <div>
          <span className="px-3 py-1 bg-error/10 text-error font-mono text-label-xs font-bold rounded-md border border-error/30 uppercase">
            APPLICATION ERROR
          </span>
          <h1 className="font-display font-bold text-headline-md text-on-surface mt-3">
            Something went wrong
          </h1>
          <p className="font-body-md text-body-sm text-on-surface-variant mt-1.5">
            An unexpected error occurred while rendering this page.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 bg-primary-container text-surface-container font-mono text-label-md font-bold rounded-xl border-2 border-tertiary shadow-pixel-sm-solid hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="px-5 py-2.5 bg-surface-container text-on-surface font-mono text-label-md font-bold rounded-xl border border-tertiary/30 hover:bg-surface-container-high transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
