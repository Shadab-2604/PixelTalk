/**
 * Chat Section / Folder Service
 *
 * Client API methods for personal conversation folders/sections:
 * - listing, creating, renaming, deleting, and reordering personal folders
 * - locking, unlocking, and changing/removing PINs/passcodes
 * - moving conversations into/between folders
 */

import { get, post, patch, del } from '@/lib/api';

export const chatSectionService = {
  list: () => get('/chat-sections'),
  create: ({ name, isLocked = false, passcode = '' }) =>
    post('/chat-sections', { name, isLocked, passcode }),
  rename: (sectionId, name) => patch(`/chat-sections/${sectionId}`, { name }),
  unlock: (sectionId, passcode) => post(`/chat-sections/${sectionId}/unlock`, { passcode }),
  setLock: (sectionId, { currentPasscode = '', newPasscode }) =>
    post(`/chat-sections/${sectionId}/lock`, { currentPasscode, newPasscode }),
  removeLock: (sectionId, currentPasscode = '') =>
    post(`/chat-sections/${sectionId}/remove-lock`, { currentPasscode }),
  delete: (sectionId) => del(`/chat-sections/${sectionId}`),
  reorder: (orderedIds) => post('/chat-sections/reorder', { orderedIds }),
  moveConversation: (conversationId, sectionId) =>
    post(`/conversations/${conversationId}/move-section`, { sectionId }),
};
