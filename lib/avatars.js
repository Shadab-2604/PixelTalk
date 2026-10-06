/**
 * File: avatars.js
 *
 * Responsibility:
 * Generates handcrafted 16x16 pixel-art character avatars rendered as crisp SVG data URIs.
 * Maps stored `avatarId` identifiers (`avatar-01` through `avatar-10`) to scalable vector strings.
 *
 * Layer:
 * Frontend / UI Assets & Utilities
 *
 * Connected to:
 * - frontend/components/Avatar.jsx
 * - frontend/components/ui.jsx (AvatarSelector)
 * - frontend/lib/config.js (AVATAR_IDS)
 *
 * Important behavior:
 * - Employs raw SVG rect pixel rendering with crisp edges (`shape-rendering="crispEdges"`).
 * - Avoids external network requests for user avatars by bundling pixel assets inline.
 */

import { AVATAR_IDS, BANNER_IDS } from './config';

function px(x, y, w, h, c) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
}

const AVATAR_SVGS = {
  // avatar-01: Earth Scout (Brown hair, green headband, adventurer tunic)
  'avatar-01': `
    ${px(0, 0, 16, 16, '#FCECD8')}
    ${px(3, 1, 10, 3, '#6E3511')}
    ${px(2, 2, 2, 4, '#6E3511')}
    ${px(12, 2, 2, 4, '#6E3511')}
    ${px(3, 4, 10, 2, '#597928')}
    ${px(4, 6, 8, 6, '#E8B98A')}
    ${px(3, 6, 1, 3, '#6E3511')}
    ${px(12, 6, 1, 3, '#6E3511')}
    ${px(5, 7, 2, 2, '#221A0E')}
    ${px(9, 7, 2, 2, '#221A0E')}
    ${px(5, 7, 1, 1, '#FFFFFF')}
    ${px(9, 7, 1, 1, '#FFFFFF')}
    ${px(6, 10, 4, 1, '#B08050')}
    ${px(3, 12, 10, 4, '#597928')}
    ${px(6, 12, 4, 4, '#91AC67')}
  `,

  // avatar-02: Cyber Miner (Dark hooded cap, amber glowing cyber visor)
  'avatar-02': `
    ${px(0, 0, 16, 16, '#FFF2E2')}
    ${px(2, 1, 12, 4, '#221A0E')}
    ${px(1, 3, 3, 6, '#221A0E')}
    ${px(12, 3, 3, 6, '#221A0E')}
    ${px(4, 5, 8, 7, '#D9A06B')}
    ${px(3, 6, 10, 3, '#DFA035')}
    ${px(4, 7, 8, 1, '#FFF2E2')}
    ${px(6, 10, 4, 1, '#844721')}
    ${px(2, 12, 12, 4, '#6E3511')}
    ${px(5, 12, 6, 4, '#DFA035')}
  `,

  // avatar-03: Moss Knight (Emerald plate helmet with eye-slit)
  'avatar-03': `
    ${px(0, 0, 16, 16, '#F6E6D2')}
    ${px(3, 1, 10, 3, '#426010')}
    ${px(2, 3, 12, 8, '#597928')}
    ${px(3, 5, 10, 4, '#426010')}
    ${px(4, 6, 8, 2, '#121F00')}
    ${px(5, 6, 2, 2, '#AED376')}
    ${px(9, 6, 2, 2, '#AED376')}
    ${px(5, 10, 6, 1, '#AED376')}
    ${px(2, 12, 12, 4, '#426010')}
    ${px(4, 12, 8, 4, '#597928')}
    ${px(7, 13, 2, 3, '#AED376')}
  `,

  // avatar-04: Pixel Mage (Auburn hair, tall terracotta wizard cap)
  'avatar-04': `
    ${px(0, 0, 16, 16, '#FCECD8')}
    ${px(6, 0, 4, 2, '#844721')}
    ${px(5, 2, 6, 2, '#844721')}
    ${px(3, 4, 10, 2, '#844721')}
    ${px(2, 5, 12, 1, '#B84A39')}
    ${px(4, 6, 8, 6, '#F0C89B')}
    ${px(3, 6, 2, 5, '#844721')}
    ${px(11, 6, 2, 5, '#844721')}
    ${px(5, 8, 2, 2, '#6E3511')}
    ${px(9, 8, 2, 2, '#6E3511')}
    ${px(5, 8, 1, 1, '#FFFFFF')}
    ${px(9, 8, 1, 1, '#FFFFFF')}
    ${px(6, 11, 4, 1, '#B84A39')}
    ${px(3, 13, 10, 3, '#844721')}
    ${px(7, 13, 2, 2, '#FFB68F')}
  `,

  // avatar-05: DJ Beatbox (Beanie with over-ear green headphones)
  'avatar-05': `
    ${px(0, 0, 16, 16, '#FFF2E2')}
    ${px(4, 1, 8, 4, '#3B2412')}
    ${px(3, 4, 10, 2, '#546C2F')}
    ${px(4, 6, 8, 6, '#E8B98A')}
    ${px(1, 5, 3, 5, '#597928')}
    ${px(2, 6, 1, 3, '#91AC67')}
    ${px(12, 5, 3, 5, '#597928')}
    ${px(13, 6, 1, 3, '#91AC67')}
    ${px(4, 1, 8, 1, '#597928')}
    ${px(5, 7, 2, 2, '#221A0E')}
    ${px(9, 7, 2, 2, '#221A0E')}
    ${px(5, 7, 1, 1, '#FFFFFF')}
    ${px(9, 7, 1, 1, '#FFFFFF')}
    ${px(6, 10, 4, 1, '#3B2412')}
    ${px(3, 12, 10, 4, '#3B2412')}
    ${px(5, 12, 6, 4, '#91AC67')}
  `,

  // avatar-06: Grass Golem (Stone moss face, leaf sprout crown)
  'avatar-06': `
    ${px(0, 0, 16, 16, '#F0E0CD')}
    ${px(7, 1, 2, 2, '#597928')}
    ${px(5, 2, 2, 2, '#91AC67')}
    ${px(9, 2, 2, 2, '#91AC67')}
    ${px(3, 4, 10, 8, '#747969')}
    ${px(4, 5, 3, 2, '#91AC67')}
    ${px(9, 5, 2, 3, '#597928')}
    ${px(5, 7, 2, 2, '#D0EDA1')}
    ${px(9, 7, 2, 2, '#D0EDA1')}
    ${px(5, 10, 6, 1, '#382F22')}
    ${px(2, 12, 12, 4, '#546C2F')}
    ${px(4, 13, 8, 3, '#91AC67')}
  `,

  // avatar-07: Retro Pilot (Leather flight cap, brass goggles)
  'avatar-07': `
    ${px(0, 0, 16, 16, '#FCECD8')}
    ${px(3, 1, 10, 4, '#6E3511')}
    ${px(2, 4, 3, 7, '#6E3511')}
    ${px(11, 4, 3, 7, '#6E3511')}
    ${px(4, 4, 8, 2, '#DFA035')}
    ${px(4, 5, 3, 3, '#221A0E')}
    ${px(9, 5, 3, 3, '#221A0E')}
    ${px(5, 6, 1, 1, '#FFF8F3')}
    ${px(10, 6, 1, 1, '#FFF8F3')}
    ${px(4, 7, 8, 5, '#C68B59')}
    ${px(6, 10, 4, 1, '#6E3511')}
    ${px(3, 12, 10, 4, '#844721')}
    ${px(6, 12, 4, 4, '#DFA035')}
  `,

  // avatar-08: Forest Ranger (Bushy beard, ranger hat with feather)
  'avatar-08': `
    ${px(0, 0, 16, 16, '#FFF2E2')}
    ${px(11, 0, 2, 3, '#B84A39')}
    ${px(3, 2, 10, 3, '#597928')}
    ${px(1, 4, 14, 2, '#426010')}
    ${px(4, 6, 8, 4, '#F0C89B')}
    ${px(5, 7, 2, 2, '#221A0E')}
    ${px(9, 7, 2, 2, '#221A0E')}
    ${px(5, 7, 1, 1, '#FFFFFF')}
    ${px(9, 7, 1, 1, '#FFFFFF')}
    ${px(3, 9, 10, 4, '#8B5A2B')}
    ${px(6, 10, 4, 1, '#3B2412')}
    ${px(3, 13, 10, 3, '#597928')}
    ${px(6, 13, 4, 3, '#8B5A2B')}
  `,

  // avatar-09: Neon Ninja (Crimson mouth mask, dark shinobi headband)
  'avatar-09': `
    ${px(0, 0, 16, 16, '#F6E6D2')}
    ${px(3, 1, 10, 4, '#221A0E')}
    ${px(2, 3, 12, 2, '#B84A39')}
    ${px(7, 3, 2, 2, '#FFF8F3')}
    ${px(4, 5, 8, 4, '#E8B98A')}
    ${px(4, 6, 3, 2, '#221A0E')}
    ${px(9, 6, 3, 2, '#221A0E')}
    ${px(5, 6, 1, 1, '#FFFFFF')}
    ${px(10, 6, 1, 1, '#FFFFFF')}
    ${px(3, 8, 10, 5, '#B84A39')}
    ${px(6, 9, 4, 3, '#844721')}
    ${px(2, 12, 12, 4, '#221A0E')}
    ${px(5, 12, 6, 4, '#B84A39')}
  `,

  // avatar-10: Golden Admin (Royal golden crown, noble cloak)
  'avatar-10': `
    ${px(0, 0, 16, 16, '#F0E0CD')}
    ${px(3, 1, 2, 3, '#DFA035')}
    ${px(7, 0, 2, 4, '#DFA035')}
    ${px(11, 1, 2, 3, '#DFA035')}
    ${px(3, 3, 10, 2, '#DFA035')}
    ${px(4, 5, 8, 7, '#D9A06B')}
    ${px(2, 5, 2, 5, '#6E3511')}
    ${px(12, 5, 2, 5, '#6E3511')}
    ${px(5, 7, 2, 2, '#6E3511')}
    ${px(9, 7, 2, 2, '#6E3511')}
    ${px(5, 7, 1, 1, '#FFFFFF')}
    ${px(9, 7, 1, 1, '#FFFFFF')}
    ${px(6, 10, 4, 1, '#B08050')}
    ${px(2, 12, 12, 4, '#A25E37')}
    ${px(5, 12, 6, 4, '#DFA035')}
    ${px(7, 13, 2, 3, '#597928')}
  `,
};

