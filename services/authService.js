/**
 * Client-Side Authentication API Service
 *
 * Responsibility:
 * Centralized service executing authentication and OTP HTTP operations.
 *
 * CONNECTED MODULES:
 * - Hooks: frontend/hooks/useAuth.jsx
 * - Components: frontend/features/auth/AuthForm.jsx
 * - Backend: backend/src/routes/index.js (/api/auth/*)
 * - Transport: frontend/lib/api.js
 */

import { get, post } from '@/lib/api';

export const authService = {
  register: (payload) => post('/auth/register', payload),
  login: (payload) => post('/auth/login', payload),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  changePassword: (payload) => post('/auth/change-password', payload),
  // OTP Auth Flow Helpers
  sendVerificationOtp: (payload) => post('/auth/otp/send-verification', payload),
  verifyEmailOtp: (payload) => post('/auth/otp/verify-email', payload),
  sendLoginOtp: (payload) => post('/auth/otp/send-login-code', payload),
  verifyLoginOtp: (payload) => post('/auth/otp/login', payload),
  sendPasswordResetOtp: (payload) => post('/auth/otp/send-password-reset', payload),
  resetPasswordWithOtp: (payload) => post('/auth/otp/reset-password', payload),
};
