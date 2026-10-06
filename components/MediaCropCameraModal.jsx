/**
 * MediaCropCameraModal — Interactive Image Cropper & Live Camera Capture Dialog
 *
 * Responsibility:
 * Unified modal for selecting, capturing, cropping, zooming, rotating, and uploading
 * user profile avatars and banners to Cloudinary.
 *
 * CONNECTED MODULES:
 * - Pages: frontend/app/profile/page.jsx, frontend/app/settings/page.jsx
 * - Services: frontend/services/userService.js
 * - UI: frontend/components/ui.jsx
 *
 * FEATURES & ACCESSIBILITY:
 * - 1:1 Aspect Ratio for Avatars & 3:1 Aspect Ratio for Banners.
 * - Interactive Canvas Cropping with Zoom, Pan/Drag, and 90° Rotation.
 * - WebRTC Live Camera Capture with Front/Back (Selfie) Switch & Hardware Torch detection.
 * - Strict 25MB File Size & Image Format Validation (JPG, PNG, WEBP).
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, PrimaryButton, SecondaryButton, ErrorText, Spinner, IconButton } from '@/components/ui';
import { sfx } from '@/lib/sound';

export function MediaCropCameraModal({
  open,
  onClose,
  title = 'Upload Photo',
  aspectRatio = 1, // 1 for avatar, 3 for banner
  onUploadSuccess,
  uploadType = 'avatar', // 'avatar' | 'banner'
}) {
  const [mode, setMode] = useState('select'); // 'select' | 'crop' | 'camera'
  const [imageSrc, setImageSrc] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Crop / Transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Camera state
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [cameraActive, setCameraActive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const imageObjRef = useRef(null);

  // Clean up camera stream on unmount or mode switch
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // File selection handler
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setError('Only JPG, JPEG, PNG, and WEBP image files are supported.');
      sfx.error();
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must not exceed 25 MB.');
      sfx.error();
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setMode('crop');
    };
    reader.readAsDataURL(file);
  };

  // Start live camera
  const startCamera = async () => {
    stopCamera();
    setError('');
    setCameraLoading(true);
    setMode('camera');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or device.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);

      // Inspect hardware torch support
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const caps = track.getCapabilities();
        if (caps && caps.torch) {
          setTorchSupported(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Camera permission denied or camera device unavailable.');
      sfx.error();
      setMode('select');
    } finally {
      setCameraLoading(false);
    }
  };

  // Switch front/back camera
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    }
  }, [facingMode]);

  // Toggle hardware torch/flashlight if supported
  const toggleTorch = async () => {
    if (!mediaStreamRef.current || !torchSupported) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Could not toggle hardware torch:', err.message);
      }
    }
  };

  // Snap photo from live video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;

    const ctx = tempCanvas.getContext('2d');
    if (facingMode === 'user') {
      // Mirror selfie photo horizontally for natural selfie perspective
      ctx.translate(tempCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
    stopCamera();
    setImageSrc(dataUrl);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setMode('crop');
    sfx.click();
  };

  // Mouse / Touch Drag Pan handling
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
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

  // Render crop preview canvas
  useEffect(() => {
    if (mode !== 'crop' || !imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;

      const targetWidth = aspectRatio === 1 ? 400 : 900;
      const targetHeight = Math.round(targetWidth / aspectRatio);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Move to center of canvas
      ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
    };
  }, [mode, imageSrc, zoom, rotation, position, aspectRatio]);

  // Export cropped Blob and trigger Cloudinary upload callback
  const handleSaveCrop = async () => {
    if (!canvasRef.current) return;
    setUploading(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setError('Failed to process cropped image.');
            setUploading(false);
            return;
          }

          const file = new File([blob], `${uploadType}_${Date.now()}.webp`, { type: 'image/webp' });
          try {
            await onUploadSuccess(file);
            sfx.success();
            onClose();
          } catch (err) {
            setError(err.message || 'Upload failed');
            sfx.error();
          } finally {
            setUploading(false);
          }
        },
        'image/webp',
        0.92,
      );
    } catch (err) {
      setError(err.message || 'Failed to crop image.');
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { stopCamera(); onClose(); }} title={title} kicker="MEDIA UPLOAD & CROP" maxW="max-w-xl">
      <div className="space-y-4">
        {error && <ErrorText>{error}</ErrorText>}

        {mode === 'select' && (
          <div className="space-y-4 text-center py-6">
            <div className="p-8 border-2 border-dashed border-tertiary/40 rounded-2xl bg-surface-container/50 hover:bg-surface-container transition-all flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[48px] text-primary">add_photo_alternate</span>
              <div>
                <p className="font-display font-bold text-headline-sm text-on-surface">Choose image or snap photo</p>
                <p className="font-mono text-label-sm text-on-surface-variant mt-1">Supports JPG, PNG, and WEBP up to 25 MB</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <label className="px-4 py-2 bg-primary-container text-surface-container font-mono text-label-md font-bold rounded-xl border-[1.5px] border-tertiary shadow-pixel-sm-solid hover:bg-primary cursor-pointer press inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">file_upload</span>
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </label>

                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-secondary-container text-on-secondary-container font-mono text-label-md font-bold rounded-xl border-[1.5px] border-tertiary shadow-pixel-sm hover:bg-secondary-container/80 press inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                  <span>Use Camera</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4 text-center">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-tertiary">
              {cameraLoading && <Spinner />}
              <video ref={videoRef} playsInline autoPlay muted className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`} />

              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {torchSupported && (
                  <IconButton
                    icon={torchOn ? 'flash_on' : 'flash_off'}
                    title={torchOn ? 'Flashlight ON' : 'Flashlight OFF'}
                    onClick={toggleTorch}
                    className="bg-black/60 text-white border-white/30"
                  />
                )}
                <IconButton
                  icon="flip_camera_android"
                  title="Switch Front/Back Camera"
                  onClick={toggleCameraFacing}
                  className="bg-black/60 text-white border-white/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <SecondaryButton type="button" onClick={() => { stopCamera(); setMode('select'); }}>
                Back
              </SecondaryButton>
              <PrimaryButton type="button" onClick={capturePhoto} disabled={!cameraActive}>
                <span className="material-symbols-outlined text-[18px]">camera</span>
                <span>Snap Photo</span>
              </PrimaryButton>
            </div>
          </div>
        )}

        {mode === 'crop' && (
          <div className="space-y-4">
            <div className="text-center font-mono text-label-xs text-on-surface-variant uppercase tracking-wider">
              Drag to Reposition • Scroll/Slider to Zoom • Rotate
            </div>

            {/* Interactive Crop Viewport */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="relative w-full bg-black/90 rounded-2xl overflow-hidden border-2 border-tertiary flex items-center justify-center cursor-move select-none"
              style={{ minHeight: '260px' }}
            >
              <canvas ref={canvasRef} className="max-w-full max-h-[60vh] rounded-lg shadow-2xl pointer-events-none" />
            </div>

            {/* Crop Controls: Zoom & Rotate */}
            <div className="p-4 bg-surface-container rounded-xl border border-tertiary/20 space-y-3">
              <div className="flex items-center gap-4">
                <span className="font-mono text-label-sm font-bold text-tertiary shrink-0">ZOOM</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="font-mono text-label-xs font-bold text-primary w-12 text-right">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-tertiary/15">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="px-2.5 py-1 rounded bg-surface border border-tertiary/30 font-mono text-label-xs font-bold text-on-surface hover:bg-surface-container press flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">rotate_right</span>
                    <span>Rotate 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); }}
                    className="px-2.5 py-1 rounded bg-surface border border-tertiary/30 font-mono text-label-xs font-bold text-on-surface hover:bg-surface-container press"
                  >
                    Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setImageSrc(null); setMode('select'); }}
                  className="font-mono text-label-xs text-error font-bold hover:underline"
                >
                  Choose Different Photo
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton type="button" onClick={() => { stopCamera(); onClose(); }} disabled={uploading}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="button" onClick={handleSaveCrop} disabled={uploading}>
                {uploading ? (
                  <>
                    <Spinner />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Crop & Upload</span>
                  </>
                )}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
