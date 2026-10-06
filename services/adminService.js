/**
 * Client-Side Administrative API Service
 *
 * Responsibility:
 * Centralized service for fetching system metrics, querying and moderating users,
 * managing group lounges, redacting messages, and inspecting audit logs.
 *
 * CONNECTED MODULES:
 * - Pages: frontend/app/admin/*
 * - Backend: backend/src/routes/index.js (/api/admin/*)
 * - Transport: frontend/lib/api.js
 */

import { get, patch, del } from '@/lib/api';

export const adminService = {
  stats: () => get('/admin/stats'),
  users: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return get(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  user: (id) => get(`/admin/users/${id}`),
  setUserStatus: (id, status) => patch(`/admin/users/${id}/status`, { status }),
  setUserRole: (id, role) => patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => del(`/admin/users/${id}`),
  groups: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return get(`/admin/groups${qs ? `?${qs}` : ''}`);
  },
  group: (id) => get(`/admin/groups/${id}`),
  deleteGroup: (id, restore = false) => del(`/admin/groups/${id}${restore ? '?restore=true' : ''}`),
  messages: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return get(`/admin/messages${qs ? `?${qs}` : ''}`);
  },
  deleteMessage: (id, reason) => del(`/admin/messages/${id}`, { body: JSON.stringify({ reason }) }),
  auditLogs: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
    return get(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
