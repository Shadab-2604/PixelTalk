/**
 * Multi-Account Session Registry & Switcher Manager (frontend/lib/accountSwitcher.js)
 *
 * Responsibility:
 * Securely manages multiple saved user identities in the current browser session,
 * enabling instantaneous account switching without credential leakage or password storage.
 *
 * CONNECTED MODULES:
 * - Auth Context: frontend/hooks/useAuth.jsx
 * - Sockets: frontend/lib/socket.js
 * - UI: frontend/features/auth/AccountSwitcherModal.jsx, frontend/components/TopBar.jsx
 */

import { API_URL } from './config';

const STORAGE_KEY = 'pixeltalk_saved_accounts';

/**
 * Retrieves all registered saved accounts from local session storage.
 */
export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates an authenticated account in the registry.
 */
export function saveAccount({ user, token }) {
  if (typeof window === 'undefined' || !user || !token) return;
  try {
    const accounts = getSavedAccounts();
    const userId = String(user._id || user.id);

    const updatedAccount = {
      id: userId,
      _id: userId,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarId: user.avatarId,
      avatarUrl: user.avatarUrl || '',
      role: user.role || 'user',
      token,
      lastActiveAt: Date.now(),
      addedAt: Date.now(),
    };

    const existingIndex = accounts.findIndex((a) => String(a.id || a._id) === userId);
    if (existingIndex >= 0) {
      accounts[existingIndex] = {
        ...accounts[existingIndex],
        ...updatedAccount,
        addedAt: accounts[existingIndex].addedAt || Date.now(),
      };
    } else {
      accounts.push(updatedAccount);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('[accountSwitcher] saveAccount notice:', err.message);
  }
}

/**
 * Removes a saved account from the local switcher registry.
 */
export function removeSavedAccount(userId) {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const accounts = getSavedAccounts();
    const filtered = accounts.filter((a) => String(a.id || a._id) !== String(userId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}

/**
 * Clears all saved accounts from the local switcher registry.
 */
export function clearAllSavedAccounts() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Validates a saved account's token against the backend /api/auth/me endpoint.
 */
export async function validateAccountSession(token) {
  if (!token) throw new Error('No authentication token provided');

  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || (json && json.success === false)) {
    const err = new Error(json?.message || `Session validation failed (${res.status})`);
    err.status = res.status;
    err.isSessionExpired = res.status === 401 || res.status === 403;
    throw err;
  }

  return json?.data?.user;
}
