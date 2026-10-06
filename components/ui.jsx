/**
 * File: ui.jsx
 *
 * Responsibility:
 * Centralized Design System component library for PixelTalk:
 * - Buttons (PrimaryButton, SecondaryButton, GhostButton, DestructiveButton)
 * - Form Controls (Input, PasswordInput, Textarea, PixelRadio, Field, ErrorText)
 * - Badges, Avatars, and Presence indicators (Badge, Avatar, PresencePip)
 * - Viewport Portal Modal dialogs with scroll locking and accessibility (`Modal`)
 * - Data display cards, state indicators, and spinners (Card, EmptyState, Spinner)
 *
 * Layer:
 * Frontend / Design System UI Library
 *
 * Connected to:
 * - Used universally across all pages, features, and modal dialogs.
 */

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/* ---------- Buttons ---------- */

const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 font-bold rounded-[10px] border-[1.5px] transition-all press disabled:opacity-50 disabled:pointer-events-none';

export function PrimaryButton({ children, className = '', size = 'md', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-label-md', md: 'px-4 py-2 text-label-lg', lg: 'px-5 py-3 text-headline-sm' };
  return (
    <button
      className={`${BTN_BASE} bg-primary-container text-surface-container border-tertiary shadow-pixel-sm-solid hover:bg-primary ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', size = 'md', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-label-md', md: 'px-4 py-2 text-label-lg', lg: 'px-5 py-3 text-headline-sm' };
  return (
    <button
      className={`${BTN_BASE} bg-surface-container text-brown border-tertiary/60 shadow-pixel-sm hover:bg-secondary-container/40 ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DestructiveButton({ children, className = '', size = 'md', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-label-md', md: 'px-4 py-2 text-label-lg', lg: 'px-5 py-3 text-headline-sm' };
  return (
    <button
      className={`${BTN_BASE} bg-error-container text-on-error-container border-error/50 shadow-pixel-sm-solid hover:bg-error hover:text-white ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-tertiary/25 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all press shadow-pixel-sm text-label-md ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ icon, title, className = '', ...props }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg border border-tertiary/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all press shadow-pixel-sm ${className}`}
      {...props}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </button>
  );
}

/* ---------- Inputs ---------- */

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 bg-surface text-on-surface font-body text-base sm:text-body-md rounded-[10px] border-[1.5px] border-tertiary/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all placeholder:text-outline-variant ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative w-full">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full pl-3.5 pr-10 py-2.5 bg-surface text-on-surface font-body text-base sm:text-body-md rounded-[10px] border-[1.5px] border-tertiary/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all placeholder:text-outline-variant ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary/70 hover:text-tertiary p-1 flex items-center justify-center rounded focus:outline-none"
      >
        <span className="material-symbols-outlined text-[20px]">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3.5 py-2.5 bg-surface text-on-surface font-body text-base sm:text-body-md rounded-[10px] border-[1.5px] border-tertiary/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all resize-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`bg-transparent border-none p-0 font-bold focus:ring-0 cursor-pointer text-label-sm text-on-surface ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block font-mono text-label-md font-bold text-on-surface uppercase tracking-wide">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

/* ---------- Pixel checkbox / radio ---------- */

export function PixelCheckbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(!checked)}
      className="inline-flex items-center gap-2 select-none min-h-[32px]"
      aria-pressed={checked}
    >
      <span
        className={`w-4 h-4 rounded-[2px] border-[1.5px] border-tertiary bg-surface-container flex items-center justify-center transition-all ${
          checked ? 'shadow-pixel-sm' : ''
        }`}
      >
        {checked && <span className="w-2 h-2 bg-primary-container" />}
      </span>
      {label && <span className="font-body-sm text-body-sm text-on-surface">{label}</span>}
    </button>
  );
}

export function PixelRadio({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange && onChange()}
      className={`flex items-center gap-3 p-3 rounded-lg border-[1.5px] text-left transition-all w-full min-h-[44px] ${
        checked ? 'border-primary-container bg-secondary-container/20 shadow-pixel-sm' : 'border-tertiary/30 bg-surface-container-lowest hover:border-tertiary/60'
      }`}
      aria-pressed={checked}
    >
      <span className="w-4 h-4 bg-surface border-[1.5px] border-tertiary flex items-center justify-center flex-shrink-0">
        {checked && <span className="w-2 h-2 bg-primary-container" />}
      </span>
      <span>
        <span className="block font-display text-[13px] font-bold text-on-surface">{label}</span>
        {description && <span className="block font-body-sm text-[11px] text-on-surface-variant">{description}</span>}
      </span>
    </button>
  );
}

export function PixelToggle({ checked, onChange, size = 'md' }) {
  const dims = size === 'md' ? 'w-12 h-6' : 'w-11 h-6';
  const knob = size === 'md' ? 'h-5 w-5' : 'h-5 w-4';
  const shift = size === 'md' ? 'translate-x-6' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className={`relative inline-flex items-center ${dims} rounded-none border-2 border-tertiary transition-all press shadow-pixel-sm-solid ${
        checked ? 'bg-primary-container' : 'bg-surface-dim'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] bg-surface-container border-2 border-tertiary ${knob} transition-all ${
          checked ? shift : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ---------- Badges ---------- */

export function Badge({ children, tone = 'brown', className = '' }) {
  const tones = {
    brown: 'bg-surface-container text-tertiary border-tertiary/20',
    green: 'bg-secondary-container text-on-secondary-container border-secondary/30',
    deep: 'bg-primary-container text-surface-container border-tertiary shadow-pixel-sm',
    error: 'bg-error-container text-on-error-container border-error/30',
    amber: 'bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/30',
    outline: 'bg-surface-container-high text-tertiary border-tertiary/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-label-sm font-bold uppercase tracking-wider border ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- Presence pip (8×8 sharp square) ---------- */

export function PresencePip({ online, away = false, size = 'sm', className = '' }) {
  const s = size === 'lg' ? 'w-2.5 h-2.5' : size === 'xl' ? 'w-4 h-4' : 'w-2 h-2';
  const color = away ? 'bg-amberpix' : online ? 'bg-primary-container' : 'bg-brown/40';
  return <span aria-hidden className={`inline-block ${s} ${color} ${className}`} />;
}

export function Avatar({ src, alt = '', size = 36, online, className = '', ring = true }) {
  const isSvg = typeof src === 'string' && src.startsWith('data:image/svg+xml');
  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`w-full h-full object-cover rounded-lg ${isSvg ? 'pixelated' : ''} ${ring ? 'border-[1.5px] border-tertiary/40' : ''}`}
        style={isSvg ? { imageRendering: 'pixelated' } : {}}
      />
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-[1.5px] border-surface-container ${
            online ? 'bg-primary-container' : 'bg-brown/40'
          }`}
        />
      )}
    </span>
  );
}

/* ---------- Modal (Viewport Portal with Scroll Lock & Focus Accessibility) ---------- */

export function Modal({ open, onClose, title, kicker, children, maxW = 'max-w-xl' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    // Body scroll lock: freeze background page scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keyboard navigation: Escape key closes dismissible modal
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pixel-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Full-viewport backdrop covering headers, sidebars, and main content */}
      <div
        className="fixed inset-0 bg-[#221A0E]/60 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        onClick={() => onClose && onClose()}
      />

      {/* Dialog card with PixelTalk borders and shadows */}
      <div
        className={`relative z-10 w-full max-w-[95vw] sm:${maxW} bg-surface border-2 border-tertiary rounded-2xl shadow-pixel-lg p-4 sm:p-7 my-auto max-h-[90dvh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between pb-4 border-b border-tertiary/20">
          <div>
            {kicker && (
              <div className="inline-flex items-center gap-1.5 text-primary-container font-mono text-label-sm font-bold mb-1">
                <span className="w-2 h-2 bg-primary-container" />
                {kicker}
              </div>
            )}
            <h2 id="pixel-modal-title" className="font-display text-headline-lg text-on-surface font-bold">
              {title}
            </h2>
          </div>
          <IconButton icon="close" title="Close" aria-label="Close dialog" onClick={onClose} />
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );

  const mountTarget = document.getElementById('modal-root') || document.body;
  return createPortal(modalNode, mountTarget);
}

/* ---------- Feedback ---------- */

export function Spinner({ className = '' }) {
  return (
    <span className={`inline-block w-5 h-5 border-2 border-tertiary/30 border-t-primary-container animate-spin rounded-full ${className}`} />
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p className="flex items-center gap-1.5 font-body-sm text-body-sm text-error bg-error-container/60 border border-error/30 rounded-lg px-3 py-2">
      <span className="material-symbols-outlined text-[16px]">error</span>
      {children}
    </p>
  );
}

export function EmptyState({ icon = 'inbox', title, hint, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-xl bg-surface-container border-[1.5px] border-tertiary/30 flex items-center justify-center mb-3 shadow-pixel-sm">
        <span className="material-symbols-outlined text-tertiary text-[28px]">{icon}</span>
      </div>
      <p className="font-display text-headline-sm font-bold text-on-surface">{title}</p>
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xs">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
