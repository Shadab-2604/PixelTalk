/**
 * Root Global Error Boundary
 *
 * Responsibility:
 * Catches critical errors in root layout rendering. Provides html/body wrappers
 * and safe recovery UI.
 */

'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface flex items-center justify-center p-6 font-mono text-on-surface">
        <div className="w-full max-w-md bg-surface-container-lowest border-4 border-tertiary rounded-2xl shadow-pixel-md p-8 text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-error/10 border-2 border-error/30 text-error mb-1">
            <span className="material-symbols-outlined text-[48px]">report</span>
          </div>

          <div>
            <h1 className="font-display font-bold text-headline-md text-on-surface mt-2">
              Critical System Error
            </h1>
            <p className="font-body-md text-body-sm text-on-surface-variant mt-1.5">
              The application encountered an unexpected runtime failure.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2.5 bg-primary-container text-surface-container font-mono text-label-md font-bold rounded-xl border-2 border-tertiary shadow-pixel-sm-solid hover:brightness-105 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
