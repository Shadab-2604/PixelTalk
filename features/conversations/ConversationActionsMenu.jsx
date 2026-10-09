/**
 * File: ConversationActionsMenu.jsx
 *
 * Responsibility:
 * Centralized conversation actions controls:
 * - Export Chat as sanitized JSON
 * - User-specific Clear Conversation (with PixelTalk confirmation dialog)
 * - User-specific Delete Chat (with PixelTalk confirmation dialog)
 *
 * Layer:
 * Frontend / Conversation Feature UI
 *
 * Connected to:
 * - frontend/services/conversationService.js
 * - frontend/components/ui.jsx (Modal, DestructiveButton, SecondaryButton, Spinner)
 * - frontend/app/chat/[conversationId]/page.jsx
 * - frontend/app/rooms/[conversationId]/page.jsx
 * - frontend/features/rooms/RoomMembersPanel.jsx
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { conversationService } from '@/services/conversationService';
import { chatSectionService } from '@/services/chatSectionService';
import { Modal, PrimaryButton, SecondaryButton, DestructiveButton, Spinner, Input, ErrorText } from '@/components/ui';
import { sfx } from '@/lib/sound';

export function ConversationActionsMenu({
  conversation,
  currentUser,
  onCleared,
  onDeleted,
  onSectionMoved,
  className = '',
  buttonStyle = 'header', // 'header' (compact dropdown) | 'panel' (full width buttons)
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [busyExport, setBusyExport] = useState(false);
  const [busyClear, setBusyClear] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [actionError, setActionError] = useState('');

  const conversationId = conversation?._id || conversation?.id;
  const conversationName = conversation?.name || (conversation?.type === 'direct' ? 'Direct-Chat' : 'Room');

  // 1. Export Chat as JSON directly to the user's browser
  const handleExport = async () => {
    if (!conversationId || busyExport) return;
    setBusyExport(true);
    setActionError('');
    try {
      sfx.click();
      const data = await conversationService.exportChat(conversationId);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const safeName = String(conversationName).replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `PixelTalk-${safeName}-${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      sfx.success();
      setMenuOpen(false);
    } catch (err) {
      sfx.error();
      setActionError(err.message || 'Export failed');
    } finally {
      setBusyExport(false);
    }
  };

  // 2. Clear Conversation for current user
  const handleConfirmClear = async () => {
    if (!conversationId || busyClear) return;
    setBusyClear(true);
    setActionError('');
    try {
      await conversationService.clear(conversationId);
      sfx.click();
      setClearModalOpen(false);
      setMenuOpen(false);
      onCleared?.();
    } catch (err) {
      sfx.error();
      setActionError(err.message || 'Failed to clear conversation');
    } finally {
      setBusyClear(false);
    }
  };

  // 3. Delete Chat for current user
  const handleConfirmDelete = async () => {
    if (!conversationId || busyDelete) return;
    setBusyDelete(true);
    setActionError('');
    try {
      await conversationService.deleteChat(conversationId);
      sfx.click();
      setDeleteModalOpen(false);
      setMenuOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      sfx.error();
      setActionError(err.message || 'Failed to delete chat');
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <>
      {buttonStyle === 'header' ? (
        <div className={`relative inline-block ${className}`}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            title="Chat Options"
            aria-label="Chat options menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-tertiary/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all press shadow-pixel-sm"
          >
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>

          {menuOpen && (
            <>
              {/* Dismiss backdrop */}
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />

              {/* PixelTalk Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1.5 z-40 w-56 rounded-xl bg-surface border-2 border-tertiary shadow-pixel-lg p-1.5 space-y-1">
                <div className="px-3 py-1 border-b border-tertiary/15 font-mono text-[10px] font-bold uppercase tracking-wider text-tertiary">
                  Conversation
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setMoveModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">folder</span>
                    <span>Move to Section</span>
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-tertiary/60">chevron_right</span>
                </button>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={busyExport}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    {busyExport ? 'hourglass_top' : 'ios_share'}
                  </span>
                  <span>{busyExport ? 'Exporting…' : 'Export Chat (JSON)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setClearModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">cleaning_services</span>
                  <span>Clear Conversation</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-error">delete_forever</span>
                  <span>Delete Chat</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Panel style for inspector sidebars */
        <div className={`space-y-2 pt-2 border-t border-tertiary/15 ${className}`}>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-tertiary px-1">
            <span>Chat Management</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => setMoveModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-label-xs font-bold transition-all press"
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary">folder</span>
              <span>Move to Section</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={busyExport}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-label-xs font-bold transition-all press disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary">
                {busyExport ? 'hourglass_top' : 'ios_share'}
              </span>
              <span>{busyExport ? 'Exporting…' : 'Export Chat (JSON)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setClearModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container border border-tertiary/20 hover:bg-secondary-container/40 text-on-surface font-mono text-label-xs font-bold transition-all press"
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary">cleaning_services</span>
              <span>Clear Conversation</span>
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-error-container/30 text-error border border-error/30 hover:bg-error-container/60 font-mono text-label-xs font-bold transition-all press"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              <span>Delete Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* CLEAR CONVERSATION CONFIRMATION MODAL */}
      <Modal
        open={clearModalOpen}
        onClose={() => !busyClear && setClearModalOpen(false)}
        kicker="USER-SPECIFIC ACTION"
        title="Clear conversation?"
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
            Your message history will be cleared from your view. Other participants will not be affected.
          </p>

          {actionError && (
            <p className="font-mono text-label-xs text-error bg-error-container/40 p-2.5 rounded-lg border border-error/30">
              {actionError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
            <SecondaryButton
              type="button"
              disabled={busyClear}
              onClick={() => setClearModalOpen(false)}
              className="px-4 py-2"
            >
              Cancel
            </SecondaryButton>

            <DestructiveButton
              type="button"
              disabled={busyClear}
              onClick={handleConfirmClear}
              className="px-4 py-2"
            >
              {busyClear ? (
                <>
                  <Spinner className="w-4 h-4 mr-1.5" /> Clearing…
                </>
              ) : (
                'Clear Conversation'
              )}
            </DestructiveButton>
          </div>
        </div>
      </Modal>

      {/* DELETE CHAT CONFIRMATION MODAL */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !busyDelete && setDeleteModalOpen(false)}
        kicker="USER-SPECIFIC ACTION"
        title="Delete this chat?"
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
            This will remove the chat from your conversation list. It will not delete the conversation for other participants.
          </p>

          {actionError && (
            <p className="font-mono text-label-xs text-error bg-error-container/40 p-2.5 rounded-lg border border-error/30">
              {actionError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
            <SecondaryButton
              type="button"
              disabled={busyDelete}
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2"
            >
              Cancel
            </SecondaryButton>

            <DestructiveButton
              type="button"
              disabled={busyDelete}
              onClick={handleConfirmDelete}
              className="px-4 py-2"
            >
              {busyDelete ? (
                <>
                  <Spinner className="w-4 h-4 mr-1.5" /> Deleting…
                </>
              ) : (
                'Delete Chat'
              )}
            </DestructiveButton>
          </div>
        </div>
      </Modal>

      {/* MOVE TO SECTION MODAL */}
      <MoveToSectionModal
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        conversationId={conversationId}
        currentSectionId={conversation?.sectionId || null}
        onMoved={(sectionId) => {
          onSectionMoved?.(sectionId);
          setMoveModalOpen(false);
        }}
      />
    </>
  );
}

function MoveToSectionModal({ open, onClose, conversationId, currentSectionId, onMoved }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState(currentSectionId || null);
  const [busyMove, setBusyMove] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [error, setError] = useState('');

  const loadSections = async () => {
    try {
      setLoading(true);
      const data = await chatSectionService.list();
      setSections(data.sections || []);
    } catch (err) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSections();
      setSelectedSectionId(currentSectionId || null);
      setCreating(false);
      setNewSectionName('');
      setIsLocked(false);
      setPasscode('');
      setError('');
    }
  }, [open, currentSectionId]);

  const handleCreateNewSection = async (e) => {
    e.preventDefault();
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    if (isLocked && (!passcode || passcode.length < 4)) {
      setError('Folder PIN/password must be at least 4 characters');
      return;
    }
    setBusyCreate(true);
    setError('');
    try {
      const data = await chatSectionService.create({
        name: trimmed,
        isLocked,
        passcode: isLocked ? passcode : '',
      });
      sfx.success();
      setSections((prev) => [...prev, data.section]);
      setSelectedSectionId(data.section._id);
      setNewSectionName('');
      setIsLocked(false);
      setPasscode('');
      setCreating(false);
    } catch (err) {
      sfx.error();
      setError(err.message || 'Failed to create folder');
    } finally {
      setBusyCreate(false);
    }
  };

  const handleSaveMove = async () => {
    if (!conversationId || busyMove) return;
    setBusyMove(true);
    setError('');
    try {
      await chatSectionService.moveConversation(conversationId, selectedSectionId);
      sfx.success();
      onMoved?.(selectedSectionId);
      onClose();
    } catch (err) {
      sfx.error();
      setError(err.message || 'Failed to move conversation');
    } finally {
      setBusyMove(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busyMove && onClose()}
      kicker="CHAT ORGANIZER"
      title="Move to Folder"
      maxW="max-w-md"
    >
      <div className="space-y-4">
        <p className="font-body-sm text-[12px] text-on-surface-variant">
          Organize this conversation into your personal chat folders. Folders are strictly private to your account.
        </p>

        {error && <ErrorText>{error}</ErrorText>}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {/* Option: No Folder */}
            <button
              type="button"
              onClick={() => setSelectedSectionId(null)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                selectedSectionId === null
                  ? 'border-primary bg-secondary-container/40 shadow-pixel-xs font-bold text-on-surface'
                  : 'border-tertiary/20 bg-surface hover:border-tertiary/60 text-on-surface-variant'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">folder_off</span>
                <span className="font-mono text-label-sm">No Folder (Unfiled)</span>
              </div>
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedSectionId === null ? 'border-primary bg-primary' : 'border-outline'
                }`}
              >
                {selectedSectionId === null && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
              </span>
            </button>

            {/* Custom user folders */}
            {sections.map((s) => {
              const isSelected = String(selectedSectionId) === String(s._id);
              const isSecLocked = s.isLocked || s.hasPasscode;
              return (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setSelectedSectionId(s._id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-secondary-container/40 shadow-pixel-xs font-bold text-on-surface'
                      : 'border-tertiary/20 bg-surface hover:border-tertiary/60 text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      {isSecLocked ? 'lock' : 'folder'}
                    </span>
                    <span className="font-mono text-label-sm">{s.name}</span>
                    {isSecLocked && (
                      <span className="text-[10px] font-mono font-bold text-tertiary bg-surface px-1.5 py-0.5 rounded border border-tertiary/20">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-outline'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-surface" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Inline Create Folder */}
        {creating ? (
          <form onSubmit={handleCreateNewSection} className="p-3 bg-surface-container rounded-xl border border-tertiary/25 space-y-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-tertiary block">
              New Folder Name
            </span>
            <Input
              autoFocus
              placeholder="e.g. Work, Friends, Private, Gaming"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              maxLength={40}
              className="py-1.5 text-label-sm"
            />

            <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-tertiary text-primary focus:ring-primary"
              />
              <span className="font-mono text-[11px] font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                <span>Lock with PIN / Password</span>
              </span>
            </label>

            {isLocked && (
              <Input
                type="password"
                placeholder="Enter PIN (min 4 chars)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                minLength={4}
                maxLength={32}
                className="py-1 text-label-xs font-mono"
              />
            )}

            <div className="flex justify-end gap-2 pt-1">
              <SecondaryButton type="button" onClick={() => setCreating(false)} className="px-2 text-label-xs">
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={busyCreate || !newSectionName.trim()} className="px-3 text-label-xs">
                {busyCreate ? '…' : 'Create & Select'}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-tertiary/40 bg-surface text-tertiary font-mono text-label-xs font-bold hover:bg-surface-container transition-all press"
          >
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
            <span>+ Create Folder</span>
          </button>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
          <SecondaryButton type="button" disabled={busyMove} onClick={onClose} className="px-4 py-2">
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" disabled={busyMove || loading} onClick={handleSaveMove} className="px-4 py-2">
            {busyMove ? 'Saving…' : 'Move to Folder'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
