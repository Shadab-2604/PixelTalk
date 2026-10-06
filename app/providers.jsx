/**
 * File: providers.jsx
 *
 * Responsibility:
 * Client-side React context provider root wrapping the application with `AuthProvider`.
 *
 * Layer:
 * Frontend / Providers
 *
 * Connected to:
 * - frontend/app/layout.jsx
 * - frontend/hooks/useAuth.jsx
 */

'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { CallProvider } from '@/features/calls/CallContext';
import { CallOverlay } from '@/features/calls/CallOverlay';

export function Providers({ children }) {
  return (
    <AuthProvider>
      <CallProvider>
        {children}
        <CallOverlay />
      </CallProvider>
    </AuthProvider>
  );
}