function makeUri(svgBody) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${svgBody}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const CACHE = Object.fromEntries(
  AVATAR_IDS.map((id) => [id, makeUri(AVATAR_SVGS[id] || AVATAR_SVGS['avatar-01'])])
);

export const AVATAR_METADATA = [
  { id: 'avatar-01', name: 'Cozy Developer', tag: 'Builder' },
  { id: 'avatar-02', name: 'Tech Specialist', tag: 'Engineer' },
  { id: 'avatar-03', name: 'Synth Audio Eng', tag: 'Chiptune' },
  { id: 'avatar-04', name: 'Voxel Architect', tag: 'Creative' },
  { id: 'avatar-05', name: 'Cyber Frog Mage', tag: 'Admin' },
  { id: 'avatar-06', name: 'Sound Producer', tag: 'Audio' },
  { id: 'avatar-07', name: 'Robotic Sprite', tag: 'Android' },
  { id: 'avatar-08', name: 'Pixel Gardener', tag: 'Artisan' },
  { id: 'avatar-09', name: 'Synthwave Ninja', tag: 'Operator' },
  { id: 'avatar-10', name: 'Retro Gamer Boy', tag: 'Player' },
];

export function isAvatarId(id) {
  return AVATAR_IDS.includes(id);
}

export function avatarSrc(avatarId) {
  const validId = isAvatarId(avatarId) ? avatarId : 'avatar-01';
  return `/avatars/${validId}.png`;
}

