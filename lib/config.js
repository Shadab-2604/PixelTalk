/**
 * File: config.js
 *
 * Responsibility:
 * Central configuration constants for the frontend application:
 * - API backend URL resolution
 * - Socket.IO server connection endpoint
 * - Available pixel avatar identifier catalog
 * - Semantic application release version
 *
 * Layer:
 * Frontend / Configuration
 *
 * Connected to:
 * - frontend/lib/api.js
 * - frontend/lib/socket.js
 * - frontend/lib/avatars.js
 * - frontend/components/TopBar.jsx
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
export const AVATAR_IDS = Array.from({ length: 10 }, (_, i) => `avatar-${String(i + 1).padStart(2, '0')}`);
export const BANNER_IDS = Array.from({ length: 10 }, (_, i) => `banner-${String(i + 1).padStart(2, '0')}`);
export const APP_VERSION = '1.0.4';
