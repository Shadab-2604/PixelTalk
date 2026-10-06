/**
 * Chat Section Service
 *
 * Client API methods for personal conversation folders/sections:
 * - listing, creating, renaming, deleting, and reordering personal sections
 * - moving conversations into/between sections
 */

import { get, post, patch, del } from '@/lib/api';

export const chatSectionService = {
  list: () => get('/chat-sections'),
  create: (name) => post('/chat-sections', { name }),
  rename: (sectionId, name) => patch(`/chat-sections/${sectionId}`, { name }),
  delete: (sectionId) => del(`/chat-sections/${sectionId}`),
  reorder: (orderedIds) => post('/chat-sections/reorder', { orderedIds }),
  moveConversation: (conversationId, sectionId) =>
    post(`/conversations/${conversationId}/move-section`, { sectionId }),
};
