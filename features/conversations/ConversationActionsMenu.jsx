/**
 * File: ConversationActionsMenu.jsx
 *
 * Responsibility:
 * Centralized three-dot (⋮) options menu for direct chats and group lounges:
 * - Direct Chat actions: Open, Move to Folder, Mark as Read / Unread, Mute / Unmute, Pin / Unpin, Export (JSON), Clear Conversation, Delete Conversation
 * - Group Lounge actions: Open, Move to Folder, Mark as Read / Unread, Mute / Unmute, Pin / Unpin, Export (JSON), Clear Conversation, Leave Group (members), Delete Group (owners/admins)
 * - Move to Folder dialog with radio selector and inline "+ Create Folder"
 * - Confirmation dialogs for Clear, Delete, Leave, and Remove operations with user-specific isolation
 *
 * Layer:
 * Frontend / Conversation Features
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';
import { userService } from '@/services/userService';
import { chatSectionService } from '@/services/chatSectionService';
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  Spinner,
  Input,
  ErrorText,
} from '@/components/ui';
import { sfx } from '@/lib/sound';

export function ConversationActionsMenu({
  conversation,
  currentUser,
  onCleared,
  onDeleted,
  onSectionMoved,
  onToggledPin,
  onToggledMute,
  onToggledRead,
  className = '',
  buttonStyle = 'row', // 'row' (sidebar row 3-dots) | 'header' (chat header 3-dots) | 'panel' (inspector buttons)
}) {
  const router = useRouter();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Modals state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [deleteGroupModalOpen, setDeleteGroupModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  // Busy state indicators
  const [busyExport, setBusyExport] = useState(false);
  const [busyClear, setBusyClear] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyLeave, setBusyLeave] = useState(false);
  const [busyDeleteGroup, setBusyDeleteGroup] = useState(false);
  const [actionError, setActionError] = useState('');

  const conversationId = conversation?._id || conversation?.id;
  const isGroup = conversation?.type === 'group';
  const conversationName =
    conversation?.name || (isGroup ? 'Group Lounge' : 'Direct Conversation');

  const myIdStr = String(currentUser?._id || currentUser?.id || '');
  const creatorIdStr = String(
    conversation?.createdBy?._id || conversation?.createdBy || ''
  );
  const isOwner = myIdStr && creatorIdStr && myIdStr === creatorIdStr;
  const isAdmin = currentUser?.role === 'admin';

  const isPinned = useMemo(() => {
    if (conversation?.isPinned !== undefined) return Boolean(conversation.isPinned);
    const pinnedList = currentUser?.pinnedConversations || [];
    return pinnedList.some((id) => String(id?._id || id) === String(conversationId));
  }, [currentUser, conversationId, conversation?.isPinned]);

  const isMuted = useMemo(() => {
    const mutedList = currentUser?.mutedConversations || [];
    return mutedList.some((id) => String(id?._id || id) === String(conversationId));
  }, [currentUser, conversationId]);

  const unreadCount = Number(conversation?.unreadCount || 0);

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const targetHref = isGroup
    ? `/rooms/${conversationId}`
    : `/chat/${conversationId}`;

  // 1. Open Chat / Room Navigation
  const handleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    sfx.click();
    router.push(targetHref);
  };

  // 2. Toggle Pin
  const handleTogglePin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    sfx.click();
    try {
      await userService.togglePin(conversationId);
      onToggledPin?.(conversationId);
    } catch (err) {
      sfx.error();
    }
  };

  // 3. Toggle Mute
  const handleToggleMute = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    sfx.click();
    try {
      await userService.toggleMute(conversationId);
      onToggledMute?.(conversationId);
    } catch (err) {
      sfx.error();
    }
  };

  // 4. Toggle Read / Unread
  const handleToggleRead = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    sfx.click();
    try {
      if (unreadCount > 0) {
        await messageService.markRead(conversationId);
        onToggledRead?.(0);
      } else {
        await messageService.markUnread(conversationId);
        onToggledRead?.(1);
      }
    } catch (err) {
      sfx.error();
    }
  };

  // 5. Export Chat as JSON directly to the user's browser
  const handleExport = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  // 6. User-specific Clear Conversation
  const handleConfirmClear = async () => {
    if (!conversationId || busyClear) return;
    setBusyClear(true);
    setActionError('');
    try {
      await conversationService.clear(conversationId);
      sfx.success();
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

  // 7. User-specific Delete Direct Chat
  const handleConfirmDelete = async () => {
    if (!conversationId || busyDelete) return;
    setBusyDelete(true);
    setActionError('');
    try {
      await conversationService.deleteChat(conversationId);
      sfx.success();
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

  // 8. Leave Group
  const handleConfirmLeave = async () => {
    if (!conversationId || busyLeave) return;
    setBusyLeave(true);
    setActionError('');
    try {
      await conversationService.leave(conversationId);
      sfx.success();
      setLeaveModalOpen(false);
      setMenuOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/rooms');
      }
    } catch (err) {
      sfx.error();
      setActionError(err.message || 'Failed to leave group');
    } finally {
      setBusyLeave(false);
    }
  };

  // 9. Delete Group (Owner only)
  const handleConfirmDeleteGroup = async () => {
    if (!conversationId || busyDeleteGroup) return;
    setBusyDeleteGroup(true);
    setActionError('');
    try {
      await conversationService.remove(conversationId);
      sfx.success();
      setDeleteGroupModalOpen(false);
      setMenuOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/rooms');
      }
    } catch (err) {
      sfx.error();
      setActionError(err.message || 'Failed to delete room');
    } finally {
      setBusyDeleteGroup(false);
    }
  };

  return (
    <>
      {buttonStyle === 'row' ? (
        <div
          ref={menuRef}
          className={`relative inline-flex items-center ${className}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Three-dot Trigger Button: Desktop hover / Touch always visible */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            title="Options"
            aria-label={`Options for ${conversationName}`}
            aria-expanded={menuOpen}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-tertiary/70 hover:text-on-surface hover:bg-surface-container transition-all press shrink-0 ${
              menuOpen
                ? 'opacity-100 bg-surface-container text-on-surface'
                : 'max-md:opacity-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>

          {/* Context Dropdown Menu */}
          {menuOpen && (
            <>
              {/* Dismiss backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />

              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl bg-surface-container-lowest border-2 border-tertiary shadow-pixel-lg p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left select-none"
              >
                {/* Header title */}
                <div className="px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-tertiary truncate border-b border-tertiary/15 mb-1">
                  {conversationName}
                </div>

                {/* Section 1: Navigation */}
                <button
                  type="button"
                  onClick={handleOpen}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    {isGroup ? 'group' : 'forum'}
                  </span>
                  <span>{isGroup ? 'Open Lounge' : 'Open Chat'}</span>
                </button>

                {/* Section 2: Organization & Notification Preferences */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setMoveModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      folder
                    </span>
                    <span>Move to Folder</span>
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-tertiary/60">
                    chevron_right
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleRead}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    {unreadCount > 0 ? 'mark_chat_read' : 'mark_chat_unread'}
                  </span>
                  <span>{unreadCount > 0 ? 'Mark as Read' : 'Mark as Unread'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    {isMuted ? 'volume_up' : 'volume_off'}
                  </span>
                  <span>{isMuted ? 'Unmute' : 'Mute Notifications'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    {isPinned ? 'keep_off' : 'keep'}
                  </span>
                  <span>{isPinned ? 'Unpin Conversation' : 'Pin Conversation'}</span>
                </button>

                {/* Section 3: Utilities */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={busyExport}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-on-surface hover:bg-secondary-container/40 transition-colors press disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    {busyExport ? 'hourglass_top' : 'ios_share'}
                  </span>
                  <span>{busyExport ? 'Exporting…' : 'Export Chat (JSON)'}</span>
                </button>

                <div className="my-1 border-t border-tertiary/15" />

                {/* Section 4: Destructive / Danger Zone */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setClearModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    cleaning_services
                  </span>
                  <span>Clear Conversation</span>
                </button>

                {!isGroup ? (
                  /* Direct chat: Delete Conversation (User-Specific) */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      delete_forever
                    </span>
                    <span>Delete Conversation</span>
                  </button>
                ) : (
                  /* Group chat: Leave Group vs Delete Group */
                  <>
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(false);
                          setLeaveModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          logout
                        </span>
                        <span>Leave Group</span>
                      </button>
                    )}

                    {(isOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(false);
                          setDeleteGroupModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          delete_forever
                        </span>
                        <span>Delete Group</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ) : buttonStyle === 'header' ? (
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

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-1.5 z-40 w-56 rounded-xl bg-surface border-2 border-tertiary shadow-pixel-lg p-1.5 space-y-1 text-left">
                <div className="px-3 py-1 border-b border-tertiary/15 font-mono text-[10px] font-bold uppercase tracking-wider text-tertiary">
                  {conversationName}
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
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      folder
                    </span>
                    <span>Move to Folder</span>
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-tertiary/60">
                    chevron_right
                  </span>
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors press"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    cleaning_services
                  </span>
                  <span>Clear Conversation</span>
                </button>

                {!isGroup ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press"
                  >
                    <span className="material-symbols-outlined text-[16px] text-error">
                      delete_forever
                    </span>
                    <span>Delete Chat</span>
                  </button>
                ) : (
                  <>
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setLeaveModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          logout
                        </span>
                        <span>Leave Group</span>
                      </button>
                    )}
                    {(isOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setDeleteGroupModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-mono text-label-xs text-error hover:bg-error-container/30 transition-colors press font-bold"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          delete_forever
                        </span>
                        <span>Delete Group</span>
                      </button>
                    )}
                  </>
                )}
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
              <span className="material-symbols-outlined text-[16px] text-primary">
                folder
              </span>
              <span>Move to Folder</span>
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
              <span className="material-symbols-outlined text-[16px] text-amber-600">
                cleaning_services
              </span>
              <span>Clear Conversation</span>
            </button>

            {!isGroup ? (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-error-container/30 text-error border border-error/30 hover:bg-error-container/60 font-mono text-label-xs font-bold transition-all press"
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete_forever
                </span>
                <span>Delete Chat</span>
              </button>
            ) : (
              <>
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => setLeaveModalOpen(true)}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-error-container/30 text-error border border-error/30 hover:bg-error-container/60 font-mono text-label-xs font-bold transition-all press"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Leave Group</span>
                  </button>
                )}
                {(isOwner || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => setDeleteGroupModalOpen(true)}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-error-container/40 text-error border border-error/40 hover:bg-error-container/70 font-mono text-label-xs font-bold transition-all press"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      delete_forever
                    </span>
                    <span>Delete Group</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 1. CLEAR CONVERSATION CONFIRMATION MODAL ---------------- */}
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

          <div className="p-3 bg-secondary-container/30 border border-tertiary/20 rounded-xl space-y-1">
            <p className="font-mono text-[11px] text-tertiary">
              🛡️ <span className="font-bold">Safe Per-User Clear:</span> Only your local history window is cleared. Shared room data and other members’ messages remain completely intact.
            </p>
          </div>

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

      {/* ---------------- 2. DELETE DIRECT CHAT CONFIRMATION MODAL ---------------- */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !busyDelete && setDeleteModalOpen(false)}
        kicker="USER-SPECIFIC ACTION"
        title="Delete this chat?"
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
            This will remove the chat from your conversation list. It will not delete the conversation or history for other participants.
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

      {/* ---------------- 3. LEAVE GROUP CONFIRMATION MODAL ---------------- */}
      <Modal
        open={leaveModalOpen}
        onClose={() => !busyLeave && setLeaveModalOpen(false)}
        kicker="MEMBERSHIP ACTION"
        title={`Leave #${conversationName}?`}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
            Are you sure you want to leave this group lounge? You will no longer receive notifications or messages from this room.
          </p>

          <p className="font-mono text-[11px] text-tertiary">
            💡 You can rejoin later if the room is public or by receiving a new invitation.
          </p>

          {actionError && (
            <p className="font-mono text-label-xs text-error bg-error-container/40 p-2.5 rounded-lg border border-error/30">
              {actionError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
            <SecondaryButton
              type="button"
              disabled={busyLeave}
              onClick={() => setLeaveModalOpen(false)}
              className="px-4 py-2"
            >
              Cancel
            </SecondaryButton>

            <DestructiveButton
              type="button"
              disabled={busyLeave}
              onClick={handleConfirmLeave}
              className="px-4 py-2"
            >
              {busyLeave ? (
                <>
                  <Spinner className="w-4 h-4 mr-1.5" /> Leaving…
                </>
              ) : (
                'Leave Group'
              )}
            </DestructiveButton>
          </div>
        </div>
      </Modal>

      {/* ---------------- 4. DELETE GROUP ROOM CONFIRMATION MODAL (OWNER ONLY) ---------------- */}
      <Modal
        open={deleteGroupModalOpen}
        onClose={() => !busyDeleteGroup && setDeleteGroupModalOpen(false)}
        kicker="DESTRUCTIVE OWNER ACTION"
        title={`Delete #${conversationName}?`}
        maxW="max-w-md"
      >
        <div className="space-y-4">
          <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
            Are you sure you want to permanently delete <span className="font-bold text-on-surface">#{conversationName}</span>?
          </p>

          <div className="p-3 bg-error-container/30 border border-error/30 rounded-xl space-y-1">
            <p className="font-mono text-[11px] text-error font-bold">
              ⚠️ Warning: This will permanently delete the group room for all members. This operation cannot be undone.
            </p>
          </div>

          {actionError && (
            <p className="font-mono text-label-xs text-error bg-error-container/40 p-2.5 rounded-lg border border-error/30">
              {actionError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
            <SecondaryButton
              type="button"
              disabled={busyDeleteGroup}
              onClick={() => setDeleteGroupModalOpen(false)}
              className="px-4 py-2"
            >
              Cancel
            </SecondaryButton>

            <DestructiveButton
              type="button"
              disabled={busyDeleteGroup}
              onClick={handleConfirmDeleteGroup}
              className="px-4 py-2"
            >
              {busyDeleteGroup ? (
                <>
                  <Spinner className="w-4 h-4 mr-1.5" /> Deleting Room…
                </>
              ) : (
                'Delete Group'
              )}
            </DestructiveButton>
          </div>
        </div>
      </Modal>

      {/* ---------------- 5. MOVE TO SECTION / FOLDER MODAL ---------------- */}
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

function MoveToSectionModal({
  open,
  onClose,
  conversationId,
  currentSectionId,
  onMoved,
}) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState(
    currentSectionId || null
  );
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
            {/* Option: No Folder (Unfiled) */}
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
                  selectedSectionId === null
                    ? 'border-primary bg-primary'
                    : 'border-outline'
                }`}
              >
                {selectedSectionId === null && (
                  <span className="w-1.5 h-1.5 rounded-full bg-surface" />
                )}
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
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-surface" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Inline Create Folder */}
        {creating ? (
          <form
            onSubmit={handleCreateNewSection}
            className="p-3 bg-surface-container rounded-xl border border-tertiary/25 space-y-2.5"
          >
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
                <span className="material-symbols-outlined text-[14px] text-primary">
                  lock
                </span>
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
              <SecondaryButton
                type="button"
                onClick={() => setCreating(false)}
                className="px-2 text-label-xs"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                disabled={busyCreate || !newSectionName.trim()}
                className="px-3 text-label-xs"
              >
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
            <span className="material-symbols-outlined text-[16px]">
              create_new_folder
            </span>
            <span>+ Create Folder</span>
          </button>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tertiary/20">
          <SecondaryButton
            type="button"
            disabled={busyMove}
            onClick={onClose}
            className="px-4 py-2"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={busyMove || loading}
            onClick={handleSaveMove}
            className="px-4 py-2"
          >
            {busyMove ? 'Saving…' : 'Move to Folder'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
