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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const data = await authService.me();
      setUser(data.user);
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
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      router.push('/');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
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
