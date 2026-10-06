/**
 * File: EditBannerModal.jsx
 *
 * Responsibility:
 * Responsive dialog for customizing the player's profile banner.
 * Supports:
 * 1. Choosing from 10 built-in PixelTalk vector banners (banner-01 to banner-10)
 * 2. Uploading a custom banner via Cloudinary (with crop / live camera flow)
 * 3. Removing a custom Cloudinary banner with automatic fallback to the selected built-in banner
 *
 * Layer:
 * Frontend / Profile Customization Components
 *
 * Connected to:
 * - frontend/app/profile/page.jsx
 * - frontend/services/userService.js
 * - frontend/lib/config.js (BANNER_IDS)
 * - frontend/lib/avatars.js (getUserBanner, builtInBannerSrc)
 */

'use client';

import { useState, useEffect } from 'react';
import { Modal, PrimaryButton, SecondaryButton, ErrorText, Badge } from '@/components/ui';
import { BANNER_IDS } from '@/lib/config';
import { builtInBannerSrc, isBannerId } from '@/lib/avatars';
import { userService } from '@/services/userService';
import { sfx } from '@/lib/sound';

// Approved theme metadata corresponding to banner-01..10
const BANNER_THEMES = [
  { id: 'banner-01', name: 'Campfire Meadow', tag: 'Warm Ember' },
  { id: 'banner-02', name: 'Twilight Ridge', tag: 'Sunset Mtn' },
  { id: 'banner-03', name: 'Cyber Arcade', tag: 'Retro Neon' },
  { id: 'banner-04', name: 'Greenhouse Spire', tag: 'Rooftop Flora' },
  { id: 'banner-05', name: 'Workspace Loft', tag: 'Cozy Studio' },
  { id: 'banner-06', name: 'Developer Haven', tag: 'Midnight Code' },
  { id: 'banner-07', name: 'Architect Studio', tag: 'Design Drafting' },
  { id: 'banner-08', name: '8-Bit Gamer Room', tag: 'Arcade Haven' },
  { id: 'banner-09', name: 'Botany Haven', tag: 'Zen Greenhouse' },
  { id: 'banner-10', name: '8-Bit Desert', tag: 'Sun & Dune' },
];

