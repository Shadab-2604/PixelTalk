/**
 * MediaLightBoxModal — Modern Full-Screen Image Lightbox with Thumbnail Carousel
 *
 * Inspired by WhatsApp Web Image Viewer:
 * - Top bar: Sender avatar, name, timestamp, zoom/rotate/download/close controls.
 * - Main viewport: Centered image with pan & zoom, left/right navigation chevrons.
 * - Bottom strip: Scrollable thumbnail carousel of all media items in the conversation.
 * - Keyboard navigation: Left/Right arrows for previous/next photo, Escape to exit.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { getUserAvatar } from '@/lib/avatars';
import { timeShort, dayLabel } from '@/lib/format';

export function MediaLightBoxModal({
  open,
  onClose,
  media,
  allMedia = [],
  onSelectMedia,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeIndex = allMedia.findIndex(
    (m) => (m.id && m.id === media?.id) || m.url === media?.url
  );

  const activeItem = activeIndex !== -1 ? allMedia[activeIndex] : media;

  // Reset transforms on media change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [media?.url, activeIndex]);

  // Keyboard shortcut handlers
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (activeIndex > 0 && allMedia[activeIndex - 1]) {
          onSelectMedia?.(allMedia[activeIndex - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        if (activeIndex < allMedia.length - 1 && allMedia[activeIndex + 1]) {
          onSelectMedia?.(allMedia[activeIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, activeIndex, allMedia, onSelectMedia]);

  if (!open || !activeItem) return null;

  const currentUrl = activeItem.url || activeItem.mediaUrl || '';

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUrl) return;
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = activeItem.fileName || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(currentUrl, '_blank');
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const formattedDate = activeItem.createdAt
    ? `${dayLabel(activeItem.createdAt)} at ${timeShort(activeItem.createdAt)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e14]/95 backdrop-blur-md select-none animate-fadeIn">
      {/* 1. TOP HEADER BAR */}
      <div className="h-16 px-6 bg-black/40 border-b border-white/10 flex items-center justify-between text-white shrink-0 z-20">
        {/* Sender Info */}
        <div className="flex items-center gap-3 min-w-0 pr-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getUserAvatar(activeItem.senderAvatar || activeItem.senderId)}
            alt=""
            className="w-10 h-10 rounded-lg border border-white/20 bg-surface-variant pixelated object-cover shrink-0"
          />
          <div className="min-w-0 font-mono">
            <p className="text-label-md font-bold truncate text-white">
              {activeItem.senderName || 'Player'}
            </p>
            {formattedDate && (
              <p className="text-[11px] text-white/60 truncate">{formattedDate}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-all"
            title="Zoom Out"
            disabled={zoom <= 0.5}
          >
            <span className="material-symbols-outlined text-[20px]">zoom_out</span>
          </button>

          <span className="font-mono text-label-xs font-bold text-white/70 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-all"
            title="Zoom In"
            disabled={zoom >= 3.5}
          >
            <span className="material-symbols-outlined text-[20px]">zoom_in</span>
          </button>

          <button
            onClick={handleRotate}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-all"
            title="Rotate 90 degrees"
          >
            <span className="material-symbols-outlined text-[20px]">rotate_right</span>
          </button>

          <div className="w-[1px] h-6 bg-white/20 mx-1" />

          <button
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-lg bg-primary-container text-surface-container font-mono text-label-sm font-bold border border-tertiary shadow-pixel-sm-solid hover:brightness-110 flex items-center gap-1.5 transition-all"
            title="Download original image"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download</span>
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 transition-all ml-1"
            title="Close viewer (Esc)"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN IMAGE VIEWPORT */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
      >
        {/* Navigation Chevron Left */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMedia?.(allMedia[activeIndex - 1]);
            }}
            className="absolute left-6 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-105"
            title="Previous photo (←)"
          >
            <span className="material-symbols-outlined text-[32px]">chevron_left</span>
          </button>
        )}

        {/* Main Image */}
        <div
          className="transition-transform duration-100 ease-out flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={activeItem.fileName || 'Photo'}
            className="max-w-[85vw] max-h-[72vh] object-contain rounded-xl shadow-2xl pointer-events-none border border-white/10"
          />
        </div>

        {/* Navigation Chevron Right */}
        {activeIndex < allMedia.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMedia?.(allMedia[activeIndex + 1]);
            }}
            className="absolute right-6 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 shadow-2xl transition-all hover:scale-105"
            title="Next photo (→)"
          >
            <span className="material-symbols-outlined text-[32px]">chevron_right</span>
          </button>
        )}
      </div>

      {/* 3. BOTTOM THUMBNAIL CAROUSEL STRIP */}
      {allMedia.length > 0 && (
        <div className="h-24 bg-black/60 border-t border-white/10 px-4 flex items-center justify-center shrink-0 z-20 overflow-x-auto py-2">
          <div className="flex items-center gap-2 max-w-full overflow-x-auto px-2 py-1 scrollbar-thin">
            {allMedia.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const itemUrl = item.url || item.mediaUrl || '';
              return (
                <button
                  key={item.id || itemUrl || idx}
                  onClick={() => onSelectMedia?.(item)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary scale-105 opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-md"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
