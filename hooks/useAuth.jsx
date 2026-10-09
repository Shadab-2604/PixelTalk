/**
 * Authentication Context & Hook (useAuth)
 *
 * Responsibility:
 * Provides application-wide authenticated user state, session hydration from cookies,
 * login, registration, and logout actions.
 *
 * CONNECTED MODULES:
 * - Services: frontend/services/authService.js
 * - Components: frontend/components/AppShell.jsx, frontend/app/providers.jsx
 * - Features: frontend/features/auth/*
 *
 * CONCEPT: React Context Session Provider
 * Hydrates active user profile on initial application mount using `/api/auth/me`.
 * Preserves authentication state across client-side page transitions.
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { syncSocketAuth, disconnectSocket } from '@/lib/socket';
import { saveAccount, getSavedAccounts, removeSavedAccount, clearAllSavedAccounts, validateAccountSession } from '@/lib/accountSwitcher';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const data = await authService.me();
      setUser(data.user);
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('pixeltalk_token');
        if (token && data.user) {
          saveAccount({ user: data.user, token });
        }
      }
      syncSocketAuth();
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    const data = await authService.login(payload);
    if (data.token && typeof window !== 'undefined') {
      try {
        localStorage.setItem('pixeltalk_token', data.token);
        saveAccount({ user: data.user, token: data.token });
      } catch {}
    }
    setUser(data.user);
    syncSocketAuth(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    if (data.token && typeof window !== 'undefined') {
      try {
        localStorage.setItem('pixeltalk_token', data.token);
        saveAccount({ user: data.user, token: data.token });
      } catch {}
    }
    setUser(data.user);
    syncSocketAuth(data.token);
    return data.user;
  }, []);

  const switchActiveAccount = useCallback(async (targetUserId) => {
    const accounts = getSavedAccounts();
    const target = accounts.find((a) => String(a.id || a._id) === String(targetUserId));
    if (!target || !target.token) {
      throw new Error('Selected account session not found. Please log in again.');
    }

    try {
      // Validate session against backend before switching
      const validatedUser = await validateAccountSession(target.token);

      if (typeof window !== 'undefined') {
        localStorage.setItem('pixeltalk_token', target.token);
      }

      saveAccount({ user: validatedUser, token: target.token });
      setUser(validatedUser);
      syncSocketAuth(target.token);

      // Trigger custom event so any active chat caches can reset cleanly
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pixeltalk:account_switched', { detail: { user: validatedUser } }));
      }

      return validatedUser;
    } catch (err) {
      if (err.isSessionExpired) {
        removeSavedAccount(targetUserId);
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async (options = { removeFromSwitcher: true }) => {
    const currentUserId = user?._id || user?.id;
    try {
      await authService.logout();
    } finally {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('pixeltalk_token');
          if (options.removeFromSwitcher && currentUserId) {
            removeSavedAccount(currentUserId);
          }
        } catch {}
      }
      disconnectSocket();
      setUser(null);
      router.push('/');
    }
  }, [user, router]);

  const logoutAll = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      if (typeof window !== 'undefined') {
        clearAllSavedAccounts();
        try {
          localStorage.removeItem('pixeltalk_token');
        } catch {}
      }
      disconnectSocket();
      setUser(null);
      router.push('/');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      logoutAll,
      switchActiveAccount,
      refresh,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Client-side guard: redirects unauthenticated users to login. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);
  return { user, loading };
}

/** Admin guard: redirects non-admins to dashboard. */
export function useRequireAdmin() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.replace('/dashboard');
  }, [loading, user, router]);
  return { user, loading };
}
