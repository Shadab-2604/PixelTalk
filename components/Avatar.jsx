/**
 * File: Avatar.jsx
 *
 * Responsibility:
 * Renders retro pixel character avatars with optional online presence badges and borders.
 * Catalog of named pixel avatars for user profiles and team members.
 *
 * Layer:
 * Frontend / UI Components
 *
 * Connected to:
 * - frontend/lib/avatars.js
 * - frontend/lib/config.js
 * - frontend/components/ui.jsx
 */

'use client';

import { AVATAR_IDS } from '@/lib/config';
import { avatarSrc } from '@/lib/avatars';

export const AVATARS = [
  { id: 'avatar-01', name: 'Earth Scout' },
  { id: 'avatar-02', name: 'Cyber Miner' },
  { id: 'avatar-03', name: 'Moss Knight' },
  { id: 'avatar-04', name: 'Pixel Mage' },
  { id: 'avatar-05', name: 'DJ Beatbox' },
  { id: 'avatar-06', name: 'Grass Golem' },
  { id: 'avatar-07', name: 'Retro Pilot' },
  { id: 'avatar-08', name: 'Forest Ranger' },
  { id: 'avatar-09', name: 'Neon Ninja' },
  { id: 'avatar-10', name: 'Golden Admin' },
];

export function PixelAvatar({ avatarId = 'avatar-01', avatarUrl, size = 48, presence, className = '' }) {
  const src = avatarUrl || avatarSrc(avatarId);
  const isOnline = presence === 'online';

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={avatarId}
        width={size}
        height={size}
        className={`w-full h-full rounded-lg bg-surface-container border border-tertiary/30 shadow-pixel-sm ${avatarUrl ? 'object-cover' : 'pixelated'}`}
        style={avatarUrl ? {} : { imageRendering: 'pixelated' }}
      />
      {presence && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
            isOnline ? 'bg-primary-container' : 'bg-tertiary/40'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

export { Avatar } from '@/components/ui';