export function getUserAvatar(user) {
  if (user?.avatarUrl) return user.avatarUrl;
  return avatarSrc(user?.avatarId);
}

export function isBannerId(id) {
  return BANNER_IDS.includes(id);
}

export function builtInBannerSrc(bannerId) {
  const validId = isBannerId(bannerId) ? bannerId : 'banner-01';
  return `/banners/${validId}.png`;
}

export function bannerSrc(bannerOrAvatarId) {
  if (isBannerId(bannerOrAvatarId)) return `/banners/${bannerOrAvatarId}.png`;
  const validId = isAvatarId(bannerOrAvatarId) ? bannerOrAvatarId : 'avatar-01';
  const num = validId.replace('avatar-', '');
  return `/banners/banner-${num}.png`;
}

/*
 * BANNER RESOLUTION PRIORITY
 *
 * WHAT: Resolves the display banner for any user profile or card.
 *
 * WHY / PRIORITY ORDER:
 * 1. Custom Cloudinary banner (user.bannerUrl): Highest priority, user's uploaded photo.
 * 2. Selected built-in PixelTalk banner (user.bannerId): Stored in database when chosen in Edit Banner.
 * 3. Fallback matching user's avatarId (e.g. avatar-03 -> banner-03): Keeps consistent retro theme.
 * 4. Default fallback: banner-01.png
 *
 * If a custom banner is deleted, user.bannerUrl is cleared, and this function seamlessly
 * falls back to the user's selected built-in banner without losing their preference.
 */
export function getUserBanner(user) {
  if (user?.bannerUrl) return user.bannerUrl;

  if (user?.bannerId && isBannerId(user.bannerId)) {
    return builtInBannerSrc(user.bannerId);
  }

  if (user?.avatarId && isAvatarId(user.avatarId)) {
    const num = user.avatarId.replace('avatar-', '');
    const mapped = `banner-${num}`;
    if (isBannerId(mapped)) return builtInBannerSrc(mapped);
  }

  return '/banners/banner-01.png';
}
