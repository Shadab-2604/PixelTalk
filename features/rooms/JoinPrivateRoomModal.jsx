/**
 * File: JoinPrivateRoomModal.jsx
 *
 * Responsibility:
 * Viewport portal modal dialog prompting users for a room passcode when attempting
 * to enter a protected group lounge.
 *
 * Layer:
 * Frontend / Rooms Feature UI
 *
 * Connected to:
 * - frontend/app/rooms/page.jsx
 * - frontend/services/conversationService.js
 * - frontend/components/ui.jsx (Modal portal)
 */

'use client';

import { useState } from 'react';
import { conversationService } from '@/services/conversationService';
import { Modal, PrimaryButton, PasswordInput, Field, ErrorText } from '@/components/ui';
export function JoinPrivateRoomModal({ open, onClose, conversation, onJoined }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!conversation) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await conversationService.join(conversation._id || conversation.id, passcode);
      onJoined?.(data.conversation || conversation);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} kicker="PRIVATE ROOM" title={`Join “${conversation.name}”`} maxW="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <p className="font-body-md text-body-md text-on-surface-variant">
          This room is passcode protected. Ask a member for the passcode to get in.
        </p>
        <Field label="Passcode" required>
          <PasswordInput value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Room passcode" required autoFocus minLength={4} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border-[1.5px] border-tertiary/40 font-mono text-label-md text-tertiary hover:bg-surface-variant press">
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'JOINING…' : 'JOIN ROOM'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