export function EditBannerModal({
  open,
  onClose,
  user,
  onBannerUpdated,
  onOpenUploadCustom,
  onRemoveCustomBanner,
  isRemovingCustom = false,
}) {
  // Staged built-in banner ID before saving
  const [selectedBannerId, setSelectedBannerId] = useState('banner-01');
  // Flag indicating if user wants to use custom banner or switch to built-in
  const [preferCustom, setPreferCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync state whenever modal opens or user updates
  useEffect(() => {
    if (open && user) {
      const initialId = user.bannerId && isBannerId(user.bannerId) ? user.bannerId : 'banner-01';
      setSelectedBannerId(initialId);
      setPreferCustom(Boolean(user.bannerUrl));
      setError('');
    }
  }, [open, user]);

  /*
   * Banner preview resolution inside the dialog:
   * If preferCustom is true and user has bannerUrl -> custom Cloudinary image.
   * Otherwise -> staged built-in banner.
   */
  const previewSrc = preferCustom && user?.bannerUrl
    ? user.bannerUrl
    : builtInBannerSrc(selectedBannerId);

  const selectedTheme = BANNER_THEMES.find((t) => t.id === selectedBannerId) || BANNER_THEMES[0];

  const handleSelectBuiltIn = (bannerId) => {
    setSelectedBannerId(bannerId);
    setPreferCustom(false);
    sfx.click();
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    sfx.click();

    try {
      let updatedUser = user;

      // 1. If user chose a built-in banner but still had an active custom banner,
      // deleting custom banner automatically activates the selected built-in banner.
      if (!preferCustom && user?.bannerUrl) {
        const delRes = await userService.deleteBanner();
        updatedUser = delRes.user || updatedUser;
      }

      // 2. Persist the chosen built-in bannerId to MongoDB
      if (selectedBannerId !== user?.bannerId) {
        const updateRes = await userService.updateMe({ bannerId: selectedBannerId });
        updatedUser = updateRes.user || updatedUser;
      }

      sfx.success();
      if (onBannerUpdated) onBannerUpdated(updatedUser);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update banner');
      sfx.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Profile Banner"
      kicker="PLAYER BANNER CUSTOMIZATION"
      maxW="max-w-3xl"
    >
      <div className="space-y-5">
        {/*
         * ============================================================
         * SECTION 1: LIVE BANNER PREVIEW WITH RETRO OVERLAY SIMULATION
         * ============================================================
         */}
        <section aria-labelledby="banner-preview-heading">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-label-sm font-bold text-tertiary uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 bg-primary inline-block" />
              Live Banner Preview
            </span>
            <span className="font-mono text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant border border-tertiary/30">
              {preferCustom && user?.bannerUrl ? 'Selected: Custom Banner' : `Selected: ${selectedTheme.name}`}
            </span>
          </div>

          <div className="relative aspect-[3/1] sm:aspect-[3.5/1] w-full rounded-xl overflow-hidden border-2 border-[#6E3511] bg-surface-container shadow-[2px_2px_0_0_#6E3511]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt="Banner Preview"
              className="w-full h-full object-cover object-center"
            />
            {/* Contextual overlay simulation */}
            <div className="absolute bottom-2 left-3 flex items-center gap-2 bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded border border-tertiary/40">
              <div className="w-4 h-4 rounded bg-primary-container border border-tertiary" />
              <span className="font-mono text-[10px] font-bold text-on-surface">
                @{user?.username || 'player'} (Header Simulation)
              </span>
            </div>
            <div className="absolute top-2 right-2 bg-surface/90 text-on-surface font-mono text-[9px] px-2 py-0.5 rounded border border-tertiary/30 font-bold">
              {preferCustom && user?.bannerUrl ? 'Cloudinary Synced' : 'Built-in Retro'}
            </div>
          </div>
        </section>

        {/*
         * ============================================================
         * SECTION 2: PIXELTALK BUILT-IN BANNERS (10 Themes)
         * ============================================================
         */}
        <section aria-labelledby="builtin-banners-heading">
          <div className="flex items-center justify-between mb-2">
            <h3 id="builtin-banners-heading" className="font-mono text-label-sm font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wide">
              <span className="material-symbols-outlined text-base text-tertiary">grid_view</span>
              PixelTalk Banners (10 Built-in Themes)
            </h3>
            <span className="font-mono text-[10px] text-secondary font-bold">10 / 10 Unlocked</span>
          </div>

          <div
            role="radiogroup"
            aria-label="PixelTalk Built-in Banners"
            className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-1.5 rounded-xl border border-tertiary/20 bg-surface-container/20"
          >
            {BANNER_THEMES.map((theme, idx) => {
              const isSelected = selectedBannerId === theme.id && !preferCustom;
              const bannerNumber = String(idx + 1).padStart(2, '0');
              const bannerUrl = builtInBannerSrc(theme.id);

              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${theme.name} Banner`}
                  onClick={() => handleSelectBuiltIn(theme.id)}
                  className={`group text-left rounded-lg p-1.5 border-2 transition-all relative flex flex-col gap-1 ${
                    isSelected
                      ? 'border-primary bg-secondary-container/40 shadow-[2px_2px_0_0_#426010] ring-1 ring-primary'
                      : 'border-tertiary/30 bg-surface hover:border-tertiary/60'
                  }`}
                >
                  <div className="aspect-[3/1] w-full rounded overflow-hidden bg-surface-container relative border border-tertiary/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bannerUrl}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-on-primary rounded flex items-center justify-center font-bold text-[10px] shadow">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`font-mono text-[10px] font-bold truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {bannerNumber}. {theme.name}
                    </p>
                    <span className="font-mono text-[9px] text-outline block truncate">{theme.tag}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/*
         * ============================================================
         * SECTION 3: CUSTOM CLOUDINARY BANNER ZONE
         * ============================================================
         */}
        <section aria-labelledby="custom-banner-heading" className="border-t border-tertiary/20 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 id="custom-banner-heading" className="font-mono text-label-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">cloud_upload</span>
              Custom Banner Upload
            </h4>
            <span className="font-mono text-[10px] text-outline">Aspect 3:1 Recommended</span>
          </div>

          <div className="border-2 border-dashed border-tertiary/40 rounded-xl p-3 sm:p-4 bg-surface-container-low/60 hover:bg-surface-container hover:border-primary transition-all flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface border border-tertiary/30 flex items-center justify-center text-tertiary shrink-0">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
              </div>
              <div>
                <p className="font-mono text-[11px] font-bold text-on-surface">
                  {user?.bannerUrl ? 'Custom Banner Active' : 'Upload Your Own Artwork'}
                </p>
                <p className="font-body-sm text-[10px] text-on-surface-variant">
                  Supports PNG, JPG, GIF up to 25MB. Interactive crop & camera enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenUploadCustom) onOpenUploadCustom();
                }}
                className="px-3 py-1.5 rounded-lg bg-surface text-tertiary font-mono text-[11px] font-bold border border-tertiary/40 shadow-[1px_1px_0_0_#6E3511] hover:bg-surface-container flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">upload</span>
                <span>{user?.bannerUrl ? 'Replace Custom' : 'Upload Custom'}</span>
              </button>

              {user?.bannerUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    if (onRemoveCustomBanner) {
                      await onRemoveCustomBanner();
                      setPreferCustom(false);
                    }
                  }}
                  disabled={isRemovingCustom}
                  className="px-2.5 py-1.5 rounded-lg bg-error-container text-on-error-container font-mono text-[11px] font-bold border border-error/30 hover:bg-error-container/80 flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Remove custom banner"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  <span>{isRemovingCustom ? 'Removing…' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Priority Status Info Chip */}
        <div className="p-2.5 bg-surface-container rounded-lg border border-tertiary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="material-symbols-outlined text-primary text-[15px]">info</span>
            <span className="text-on-surface font-bold">
              {preferCustom && user?.bannerUrl
                ? 'Active: Custom Banner (Cloudinary)'
                : `Active: PixelTalk Banner (${selectedTheme.name})`}
            </span>
          </div>
          <span className="font-mono text-[9px] text-secondary font-bold uppercase tracking-wider">
            Live Synced
          </span>
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-tertiary/20">
          <SecondaryButton type="button" onClick={onClose} disabled={saving} className="px-3 py-1.5 text-xs">
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-xs">
            {saving ? 'Saving…' : 'Save Banner'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
