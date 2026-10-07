/*
 * ============================================================
 * PIXELTALK — FRONTEND HTTP API CLIENT GATEWAY (api.js)
 * ============================================================
 *
 * WHAT:
 * This file is the central highway for all web network communication in PixelTalk.
 * It provides clean helper functions (get, post, patch, del, uploadForm) that
 * send requests from the browser to the Node.js / Express backend server.
 *
 * WHY:
 * Instead of repeating `fetch()` calls with headers, credentials, and error handling
 * inside every component, `api.js` centralizes token authentication cookies, JSON
 * body serialization, file upload handling, and error response formatting in one place.
 *
 * HOW IT WORKS:
 * 1. Attaches `credentials: 'include'` so HTTP-only JWT cookies travel automatically.
 * 2. Converts JavaScript objects into JSON format for POST/PATCH requests.
 * 3. Inspects response HTTP status codes (200 OK vs 400 Bad Request / 401 Unauthorized / 403 Forbidden).
 * 4. Unwraps backend `{ success: true, data: { ... } }` envelopes directly to callers.
 * 5. Throws structured Error objects containing exact server messages on failure.
 *
 * USED BY:
 * - frontend/services/authService.js (login, register, OTP verification)
 * - frontend/services/userService.js (profile update, Cloudinary image upload)
 * - frontend/services/conversationService.js (fetch chats, start DMs, room passcodes)
 * - frontend/services/messageService.js (load history, edit/delete message, media upload)
 * - frontend/services/adminService.js (analytics stats, player ban/unban)
 *
 * BACKEND ENDPOINT:
 * - Communicates with Express server endpoints under process.env.NEXT_PUBLIC_API_URL
 *   (e.g., http://localhost:5000/api)
 *
 * SECURITY & AUTH:
 * Includes HTTP-only session cookies automatically (`credentials: 'include'`).
 * Passwords, OTP codes, and file uploads are protected during transit via HTTPS.
 * ============================================================
 */

import { API_URL } from './config';

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  try {
    const token = localStorage.getItem('pixeltalk_token');
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    /* localStorage access blocked */
  }
  return {};
}

export async function api(path, { method = 'GET', body, headers, signal } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || (json && json.success === false)) {
    const err = new Error((json && json.message) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json ? json.data : {};
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body, opts) => api(path, { method: 'POST', body, ...opts });
export const patch = (path, body, opts) => api(path, { method: 'PATCH', body, ...opts });
export const del = (path, opts) => api(path, { method: 'DELETE', ...opts });

export async function uploadForm(path, formData, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || 'POST',
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...(opts.headers || {}),
    },
    body: formData,
    signal: opts.signal,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok || (json && json.success === false)) {
    const err = new Error((json && json.message) || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json ? json.data : {};
}

export const postFormData = uploadForm;
