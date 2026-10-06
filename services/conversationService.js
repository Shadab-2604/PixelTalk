/**
 * Client-Side Conversation & Room API Service
 *
 * Responsibility:
 * Centralized service for inbox fetching, public room discovery, idempotent direct chat
 * creation, room settings mutation, passcode submission, and membership administration.
 *
 * CONNECTED MODULES:
 * - Features: frontend/features/conversations/*, frontend/features/rooms/*
 * - Pages: frontend/app/dashboard/page.jsx, frontend/app/rooms/page.jsx
 * - Backend: backend/src/routes/index.js (/api/conversations/*)
 * - Transport: frontend/lib/api.js
 */

import { get, post, patch, del, postFormData } from '@/lib/api';

export const conversationService = {
  list: () => get('/conversations'),
  search: (q) => get(`/conversations/search?q=${encodeURIComponent(q)}`),
  get: (id) => get(`/conversations/${id}`),
  startDirect: (userId) => post('/conversations/direct', { userId }),
  createGroup: (payload) => post('/conversations/groups', payload),
  updateSettings: (id, payload) => patch(`/conversations/${id}/settings`, payload),
  getMembers: (id) => get(`/conversations/${id}/members`),
  updateMemberRole: (id, userId, role) => patch(`/conversations/${id}/members/${userId}`, { role }),
  addMembers: (id, userIds) => post(`/conversations/${id}/members`, { userIds }),
  removeMember: (id, userId) => del(`/conversations/${id}/members/${userId}`),
  pin: (id) => post(`/conversations/${id}/pin`),
  join: (id, passcode) => post(`/conversations/${id}/join`, { passcode }),
  leave: (id) => post(`/conversations/${id}/leave`),
  remove: (id) => del(`/conversations/${id}`),
  clear: (id) => post(`/conversations/${id}/clear`),
  deleteChat: (id) => post(`/conversations/${id}/delete-chat`),
  exportChat: (id) => get(`/conversations/${id}/export`),
  // Master Group Management extensions
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return postFormData('/conversations/upload-avatar', formData);
  },
  inviteMembers: (id, userIds) => post(`/conversations/${id}/invitations`, { userIds }),
  getMyInvitations: () => get('/conversations/invitations/my'),
  getGroupInvitations: (id) => get(`/conversations/${id}/invitations`),
  respondToInvitation: (id, action) => post(`/conversations/invitations/${id}/respond`, { action }),
};
