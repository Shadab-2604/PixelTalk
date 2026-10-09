/**
 * Multi-Account Switcher Modal (features/auth/AccountSwitcherModal.jsx)
 *
 * Responsibility:
 * Displays all saved user accounts in the current browser session, allows one-click switching
 * with genuine backend session validation, account addition, removal, and unified logout.
 *
 * CONNECTED MODULES:
 * - Auth Context: frontend/hooks/useAuth.jsx
 * - Lib: frontend/lib/accountSwitcher.js, frontend/lib/avatars.js
 * - UI: frontend/components/ui
 * - Add Modal: frontend/features/auth/AddAccountModal.jsx
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSavedAccounts, removeSavedAccount } from '@/lib/accountSwitcher';
import { Avatar, Badge } from '@/components/ui';
import { getUserAvatar } from '@/lib/avatars';
import { AddAccountModal } from './AddAccountModal';

export function AccountSwitcherModal({ isOpen, onClose }) {
  const { user, switchActiveAccount, logout, logoutAll } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [switchingId, setSwitchingId] = useState(null);
  const [error, setError] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const refreshAccounts = useCallback(() => {
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshAccounts();
      setError(null);
    }
  }, [isOpen, refreshAccounts]);

  if (!isOpen) return null;

  const currentUserId = String(user?._id || user?.id || '');

  const handleSwitch = async (targetAccount) => {
    const targetId = String(targetAccount.id || targetAccount._id);
    if (targetId === currentUserId) return;

    setSwitchingId(targetId);
    setError(null);

    try {
      await switchActiveAccount(targetId);
      refreshAccounts();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to switch account. Session may have expired.');
      refreshAccounts();
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRemove = (e, targetId) => {
    e.stopPropagation();
    removeSavedAccount(targetId);
    refreshAccounts();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-sm animate-fade-in">
        <div
          className="w-full max-w-md bg-surface-container-lowest border-[2px] border-tertiary rounded-2xl shadow-pixel-xl flex flex-col overflow-hidden animate-scale-in"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-surface-container border-b-[2px] border-tertiary/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-primary-container text-surface-container rounded-lg border border-tertiary shadow-pixel-sm">
                <span className="material-symbols-outlined text-[18px]">switch_account</span>
              </span>
              <div>
                <h2 className="font-display text-title-md font-bold text-on-surface">Switch Account</h2>
                <p className="font-mono text-[11px] text-tertiary">Manage & switch multiple accounts</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-tertiary/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Account List */}
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-error-container/40 border border-error/30 rounded-xl flex items-center gap-2 text-error text-[12px] font-medium">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              {savedAccounts.length === 0 && user && (
                <AccountRow
                  account={{
                    id: currentUserId,
                    _id: currentUserId,
                    username: user.username,
                    displayName: user.displayName,
                    avatarId: user.avatarId,
                    avatarUrl: user.avatarUrl,
                  }}
                  isActive
                />
              )}

              {savedAccounts.map((acc) => {
                const accId = String(acc.id || acc._id);
                const isActive = accId === currentUserId;
                const isSwitching = switchingId === accId;

                return (
                  <AccountRow
                    key={accId}
                    account={acc}
                    isActive={isActive}
                    isSwitching={isSwitching}
                    onSwitch={() => handleSwitch(acc)}
                    onRemove={(e) => handleRemove(e, accId)}
                  />
                );
              })}
            </div>

            {/* Add Account Button */}
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-container-low hover:bg-surface-container border-[1.5px] border-dashed border-tertiary/40 hover:border-tertiary rounded-xl font-mono text-[13px] font-bold text-on-surface transition-all cursor-pointer shadow-pixel-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
              <span>+ Add Another Account</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-surface-container border-t border-tertiary/20 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                logout({ removeFromSwitcher: true });
              }}
              className="text-[12px] font-mono font-bold text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Log out active</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                logoutAll();
              }}
              className="text-[12px] font-mono font-bold text-error/90 hover:text-error transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
              <span>Log out all</span>
            </button>
          </div>
        </div>
      </div>

      <AddAccountModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAccountAdded={() => {
          refreshAccounts();
          onClose();
        }}
      />
    </>
  );
}

function AccountRow({ account, isActive, isSwitching, onSwitch, onRemove }) {
  return (
    <div
      onClick={!isActive && !isSwitching ? onSwitch : undefined}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        isActive
          ? 'bg-secondary-container/30 border-primary/40 shadow-pixel-sm'
          : 'bg-surface-container-low border-tertiary/20 hover:bg-surface-container hover:border-tertiary/40 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <Avatar src={getUserAvatar(account)} alt={account.displayName || account.username} size={40} online={isActive} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-[13px] font-bold text-on-surface truncate">
              {account.displayName || account.username}
            </p>
            {isActive && (
              <Badge tone="deep" className="text-[10px] px-1.5 py-0">
                Active ✓
              </Badge>
            )}
          </div>
          <p className="font-mono text-[11px] text-tertiary truncate">@{account.username}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isSwitching ? (
          <span className="font-mono text-[11px] text-primary font-bold animate-pulse flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>Switching...</span>
          </span>
        ) : !isActive ? (
          <>
            <button
              type="button"
              onClick={onSwitch}
              className="px-2.5 py-1 bg-primary text-on-primary font-mono text-[11px] font-bold rounded-lg border border-tertiary shadow-pixel-sm hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
              title="Remove from saved accounts"
              aria-label="Remove account"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
