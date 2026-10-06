/**
 * File: format.js
 *
 * Responsibility:
 * Date, timestamp, relative time, and string formatting utilities tailored
 * for retro chat messages, message grouping dividers, and user lists.
 *
 * Layer:
 * Frontend / Utility
 *
 * Connected to:
 * - frontend/features/messages/MessageList.jsx
 * - frontend/features/conversations/ConversationSidebar.jsx
 * - frontend/app/dashboard/page.jsx
 */

/**
 * Formats an ISO date string into a localized 12/24h short time (e.g. "3:45 PM").
 *
 * @param {string|Date} iso - ISO date string or Date object.
 * @returns {string} Formatted short time.
 */
export function timeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export function dateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
