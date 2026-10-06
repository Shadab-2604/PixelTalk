'use client';

import { useState, useRef, useEffect } from 'react';
import { Modal, PrimaryButton, SecondaryButton, ErrorText, Spinner } from '@/components/ui';
import { sfx } from '@/lib/sound';

export function ImagePreviewModal({
  open,
  file,
  onClose,
  onSendImage,
  disabled = false,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [enableCrop, setEnableCrop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      setError('Selected file is not a supported image.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Image file size exceeds the maximum limit of 25 MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Drag panning for crop viewport
  const handleMouseDown = (e) => {
    if (!enableCrop) return;
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !enableCrop) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
    };
  }, [imageSrc, zoom, rotation, position, enableCrop]);

  const handleSend = async () => {
    if (!file || uploading || disabled) return;
    setUploading(true);
    setError('');

    try {
      let finalFile = file;

      if (enableCrop && canvasRef.current) {
        const blob = await new Promise((resolve) =>
          canvasRef.current.toBlob(resolve, file.type || 'image/jpeg', 0.92)
        );
        if (blob) {
          finalFile = new File([blob], file.name || 'image.jpg', { type: file.type || 'image/jpeg' });
        }
      }

      await onSendImage(finalFile);
      sfx.success();
      onClose();
    } catch (err) {
      setError(err.message || 'Image upload failed. Please try again.');
      sfx.error();
    } finally {
      setUploading(false);
    }
  };

  if (!file) return null;

  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <Modal
      open={open}
      onClose={() => !uploading && onClose()}
      title="Photo Preview"
      kicker="ATTACHMENT PREVIEW"
      maxW="max-w-lg"
    >
      <div className="space-y-4">
        {error && <ErrorText>{error}</ErrorText>}

        {/* Media metadata */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-tertiary/20 font-mono text-label-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-primary text-[20px]">image</span>
            <span className="font-bold text-on-surface truncate">{file.name}</span>
          </div>
          <span className="text-tertiary shrink-0 ml-2">{fileSizeMb} MB</span>
        </div>

        {/* Main Preview Container */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className={`relative w-full min-h-[220px] max-h-[380px] bg-black/90 rounded-xl overflow-hidden border-2 border-tertiary flex items-center justify-center ${
            enableCrop ? 'cursor-move select-none' : ''
          }`}
        >
          {enableCrop ? (
            <canvas ref={canvasRef} className="max-w-full max-h-[360px] object-contain" />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt="Preview"
              className="max-w-full max-h-[360px] object-contain rounded-md"
            />
          ) : (
            <Spinner />
          )}
        </div>

        {/* Crop / Zoom Controls Toggle */}
        <div className="flex items-center justify-between border-t border-tertiary/15 pt-3">
          <button
            type="button"
            onClick={() => setEnableCrop(!enableCrop)}
            className="flex items-center gap-1.5 font-mono text-label-xs font-bold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">
              {enableCrop ? 'check' : 'crop'}
            </span>
            <span>{enableCrop ? 'Done Editing' : 'Crop & Adjust'}</span>
          </button>

          {enableCrop && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2 py-1 rounded bg-surface border border-tertiary/30 font-mono text-label-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-1"
                title="Rotate 90 degrees"
              >
                <span className="material-symbols-outlined text-[14px]">rotate_right</span>
                <span>90°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPosition({ x: 0, y: 0 });
                }}
                className="px-2 py-1 rounded bg-surface border border-tertiary/30 font-mono text-label-xs font-bold text-on-surface hover:bg-surface-container"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {enableCrop && (
          <div className="flex items-center gap-4 bg-surface-container p-2.5 rounded-lg border border-tertiary/20">
            <span className="font-mono text-label-xs font-bold text-tertiary shrink-0">ZOOM</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="font-mono text-label-xs font-bold text-primary w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <SecondaryButton type="button" onClick={onClose} disabled={uploading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSend} disabled={uploading || !!error}>
            {uploading ? (
              <>
                <Spinner />
                <span>Sending Image…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Send Photo</span>
              </>
            )}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
