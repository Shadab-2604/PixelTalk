/**
 * File: NewConversationModal.jsx
 *
 * Responsibility:
 * Modal launcher delegating to `StartChatModal` for initiating direct player messaging.
 *
 * Layer:
 * Frontend / Conversation Features
 *
 * Connected to:
 * - frontend/components/AppShell.jsx
 * - frontend/features/conversations/ConversationSidebar.jsx
 */

'use client';

import { StartChatModal } from './ConversationSidebar';
import { CreateRoomModal } from '@/features/rooms/CreateRoomModal';
export function NewConversationModal({ open, onClose, onDone }) {
  if (!open) return null;
  return (
    <>
      <StartChatModal
        onClose={onClose}
        onCreated={(conversation) => {
          onDone?.(conversation);
          onClose();
        }}
      />
      {/* Accessible via Create Room in TopBar; kept out of this modal flow. */}
      {false && <CreateRoomModal open={false} onClose={() => {}} />}
    </>
  );
}
