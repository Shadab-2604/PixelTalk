/**
 * File: AuthForms.jsx
 *
 * Responsibility:
 * Renders retro-styled forms for user login, registration, and OTP-based recovery:
 * - LoginForm: Credential login + "Forgot Password?" email OTP self-service reset flow
 * - SignupForm: Account registration with mandatory 6-digit email OTP verification
 *   (delivered via Nodemailer + Gmail SMTP on the backend)
 * - AvatarSelector: 10 curated retro pixel character selectors
 *
 * Layer:
 * Frontend / Auth Feature UI
 *
 * Connected to:
 * - Hooks: frontend/hooks/useAuth.jsx, frontend/hooks/useSound.js
 * - Services: frontend/services/authService.js, frontend/services/userService.js
 * - Components: frontend/components/ui.jsx
 * - Lib: frontend/lib/config.js, frontend/lib/avatars.js
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/hooks/useSound';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { PrimaryButton, Input, PasswordInput, Field, ErrorText, PixelCheckbox } from '@/components/ui';
import { AVATAR_IDS } from '@/lib/config';
import { avatarSrc } from '@/lib/avatars';

export function LoginForm() {
  const { login } = useAuth();
  const { play } = useSound();
  const router = useRouter();

  // Mode: normal login vs forgot password
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'otp'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setBusy(true);
    play('click');
    try {
      await login(form);
      play('success');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }
    setBusy(true);
    play('click');
    try {
      await authService.sendPasswordResetOtp({ email: forgotEmail });
      play('success');
      setForgotStep('otp');
      setCooldown(60);
      setSuccessMsg(`A 6-digit reset code has been sent to ${forgotEmail}`);
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (forgotOtp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP code');
      return;
    }
    if (forgotNewPass.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (forgotNewPass !== forgotConfirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    play('click');
    try {
      await authService.resetPasswordWithOtp({
        email: forgotEmail,
        otp: forgotOtp.trim(),
        newPassword: forgotNewPass,
      });
      play('success');
      setIsForgot(false);
      setForgotStep('email');
      setForgotOtp('');
      setForgotNewPass('');
      setForgotConfirm('');
      setSuccessMsg('Password reset successfully! Please sign in with your new password.');
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  // ---------------- Forgot Password View ----------------
  if (isForgot) {
    return (
      <div className="space-y-4">
        <div className="pb-3 border-b border-tertiary/20">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-tertiary font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 bg-primary-container" />
            Password Recovery
          </div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface">
            {forgotStep === 'email' ? 'Reset Your Password' : 'Enter 6-Digit OTP'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {forgotStep === 'email'
              ? "We'll send a one-time verification code to your registered email."
              : `Enter the code sent to ${forgotEmail} and your new password.`}
          </p>
        </div>

        {successMsg && (
          <div className="p-3 bg-secondary-container/40 border border-tertiary/30 rounded font-mono text-label-sm text-on-secondary-container font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">mark_email_read</span>
            {successMsg}
          </div>
        )}

        {forgotStep === 'email' ? (
          <form className="space-y-4" onSubmit={handleSendResetOtp}>
            <Field label="Registered Email" required>
              <div className="relative">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-tertiary/50">
                  <span className="material-symbols-outlined text-[18px]">email</span>
                </span>
              </div>
            </Field>

            <ErrorText>{error}</ErrorText>

            <PrimaryButton type="submit" className="w-full tracking-wider" disabled={busy}>
              {busy ? 'SENDING CODE…' : 'SEND RESET CODE'}
              {!busy && <span className="material-symbols-outlined text-[20px]">send</span>}
            </PrimaryButton>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setSuccessMsg(''); }}
                className="font-mono text-label-md font-bold text-tertiary hover:text-on-surface underline underline-offset-4"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <Field label="6-Digit OTP Code" required hint="Check your inbox or spam folder">
              <Input
                type="text"
                placeholder="123456"
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="font-mono tracking-widest text-center text-headline-sm"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="New Password" required hint="Min. 8 characters">
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="New password"
                  value={forgotNewPass}
                  onChange={(e) => setForgotNewPass(e.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              <Field label="Confirm Password" required>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  value={forgotConfirm}
                  onChange={(e) => setForgotConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono">
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={handleSendResetOtp}
                className="text-primary hover:underline font-bold disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={() => { setForgotStep('email'); setError(''); }}
                className="text-tertiary hover:underline"
              >
                Change Email
              </button>
            </div>

            <ErrorText>{error}</ErrorText>

            <PrimaryButton type="submit" className="w-full tracking-wider" disabled={busy}>
              {busy ? 'RESETTING…' : 'CONFIRM NEW PASSWORD'}
              {!busy && <span className="material-symbols-outlined text-[20px]">lock_reset</span>}
            </PrimaryButton>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setSuccessMsg(''); }}
                className="font-mono text-label-md font-bold text-tertiary hover:text-on-surface underline underline-offset-4"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ---------------- Standard Login View ----------------
  return (
    <form className="space-y-4" onSubmit={submitLogin}>
      {successMsg && (
        <div className="p-3 bg-secondary-container/40 border border-tertiary/30 rounded font-mono text-label-sm text-on-secondary-container font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          {successMsg}
        </div>
      )}

      <Field label="Email or Username" required>
        <div className="relative">
          <Input
            type="text"
            autoComplete="username"
            placeholder="you@example.com or @username"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            required
          />
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-tertiary/50">
            <span className="material-symbols-outlined text-[18px]">alternate_email</span>
          </span>
        </div>
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-mono text-label-md font-bold text-on-surface uppercase tracking-wide">
            Password <span className="text-error">*</span>
          </label>
          <button
            type="button"
            onClick={() => { setIsForgot(true); setError(''); setSuccessMsg(''); setForgotEmail(form.identifier.includes('@') ? form.identifier : ''); }}
            className="font-mono text-[11px] font-bold text-primary hover:text-primary-container hover:underline"
          >
            Forgot Password?
          </button>
        </div>
        <PasswordInput
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <PixelCheckbox checked={remember} onChange={setRemember} label="Keep session connected" />
        <span className="font-mono text-label-sm text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded">Encrypted</span>
      </div>

      <ErrorText>{error}</ErrorText>

      <PrimaryButton type="submit" className="w-full tracking-wider" disabled={busy}>
        {busy ? 'ENTERING…' : 'ENTER PIXELTALK'}
        {!busy && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
      </PrimaryButton>

      <div className="mt-6 pt-4 border-t border-tertiary/15 text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          New here?
          <Link href="/register" className="font-mono text-label-md font-bold text-primary hover:text-primary-container underline decoration-tertiary/40 underline-offset-4 ml-1">
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}

export function SignupForm() {
  const { register } = useAuth();
  const { play } = useSound();
  const router = useRouter();

  // Registration step: 'details' -> 'verify_otp'
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '', avatarId: AVATAR_IDS[0] });
  const [unameStatus, setUnameStatus] = useState({ checking: false, available: null, message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Real-time username uniqueness debouncer
  useEffect(() => {
    const raw = form.username.trim().replace(/^@+/, '');
    if (!raw || raw.length < 3) {
      setUnameStatus({ checking: false, available: null, message: '' });
      return undefined;
    }
    const timer = setTimeout(async () => {
      setUnameStatus({ checking: true, available: null, message: 'Checking…' });
      try {
        const res = await userService.checkUsername(raw);
        if (res.available) {
          setUnameStatus({ checking: false, available: true, message: '✓ Username available' });
        } else {
          setUnameStatus({ checking: false, available: false, message: `✕ ${res.reason || 'Username taken'}` });
        }
      } catch {
        setUnameStatus({ checking: false, available: null, message: '' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.username]);

  // Step 1: Send verification OTP to email
  const handleProceedToOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (unameStatus.available === false) {
      setError('Please choose an available unique username.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setBusy(true);
    play('click');
    try {
      await authService.sendVerificationOtp({
        email: form.email,
        displayName: form.displayName,
      });
      play('success');
      setStep('verify_otp');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  // Resend Verification OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || busy) return;
    setError('');
    setBusy(true);
    play('click');
    try {
      await authService.sendVerificationOtp({
        email: form.email,
        displayName: form.displayName,
      });
      play('success');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Verify OTP & finalize user creation
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    setBusy(true);
    play('click');
    try {
      // 1. Verify submitted OTP against backend
      await authService.verifyEmailOtp({
        email: form.email,
        otp: otp.trim(),
      });
      // 2. Complete account registration
      await register(form);
      play('success');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      play('error');
    } finally {
      setBusy(false);
    }
  };

  // ---------------- Step 2: OTP Verification ----------------
  if (step === 'verify_otp') {
    return (
      <form className="space-y-4" onSubmit={handleVerifyAndRegister}>
        <div className="pb-3 border-b border-tertiary/20">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 bg-primary-container" />
            Step 2 of 2: Email Verification
          </div>
          <h2 className="font-display text-headline-sm font-bold text-on-surface">Check Your Inbox</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            We sent a 6-digit security code to <strong className="text-on-surface font-mono">{form.email}</strong> via PixelTalk mail.
          </p>
        </div>

        <Field label="6-Digit Verification Code" required hint="Check your inbox or spam folder">
          <Input
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="font-mono tracking-widest text-center text-headline-sm"
          />
        </Field>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <button
            type="button"
            disabled={cooldown > 0 || busy}
            onClick={handleResendOtp}
            className="text-primary hover:underline font-bold disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('details'); setError(''); }}
            className="text-tertiary hover:underline"
          >
            ← Edit Details
          </button>
        </div>

        <ErrorText>{error}</ErrorText>

        <PrimaryButton type="submit" className="w-full tracking-wider" disabled={busy}>
          {busy ? 'VERIFYING…' : 'VERIFY & LAUNCH ACCOUNT'}
          {!busy && <span className="material-symbols-outlined text-[20px]">rocket_launch</span>}
        </PrimaryButton>
      </form>
    );
  }

  // ---------------- Step 1: Initial Details ----------------
  return (
    <form className="space-y-4" onSubmit={handleProceedToOtp}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display name" required>
          <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Rahul" required maxLength={32} />
        </Field>
        <Field label="Username" required>
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="rahul_dev"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
          />
          {unameStatus.message && (
            <p className={`font-mono text-[11px] font-bold mt-1 ${unameStatus.available ? 'text-primary' : unameStatus.checking ? 'text-tertiary' : 'text-error'}`}>
              {unameStatus.message}
            </p>
          )}
        </Field>
      </div>

      <Field label="Email" required hint="We'll send an OTP verification code here">
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
      </Field>

      <Field label="Password" required hint="Minimum 8 characters.">
        <PasswordInput
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Create a password"
          required
          minLength={8}
        />
      </Field>

      <AvatarSelector value={form.avatarId} onChange={(avatarId) => setForm({ ...form, avatarId })} />

      <ErrorText>{error}</ErrorText>

      <PrimaryButton type="submit" className="w-full tracking-wider" disabled={busy}>
        {busy ? 'SENDING VERIFICATION…' : 'CONTINUE & VERIFY EMAIL'}
        {!busy && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
      </PrimaryButton>

      <div className="pt-2 text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?
          <Link href="/" className="font-mono text-label-md font-bold text-primary hover:text-primary-container underline decoration-tertiary/40 underline-offset-4 ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

/** 10 built-in avatar frames (stored as avatarId in MongoDB — never uploads). */
export function AvatarSelector({ value, onChange }) {
  return (
    <div>
      <label className="block font-mono text-label-md font-bold text-on-surface uppercase tracking-wide mb-1.5">
        Pick your avatar <span className="text-error">*</span>
      </label>
      <div className="grid grid-cols-5 gap-2">
        {AVATAR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={id}
            className={`relative p-1 rounded-lg border-[1.5px] transition-all press ${
              value === id ? 'border-primary-container bg-secondary-container/30 shadow-pixel-sm' : 'border-tertiary/25 hover:border-tertiary/50'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(id)} alt={id} className="w-full aspect-square rounded-md pixelated" />
            {value === id && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-container border border-surface-container" />}
          </button>
        ))}
      </div>
    </div>
  );
}
