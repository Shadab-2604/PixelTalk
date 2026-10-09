/**
 * File: useFloatingMenuPosition.js
 *
 * Responsibility:
 * Calculates viewport-aware floating coordinates for dropdowns, popovers, and context menus.
 * Automatically flips vertically (opens upward) when approaching the bottom of the viewport or
 * fixed containers (such as the bottom profile bar), aligns horizontally to prevent viewport edge
 * clipping, and continuously tracks window resizing and ancestor scroll events.
 *
 * Layer:
 * Frontend / UI Hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFloatingMenuPosition(isOpen, triggerRef, options = {}) {
  const {
    estimatedHeight = 350,
    menuWidth = 224,
    margin = 4,
    onClose = null,
  } = options;

  const [coords, setCoords] = useState({
    top: 'auto',
    bottom: 'auto',
    left: 'auto',
    right: 'auto',
    maxHeight: 380,
    placement: 'bottom',
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef?.current || typeof window === 'undefined') return;

    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger element has 0 dimensions or is detached
    if (rect.width === 0 && rect.height === 0) {
      onClose?.();
      return;
    }

    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Check if trigger is scrolled completely out of viewport
    if (rect.bottom < 0 || rect.top > viewportH) {
      onClose?.();
      return;
    }

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    // Decide vertical placement: flip to top if space below is insufficient and space above is greater
    const shouldOpenUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top = 'auto';
    let bottom = 'auto';
    let maxHeight = 380;
    let placement = 'bottom';

    if (shouldOpenUpward) {
      placement = 'top';
      bottom = `${Math.max(8, viewportH - rect.top + margin)}px`;
      maxHeight = Math.max(160, spaceAbove - 16);
    } else {
      placement = 'bottom';
      top = `${Math.max(8, rect.bottom + margin)}px`;
      maxHeight = Math.max(160, spaceBelow - 16);
    }

    // Horizontal placement: align right edge of menu with right edge of trigger
    let rightVal = viewportW - rect.right;
    let left = 'auto';
    let right = 'auto';

    if (rightVal < 8) {
      rightVal = 8;
    }

    if (viewportW - rightVal - menuWidth < 8) {
      // Menu extends past left edge of screen, clamp to left
      left = '8px';
      right = 'auto';
    } else {
      right = `${rightVal}px`;
      left = 'auto';
    }

    setCoords({
      top,
      bottom,
      left,
      right,
      maxHeight,
      placement,
    });
  }, [triggerRef, estimatedHeight, menuWidth, margin, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePosition();

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    // Use capture: true to catch scrolling in any ancestor container (such as sidebar scroll areas)
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  return { coords, updatePosition };
}
