/**
 * Add Account Modal (features/auth/AddAccountModal.jsx)
 *
 * Responsibility:
 * Allows an authenticated user to sign into an additional PixelTalk account
 * and register it with the Multi-Account Switcher without terminating existing sessions.
 *
 * CONNECTED MODULES:
 * - Auth Context: frontend/hooks/useAuth.jsx
 * - Services: frontend/services/authService.js
 * - UI: frontend/components/ui
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton, SecondaryButton, Input } from '@/components/ui';

export function AddAccountModal({ isOpen, onClose, onAccountAdded }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide both username/email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEmail = identifier.includes('@');
      const payload = isEmail
        ? { email: identifier.trim(), password }
        : { username: identifier.trim(), password };

      const user = await login(payload);
      if (typeof onAccountAdded === 'function') {
        onAccountAdded(user);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to sign in to account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-surface-container-lowest border-[2px] border-tertiary rounded-2xl shadow-pixel-xl flex flex-col overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-4 py-3.5 bg-surface-container border-b-[2px] border-tertiary/25 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary-container text-surface-container rounded-lg border border-tertiary shadow-pixel-sm">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
            </span>
            <div>
              <h2 className="font-display text-title-md font-bold text-on-surface">Add Account</h2>
              <p className="font-mono text-[11px] text-tertiary">Sign in to another PixelTalk account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-tertiary/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-error-container/40 border border-error/30 rounded-xl flex items-center gap-2 text-error text-[13px] font-medium">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-mono text-[12px] font-bold text-on-surface">Username or Email</label>
            <Input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. shadow_ninja or user@example.com"
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[12px] font-bold text-on-surface">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <SecondaryButton type="button" onClick={onClose} disabled={loading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" loading={loading}>
              Sign In & Add
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}
