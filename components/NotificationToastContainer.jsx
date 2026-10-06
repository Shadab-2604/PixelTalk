/**
 * In-App Notification Toast Container
 *
 * Responsibility:
 * Displays transient, clickable retro-styled toasts for incoming direct and group messages.
 * Navigates directly to the target conversation when clicked.
 *
 * CONNECTED MODULES:
 * - Services: frontend/services/notificationService.js (onInAppToast subscriber)
 * - Shell: frontend/components/AppShell.jsx
 *
 * CONCEPT: Reactive Event Decoupling
 * Components and socket listeners push notifications to `notificationService`, which
 * multicasts to this container via `onInAppToast` without requiring React prop drilling.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onInAppToast } from '@/services/notificationService';
import { Badge } from '@/components/ui';

export function NotificationToastContainer() {
  const [toasts, setToasts] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onInAppToast((toast) => {
      setToasts((prev) => [toast, ...prev.slice(0, 3)]); // Keep max 4 toasts
    });
    return unsub;
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastClick = (toast) => {
    removeToast(toast.id);
    if (toast.route) {
      router.push(toast.route);
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-18 right-4 z-[110] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClick={() => handleToastClick(toast)} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClick, onDismiss }) {
  const isInvitation = toast.type === 'invitation';
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const duration = isInvitation ? 25000 : 5500;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, isInvitation]);

  const handleAccept = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (toast.onAccept) await toast.onAccept(toast);
      onDismiss();
    } catch {
      setBusy(false);
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (toast.onReject) await toast.onReject(toast);
      onDismiss();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={!isInvitation ? onClick : undefined}
      className={`pointer-events-auto bg-surface-container-lowest border-2 rounded-xl p-3.5 shadow-pixel-md transition-all animate-toast-in flex items-start gap-3 group relative ${
        isInvitation ? 'border-primary ring-2 ring-primary/20' : 'border-tertiary hover:border-primary cursor-pointer'
      }`}
      role="alert"
    >
      {/* Sender Avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={toast.avatarUrl || '/avatars/avatar-01.png'}
        alt=""
        className="w-10 h-10 rounded-lg bg-surface-container border-2 border-tertiary pixelated shadow-pixel-xs shrink-0 mt-0.5 object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="font-display font-bold text-on-surface text-label-md truncate group-hover:text-primary transition-colors">
            {toast.senderName}
          </span>
          {toast.groupName && (
            <Badge tone="green" className="text-[10px] py-0 px-1.5 shrink-0 truncate max-w-[120px]">
              {toast.groupName}
            </Badge>
          )}
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{toast.preview}</p>

        {isInvitation && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-tertiary/15">
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy}
              className="px-3 py-1 bg-primary text-surface-container font-mono text-label-xs font-bold rounded-lg border border-tertiary shadow-pixel-xs hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 press disabled:opacity-50"
            >
              ACCEPT
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="px-3 py-1 bg-surface-container text-on-surface font-mono text-label-xs font-bold rounded-lg border border-tertiary/30 hover:bg-surface-container-high press disabled:opacity-50"
            >
              REJECT
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container shrink-0"
        title="Dismiss"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}
