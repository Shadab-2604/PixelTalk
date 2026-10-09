/**
 * Client-Side Message API Service
 *
 * Responsibility:
 * Centralized service for message history queries, cursor-based pagination,
 * sending, editing, and soft-deleting chat messages.
 *
 * CONNECTED MODULES:
 * - Features: frontend/features/messages/*
 * - Pages: frontend/app/chat/[conversationId]/page.jsx, frontend/app/rooms/[conversationId]/page.jsx
 * - Backend: backend/src/routes/index.js (/api/messages/*)
 * - Transport: frontend/lib/api.js
 */

import { get, post, patch, del, postFormData } from '@/lib/api';

export const messageService = {
  list: (conversationId, cursor, limit = 50) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return get(`/messages/${conversationId}${qs ? `?${qs}` : ''}`);
  },
  send: (payload) => post('/messages', payload),
  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const data = await postFormData('/messages/upload-media', formData);
    return data?.media || data;
  },
  markRead: (conversationId) => post(`/conversations/${conversationId}/read`),
  markUnread: (conversationId) => post(`/conversations/${conversationId}/unread`),
  edit: (id, content) => patch(`/messages/${id}`, { content }),
  remove: (id) => del(`/messages/${id}`),
  react: (id, emoji) => post(`/messages/${id}/react`, { emoji }),
};
