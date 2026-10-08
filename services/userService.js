/**
 * Client-Side User & Profile API Service
 *
 * Responsibility:
 * Centralized service for fetching the active user profile, mutating identity settings
 * (display name, bio, avatar, audio/notification preferences), checking username availability,
 * and toggling conversation pinning, muting, and vibration states.
 *
 * CONNECTED MODULES:
 * - Features: frontend/features/profile/*, frontend/features/settings/*
 * - Pages: frontend/app/profile/page.jsx, frontend/app/settings/page.jsx
 * - Backend: backend/src/routes/index.js (/api/users/*)
 * - Transport: frontend/lib/api.js
 */

import { get, patch, del, uploadForm } from '@/lib/api';

export const userService = {
  me: () => get('/users/me'),
  updateMe: (payload) => patch('/users/me', payload),
  updateProfile: (payload) => patch('/users/me', payload),
  changePassword: (payload) => patch('/users/me/password', payload),
  changeMyPassword: (payload) => patch('/users/me/password', payload),
  checkUsername: (username) => get(`/users/check-username?username=${encodeURIComponent(username)}`),
  togglePin: (conversationId) => patch(`/users/pin/${conversationId}`),
  toggleMute: (conversationId) => patch(`/users/mute/${conversationId}`),
  toggleVibrate: (conversationId) => patch(`/users/vibrate/${conversationId}`),
  getUser: (id) => get(`/users/${id}`),
  getUserByUsername: (username) => get(`/users/by-username/${encodeURIComponent(username)}`),
  getProfile: (idOrUsername) => get(`/users/${encodeURIComponent(idOrUsername)}`),
  search: (q) => get(`/users/search?q=${encodeURIComponent(q)}`),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return uploadForm('/users/me/avatar', formData);
  },
  deleteAvatar: () => del('/users/me/avatar'),
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append('banner', file);
    return uploadForm('/users/me/banner', formData);
  },
  deleteBanner: () => del('/users/me/banner'),
};
