/**
 * File: CallOverlay.jsx
 *
 * Responsibility:
 * Global UI stage and modals for 1-to-1 WebRTC Voice & Video Calling:
 * - Incoming Call Modal (Accept / Decline) with retro voxel buttons & pixel brackets
 * - Outgoing Call Modal (Calling transmission… / Cancel)
 * - Stitch Bento Voice Call Stage (active speaker card, animated equalizer waveform, docked arcade toolbar)
 * - Stitch Responsive Video Call Stage (full-canvas remote video with CRT scanlines, local PIP preview & docked toolbar)
 * - Floating Docked Arcade Toolbar (Microphone, Camera, Flip Camera, Reactions, Fullscreen, Minimize, End Call)
 * - Minimized Floating Dock Pill (seamless in-app navigation during active calls)
 * - Responsive dynamic viewport height (h-[100dvh]) & mobile safe areas
 *
 * Layer:
 * Frontend / Call Feature UI
 *
 * Connected to:
 * - frontend/features/calls/CallContext.jsx
 * - frontend/components/AppShell.jsx
 * - frontend/lib/avatars.js
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCall } from './CallContext';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Modal } from '@/components/ui';
import { getUserAvatar } from '@/lib/avatars';

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CallOverlay() {
  const { user } = useAuth();
  const {
    callState,
    callData,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isRemoteVideoOff,
    isRemoteMuted,
    canSwitchCamera,
    isMinimized,
    isFullscreen,
    callDuration,
    callError,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleMinimize,
    toggleFullscreen,
  } = useCall();

  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // Local state for UI enhancements (view mode, reactions)
  const [activeReaction, setActiveReaction] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'speaker'

  // Callback ref for remote audio element
  const setRemoteAudio = (node) => {
    remoteAudioRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for remote video element
  const setRemoteVideo = (node) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for local preview video element
  const setLocalVideo = (node) => {
    localVideoRef.current = node;
    if (node && localStream) {
      if (node.srcObject !== localStream) {
        node.srcObject = localStream;
      }
      node.play().catch(() => {});
    }
  };

  // Attach remote stream to audio/video elements when stream updates
  useEffect(() => {
    if (remoteStream) {
      if (remoteAudioRef.current && remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, callState]);

  // Attach local stream to preview video element when stream updates
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [localStream, callState]);

  const triggerReaction = (emoji) => {
    setActiveReaction({ emoji, id: Date.now() });
    setTimeout(() => {
      setActiveReaction(null);
    }, 2800);
  };

  if (callState === 'IDLE' && !callError) return null;

  const partnerDisplayName = callData?.partnerUser?.displayName || 'PixelTalk Player';
  const partnerUsername = callData?.partnerUser?.username || 'player';

  return (
    <>
      {/* Hidden audio element for remote stream during voice calls */}
      <audio ref={setRemoteAudio} autoPlay playsInline />

      {/* ============================================================== */}
      {/* 1. INCOMING CALL MODAL (Retro Voxel Styling)                   */}
      {/* ============================================================== */}
      {callState === 'RINGING' && callData && (
        <Modal
          open
          onClose={() => rejectCall('declined')}
          kicker="INCOMING TRANSMISSION"
          title={callData.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}
          maxW="max-w-md"
        >
          <div className="flex flex-col items-center text-center space-y-4 py-3 relative">
            {/* Corner pixel brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tertiary pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tertiary pointer-events-none" />
            <div className="absolute bottom-14 left-0 w-3 h-3 border-b-2 border-l-2 border-tertiary pointer-events-none" />
            <div className="absolute bottom-14 right-0 w-3 h-3 border-b-2 border-r-2 border-tertiary pointer-events-none" />

            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-surface-container border-[3px] border-tertiary shadow-[3px_3px_0px_#6E3511] overflow-hidden relative">
                <Avatar
                  src={getUserAvatar(callData.partnerUser)}
                  alt={partnerDisplayName}
                  size={96}
                  ring={false}
                />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-container border-2 border-surface animate-ping" />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-primary text-surface-container font-mono text-[9px] font-bold border border-tertiary">
                {callData.type === 'video' ? 'CAM' : 'VOX'}
              </span>
            </div>

            <div>
              <h3 className="font-display text-headline-md font-bold text-on-surface">
                {partnerDisplayName}
              </h3>
              <p className="font-mono text-label-md text-tertiary">
                @{partnerUsername}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-secondary-container/70 text-on-secondary-container rounded-full border border-tertiary/30 font-mono text-[11px] font-bold shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
              <span className="material-symbols-outlined text-[16px] text-primary">
                {callData.type === 'video' ? 'videocam' : 'call'}
              </span>
              <span>CALL://{callData.type === 'video' ? 'INCOMING_VIDEO' : 'INCOMING_VOICE'}</span>
            </div>

            <div className="flex items-center justify-center gap-4 w-full pt-4 border-t border-tertiary/20">
              <button
                type="button"
                onClick={() => rejectCall('declined')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-error text-on-error font-mono text-label-md font-bold border-2 border-tertiary shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all press"
                aria-label="Decline call"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
                <span>DECLINE</span>
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-container text-surface-container font-mono text-label-md font-bold border-2 border-tertiary shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all press"
                aria-label="Accept call"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
                <span>ACCEPT</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 2. OUTGOING CALL MODAL (Calling transmission…)                 */}
      {/* ============================================================== */}
      {callState === 'CALLING' && callData && (
        <Modal
          open
          onClose={cancelCall}
          kicker="OUTGOING TRANSMISSION"
          title={callData.type === 'video' ? 'Calling with Video…' : 'Calling…'}
          maxW="max-w-md"
        >
          <div className="flex flex-col items-center text-center space-y-4 py-3 relative">
            {/* Corner pixel brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tertiary pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tertiary pointer-events-none" />

            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-surface-container border-[3px] border-tertiary shadow-[3px_3px_0px_#6E3511] overflow-hidden relative">
                <Avatar
                  src={getUserAvatar(callData.partnerUser)}
                  alt={partnerDisplayName}
                  size={96}
                  ring={false}
                />
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-primary animate-pulse border-2 border-surface" />
            </div>

            <div>
              <h3 className="font-display text-headline-md font-bold text-on-surface">
                {partnerDisplayName}
              </h3>
              <p className="font-mono text-label-md text-tertiary">
                @{partnerUsername}
              </p>
            </div>

            <p className="font-mono text-label-sm text-primary font-bold flex items-center gap-2 animate-pulse bg-secondary-container/40 px-3 py-1 rounded-lg border border-tertiary/20">
              <span className="material-symbols-outlined text-[18px]">ring_volume</span>
              <span>CALL://CONNECTING…</span>
            </p>

            <div className="w-full pt-4 border-t border-tertiary/20">
              <button
                type="button"
                onClick={cancelCall}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-error text-on-error font-mono text-label-md font-bold border-2 border-tertiary shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all press"
                aria-label="Cancel call"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
                <span>CANCEL TRANSMISSION</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 3. MINIMIZED FLOATING CALL DOCK PILL                           */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && isMinimized && callData && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-3 animate-fade-in select-none">
          <div className="w-9 h-9 rounded-xl border border-tertiary overflow-hidden bg-surface-container relative shrink-0">
            <Avatar src={getUserAvatar(callData.partnerUser)} alt="" size={36} ring={false} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border border-surface" />
          </div>

          <div className="min-w-0 pr-1">
            <p className="font-display text-[12px] font-bold text-on-surface truncate">
              {partnerDisplayName}
            </p>
            <p className="font-mono text-[10px] text-primary font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary inline-block animate-pulse" />
              <span>{formatSeconds(callDuration)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border border-tertiary shadow-[1px_1px_0px_#6E3511] press ${
              isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isMuted ? 'mic_off' : 'mic'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleMinimize}
            className="p-1.5 rounded-lg border border-tertiary bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40 shadow-[1px_1px_0px_#6E3511] press"
            title="Expand Call Stage"
            aria-label="Expand call stage"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_full</span>
          </button>

          <button
            type="button"
            onClick={endCall}
            className="p-1.5 rounded-lg border border-tertiary bg-error text-on-error hover:brightness-105 shadow-[1px_1px_0px_#6E3511] press"
            title="End Call"
            aria-label="End call"
          >
            <span className="material-symbols-outlined text-[16px]">call_end</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. ACTIVE VOICE CALL STAGE (Stitch Bento Layout)               */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && callData?.type === 'audio' && !isMinimized && (
        <div className="fixed inset-0 z-50 bg-background text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
          {/* Top Stage Header Bar */}
          <header className="flex justify-between items-center w-full px-space-md py-space-sm h-14 z-40 bg-surface-container-high border-b border-tertiary/20 shadow-[0_2px_0px_0px_rgba(110,53,17,0.15)] shrink-0">
            <div className="flex items-center gap-space-md min-w-0">
              {/* Voxel Call Logo */}
              <div className="flex items-center gap-space-xs cursor-pointer">
                <div className="w-8 h-8 rounded-lg border-2 border-tertiary bg-surface-container flex items-center justify-center shadow-[1px_1px_0_0_#844721]">
                  <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight hidden sm:inline">PixelTalk</span>
              </div>
              <div className="h-5 w-px bg-tertiary/30 hidden sm:block" />
              {/* Channel Meta */}
              <div className="flex items-center gap-space-sm truncate">
                <span className="font-label-md text-label-md text-primary font-bold border-b-2 border-primary pb-0.5 truncate">
                  CALL://VOICE
                </span>
                <span className="hidden md:flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 bg-primary inline-block" />
                  Bitrate: 64kbps
                </span>
                <span className="hidden sm:flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded border border-tertiary/20 font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-xs text-primary">lock</span>
                  E2EE Locked
                </span>
              </div>
            </div>

            {/* Right Call Meta & Actions */}
            <div className="flex items-center gap-space-sm">
              <div className="flex items-center gap-1 font-label-sm text-label-sm bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/30 font-bold shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
                <span className="w-2 h-2 bg-primary animate-pulse inline-block" />
                <span>LIVE {formatSeconds(callDuration)}</span>
              </div>

              <button
                type="button"
                onClick={toggleMinimize}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
                title="Minimize Call Stage"
                aria-label="Minimize call stage"
              >
                <span className="material-symbols-outlined text-base">close_fullscreen</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <span className="material-symbols-outlined text-base">
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </div>
          </header>

          {/* Central Voice Call Stage Canvas */}
          <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-surface pixel-grid-dots items-center justify-between relative">
            {/* Live Floating Reaction Animation */}
            {activeReaction && (
              <div className="absolute top-1/3 text-4xl floating-reaction-1 pointer-events-none z-30">
                {activeReaction.emoji}
              </div>
            )}

            <div className="w-full flex-1 flex items-center justify-center my-auto">
              {/* Hero Active Speaker Bento Card */}
              <section className="w-full max-w-lg bg-surface-container-lowest rounded-2xl border-2 border-tertiary shadow-[4px_4px_0px_#6E3511] p-6 sm:p-8 flex flex-col items-center justify-center relative min-h-[360px]">
                {/* 4 Corner pixel brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-tertiary pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-tertiary pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-tertiary pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-tertiary pointer-events-none" />

                {/* Top Status Capsule */}
                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container border border-tertiary/30 text-on-secondary-container font-mono text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-primary" />
                    MAIN STAGE // PEER
                  </span>
                </div>
                <div className="absolute top-3 right-4 hidden sm:flex items-center gap-1 font-mono text-[10px] text-tertiary">
                  <span className="material-symbols-outlined text-[14px]">equalizer</span>
                  <span>48.0 kHz Opus</span>
                </div>

                {/* Pulsing Central Avatar & Multi-bar Equalizer Visualizer */}
                <div className="relative flex items-center justify-center my-6">
                  {/* Left Equalizer Bar Cluster */}
                  <div className="hidden sm:flex items-end gap-1.5 mr-6 h-24">
                    <div className="w-2.5 bg-tertiary-container border border-tertiary animate-pulse h-12" />
                    <div className="w-2.5 bg-primary-container border border-tertiary animate-pulse h-20" />
                    <div className="w-2.5 bg-secondary border border-tertiary animate-pulse h-14" />
                  </div>

                  {/* Avatar with speaking-tile pulse border */}
                  <div className="relative p-1.5 bg-secondary-container rounded-2xl border-[3px] border-primary-container speaking-tile shadow-[3px_3px_0px_#6E3511]">
                    <Avatar
                      src={getUserAvatar(callData.partnerUser)}
                      alt={partnerDisplayName}
                      size={132}
                      ring={false}
                    />
                    <span className="absolute bottom-1 right-1 bg-primary text-on-primary font-mono text-[9px] px-1 font-bold border border-tertiary">
                      ACTIVE
                    </span>
                  </div>

                  {/* Right Equalizer Bar Cluster */}
                  <div className="hidden sm:flex items-end gap-1.5 ml-6 h-24">
                    <div className="w-2.5 bg-primary-container border border-tertiary animate-pulse h-16" />
                    <div className="w-2.5 bg-secondary-container border border-tertiary animate-pulse h-22" />
                    <div className="w-2.5 bg-tertiary-container border border-tertiary animate-pulse h-10" />
                  </div>
                </div>

                {/* Graphic Mic Level Meter */}
                <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded border border-tertiary/20 shadow-[1px_1px_0px_rgba(110,53,17,0.1)]">
                  <span className="material-symbols-outlined text-sm text-primary">mic</span>
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-1 h-1.5 bg-primary" />
                    <div className="w-1 h-3 bg-primary" />
                    <div className="w-1 h-2 bg-primary" />
                    <div className="w-1 h-3 bg-primary" />
                    <div className="w-1 h-2.5 bg-primary" />
                    <div className="w-1 h-1 bg-outline-variant" />
                    <div className="w-1 h-0.5 bg-outline-variant" />
                  </div>
                  <span className="font-mono text-[10px] text-tertiary font-bold ml-1">AUDIO STREAM ACTIVE</span>
                </div>

                <h2 className="font-display text-headline-md font-bold text-on-surface mt-3 text-center">
                  {partnerDisplayName}
                </h2>
                <p className="font-mono text-label-md text-tertiary">
                  @{partnerUsername}
                </p>
              </section>
            </div>

            {/* Floating Docked Arcade Toolbar */}
            <div className="mt-4 flex-shrink-0 flex justify-center pb-2 w-full z-20">
              <div className="bg-surface-container-high/95 backdrop-blur-md px-3.5 sm:px-4 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                {/* Mute Mic Control */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-3.5 py-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] flex items-center gap-2 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all press ${
                    isMuted
                      ? 'bg-error-container text-error'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
                  }`}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span className="material-symbols-outlined text-primary text-xl">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                  <span>{isMuted ? 'MUTED' : 'MIC'}</span>
                </button>

                {/* Reaction Tray */}
                <div className="hidden sm:flex items-center bg-surface-container-lowest px-2 py-1 rounded-xl border border-tertiary gap-1 shadow-[1px_1px_0px_#6E3511]">
                  {['❤️', '👍', '🍄', '🔥', '⭐'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => triggerReaction(emoji)}
                      className="hover:scale-125 transition-transform text-base p-1"
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Minimize */}
                <button
                  type="button"
                  onClick={toggleMinimize}
                  className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press"
                  title="Minimize"
                  aria-label="Minimize call"
                >
                  <span className="material-symbols-outlined text-xl">close_fullscreen</span>
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>

                {/* End / Leave Call Button */}
                <button
                  type="button"
                  onClick={endCall}
                  className="bg-error hover:bg-error/90 text-on-error px-4 sm:px-5 py-2 rounded-xl border-[1.5px] border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-1.5 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all press"
                  aria-label="Leave call"
                >
                  <span className="material-symbols-outlined text-xl">call_end</span>
                  <span>LEAVE CALL</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. ACTIVE VIDEO CALL STAGE (Stitch Video Grid & Speaker Layout) */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && callData?.type === 'video' && !isMinimized && (
        <div className="fixed inset-0 z-50 bg-[#1a140d] text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
          {/* Top Stage Header Bar */}
          <header className="flex justify-between items-center w-full px-space-md py-space-sm h-14 z-40 bg-surface-container-high border-b border-tertiary/20 shadow-[0_2px_0px_0px_rgba(110,53,17,0.15)] shrink-0">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="flex items-center gap-space-xs cursor-pointer">
                <div className="w-8 h-8 rounded-lg border-2 border-tertiary bg-surface-container flex items-center justify-center shadow-[1px_1px_0_0_#844721]">
                  <span className="material-symbols-outlined text-primary text-[20px]">videocam</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight hidden sm:inline">PixelTalk</span>
              </div>
              <div className="h-5 w-px bg-tertiary/30 hidden sm:block" />
              <div className="flex items-center gap-space-sm truncate">
                <span className="font-label-md text-label-md text-primary font-bold border-b-2 border-primary pb-0.5 truncate">
                  VIDEO://STAGE
                </span>
                <span className="hidden md:flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 bg-primary inline-block" />
                  Bitrate: 64kbps
                </span>
                <span className="hidden sm:flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded border border-tertiary/20 font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-xs text-primary">lock</span>
                  E2EE Locked
                </span>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-space-sm">
              {/* Layout Switcher (Grid vs Speaker View) */}
              <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-tertiary/30">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-surface-container-lowest text-primary shadow-[1px_1px_0px_#6E3511]'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <span className="material-symbols-outlined text-xs">grid_view</span>
                  <span className="hidden xs:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('speaker')}
                  className={`px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'speaker'
                      ? 'bg-surface-container-lowest text-primary shadow-[1px_1px_0px_#6E3511]'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  title="Speaker View"
                  aria-label="Speaker View"
                >
                  <span className="material-symbols-outlined text-xs">person</span>
                  <span className="hidden xs:inline">Speaker</span>
                </button>
              </div>

              {/* Call Timer Badge */}
              <div className="flex items-center gap-1 font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/30 font-bold shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
                <span className="w-2 h-2 bg-primary animate-ping inline-block" />
                <span>{formatSeconds(callDuration)}</span>
              </div>

              <button
                type="button"
                onClick={toggleMinimize}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
                title="Minimize Video Call"
                aria-label="Minimize video call"
              >
                <span className="material-symbols-outlined text-base">close_fullscreen</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface-variant border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <span className="material-symbols-outlined text-base">
                  {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </div>
          </header>

          {/* Main Video Stream Canvas */}
          <main className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden relative bg-[#121a0e] pixel-grid-dots justify-between">
            {/* Live Floating Reaction Animation */}
            {activeReaction && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-5xl floating-reaction-2 pointer-events-none z-40">
                {activeReaction.emoji}
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW MODE A: GRID VIEW (2 Equal Participant Cards)      */}
            {/* ========================================================= */}
            {viewMode === 'grid' && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 overflow-y-auto">
                {/* ---------------------------------------------------- */}
                {/* TILE 1: REMOTE PARTICIPANT CARD                     */}
                {/* ---------------------------------------------------- */}
                <div className="relative bg-surface-container-lowest rounded-2xl border-2 border-tertiary p-2 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#6E3511] min-h-[260px] md:min-h-[380px]">
                  {/* Scanline CRT overlay */}
                  <div className="absolute inset-0 scanlines pointer-events-none opacity-20 z-10" />

                  {/* Top Header Overlays */}
                  <div className="flex items-center justify-between z-20">
                    <div className="flex items-center gap-1.5 bg-[#221a0e]/85 text-[#feeeda] px-2.5 py-1 rounded-lg border border-[#6E3511]/40 font-mono text-[11px] backdrop-blur-sm shadow-[1px_1px_0px_#6E3511]">
                      <span className={`w-2 h-2 rounded-none ${!isRemoteVideoOff ? 'bg-primary animate-ping' : 'bg-outline'}`} />
                      <span className="font-bold">CAM 01 (PEER)</span>
                      <span className="opacity-60">|</span>
                      <span className={!isRemoteVideoOff ? 'text-primary-fixed font-bold' : 'text-outline font-medium'}>
                        {!isRemoteVideoOff ? 'LIVE' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-container-high/90 px-2 py-0.5 rounded border border-tertiary/30 font-mono text-[10px] shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
                      <span className={`material-symbols-outlined text-xs ${isRemoteMuted ? 'text-error' : 'text-primary'}`}>
                        {isRemoteMuted ? 'mic_off' : 'mic'}
                      </span>
                      <span className={isRemoteMuted ? 'text-error font-bold' : 'text-primary font-bold'}>
                        {isRemoteMuted ? 'MUTED' : 'MIC ON'}
                      </span>
                    </div>
                  </div>

                  {/* Video / Avatar Presentation Area */}
                  <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                    {/* Real Video element (always kept in DOM so WebRTC stream binding is never dropped) */}
                    <video
                      ref={setRemoteVideo}
                      autoPlay
                      playsInline
                      className={`w-full h-full object-contain rounded-xl bg-zinc-950 ${isRemoteVideoOff ? 'hidden' : 'block'}`}
                    />

                    {/* Camera Off Avatar Fallback Card */}
                    {isRemoteVideoOff && (
                      <div className="flex flex-col items-center justify-center text-center my-auto p-4 z-10">
                        {/* Avatar with Stitch Pixel Border & Shadow */}
                        <div className="relative p-1.5 bg-secondary-container rounded-2xl border-[2.5px] border-tertiary shadow-[3px_3px_0px_#6E3511]">
                          <Avatar
                            src={getUserAvatar(callData.partnerUser)}
                            alt={partnerDisplayName}
                            size={112}
                            ring={false}
                          />
                          <span className="absolute -bottom-1 -right-1 bg-tertiary text-on-tertiary font-mono text-[9px] px-1.5 py-0.5 rounded font-bold border border-surface">
                            PEER
                          </span>
                        </div>

                        {/* Name & Identity */}
                        <h3 className="font-display text-headline-sm font-bold text-on-surface mt-3">
                          {partnerDisplayName}
                        </h3>
                        <p className="font-mono text-label-sm text-tertiary">
                          @{partnerUsername}
                        </p>

                        {/* Status Pills */}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap justify-center">
                          <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full border border-tertiary/20 font-mono text-[10px] text-on-surface-variant font-bold">
                            <span className="material-symbols-outlined text-xs text-tertiary">videocam_off</span>
                            Camera Off
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-bold ${
                            isRemoteMuted
                              ? 'bg-error-container/70 text-error border-error/30'
                              : 'bg-secondary-container text-on-secondary-container border-tertiary/20'
                          }`}>
                            <span className="material-symbols-outlined text-xs">
                              {isRemoteMuted ? 'mic_off' : 'mic'}
                            </span>
                            {isRemoteMuted ? 'Mic Off' : 'Mic On'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Nameplate */}
                  <div className="flex items-center justify-between bg-surface-container-high/95 backdrop-blur-sm p-2 rounded-xl border border-tertiary/30 z-20">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 ${!isRemoteVideoOff ? 'bg-primary' : 'bg-outline'}`} />
                      <span className="font-headline-sm text-body-md font-bold text-on-surface truncate">
                        @{partnerUsername}
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant hidden sm:inline">
                        ({partnerDisplayName})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20">
                      <span className="material-symbols-outlined text-xs text-primary">equalizer</span>
                      <span>OPUS 48kHz</span>
                    </div>
                  </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* TILE 2: LOCAL PARTICIPANT CARD (YOU)                */}
                {/* ---------------------------------------------------- */}
                <div className="relative bg-surface-container-lowest rounded-2xl border-2 border-tertiary p-2 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#6E3511] min-h-[260px] md:min-h-[380px]">
                  {/* Scanline CRT overlay */}
                  <div className="absolute inset-0 scanlines pointer-events-none opacity-20 z-10" />

                  {/* Top Header Overlays */}
                  <div className="flex items-center justify-between z-20">
                    <div className="flex items-center gap-1.5 bg-[#221a0e]/85 text-[#feeeda] px-2.5 py-1 rounded-lg border border-[#6E3511]/40 font-mono text-[11px] backdrop-blur-sm shadow-[1px_1px_0px_#6E3511]">
                      <span className={`w-2 h-2 rounded-none ${!isVideoOff ? 'bg-primary animate-ping' : 'bg-outline'}`} />
                      <span className="font-bold">CAM 02 (YOU)</span>
                      <span className="opacity-60">|</span>
                      <span className={!isVideoOff ? 'text-primary-fixed font-bold' : 'text-outline font-medium'}>
                        {!isVideoOff ? 'LIVE' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-container-high/90 px-2 py-0.5 rounded border border-tertiary/30 font-mono text-[10px] shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
                      <span className={`material-symbols-outlined text-xs ${isMuted ? 'text-error' : 'text-primary'}`}>
                        {isMuted ? 'mic_off' : 'mic'}
                      </span>
                      <span className={isMuted ? 'text-error font-bold' : 'text-primary font-bold'}>
                        {isMuted ? 'MUTED' : 'MIC ON'}
                      </span>
                    </div>
                  </div>

                  {/* Video / Avatar Presentation Area */}
                  <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
                    {/* Real Video element (always kept in DOM) */}
                    <video
                      ref={setLocalVideo}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-contain -scale-x-100 rounded-xl bg-zinc-950 ${isVideoOff ? 'hidden' : 'block'}`}
                    />

                    {/* Camera Off Avatar Fallback Card */}
                    {isVideoOff && (
                      <div className="flex flex-col items-center justify-center text-center my-auto p-4 z-10">
                        {/* Avatar with Stitch Pixel Border & Shadow */}
                        <div className="relative p-1.5 bg-secondary-container rounded-2xl border-[2.5px] border-tertiary shadow-[3px_3px_0px_#6E3511]">
                          <Avatar
                            src={getUserAvatar(user)}
                            alt={user?.displayName || 'You'}
                            size={112}
                            ring={false}
                          />
                          <span className="absolute -bottom-1 -right-1 bg-primary text-on-primary font-mono text-[9px] px-1.5 py-0.5 rounded font-bold border border-surface">
                            YOU
                          </span>
                        </div>

                        {/* Name & Identity */}
                        <h3 className="font-display text-headline-sm font-bold text-on-surface mt-3">
                          {user?.displayName || 'You'}
                        </h3>
                        <p className="font-mono text-label-sm text-tertiary">
                          @{user?.username || 'player'}
                        </p>

                        {/* Status Pills */}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap justify-center">
                          <span className="inline-flex items-center gap-1 bg-surface-container px-2.5 py-0.5 rounded-full border border-tertiary/20 font-mono text-[10px] text-on-surface-variant font-bold">
                            <span className="material-symbols-outlined text-xs text-tertiary">videocam_off</span>
                            Camera Off
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-bold ${
                            isMuted
                              ? 'bg-error-container/70 text-error border-error/30'
                              : 'bg-secondary-container text-on-secondary-container border-tertiary/20'
                          }`}>
                            <span className="material-symbols-outlined text-xs">
                              {isMuted ? 'mic_off' : 'mic'}
                            </span>
                            {isMuted ? 'Mic Off' : 'Mic On'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Nameplate */}
                  <div className="flex items-center justify-between bg-surface-container-high/95 backdrop-blur-sm p-2 rounded-xl border border-tertiary/30 z-20">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 ${!isVideoOff ? 'bg-primary' : 'bg-outline'}`} />
                      <span className="font-headline-sm text-body-md font-bold text-on-surface truncate">
                        You (@{user?.username || 'player'})
                      </span>
                    </div>
                    {canSwitchCamera && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="bg-surface-container px-2 py-0.5 rounded border border-tertiary/30 font-mono text-[10px] text-primary hover:text-tertiary flex items-center gap-1 font-bold"
                        title="Flip Camera"
                      >
                        <span className="material-symbols-outlined text-xs">flip_camera_ios</span>
                        <span className="hidden sm:inline">FLIP</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW MODE B: SPEAKER VIEW (Hero Remote + PIP Local Card)  */}
            {/* ========================================================= */}
            {viewMode === 'speaker' && (
              <div className="flex-1 relative rounded-2xl border-2 border-tertiary overflow-hidden bg-surface-container-lowest flex items-center justify-center shadow-[4px_4px_0px_#6E3511]">
                {/* Scanline texture overlay */}
                <div className="absolute inset-0 scanlines pointer-events-none opacity-25 z-10" />

                {/* 4 Corner pixel brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary z-20 pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary z-20 pointer-events-none" />
                <div className="absolute bottom-16 left-2 w-3 h-3 border-b-2 border-l-2 border-primary z-20 pointer-events-none" />
                <div className="absolute bottom-16 right-2 w-3 h-3 border-b-2 border-r-2 border-primary z-20 pointer-events-none" />

                {/* Remote Video Stream Element */}
                <video
                  ref={setRemoteVideo}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-contain bg-zinc-950 ${isRemoteVideoOff ? 'hidden' : 'block'}`}
                />

                {/* Remote Avatar Fallback Card on Speaker Stage */}
                {isRemoteVideoOff && (
                  <div className="flex flex-col items-center justify-center text-center my-auto p-6 z-10">
                    <div className="relative p-2 bg-secondary-container rounded-2xl border-[3px] border-tertiary shadow-[4px_4px_0px_#6E3511]">
                      <Avatar
                        src={getUserAvatar(callData.partnerUser)}
                        alt={partnerDisplayName}
                        size={140}
                        ring={false}
                      />
                      <span className="absolute -bottom-1 -right-1 bg-tertiary text-on-tertiary font-mono text-[10px] px-2 py-0.5 rounded font-bold border border-surface">
                        SPEAKER
                      </span>
                    </div>

                    <h2 className="font-display text-headline-md font-bold text-on-surface mt-4">
                      {partnerDisplayName}
                    </h2>
                    <p className="font-mono text-label-md text-tertiary">
                      @{partnerUsername}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-surface-container px-3 py-1 rounded-full border border-tertiary/20 font-mono text-[11px] text-on-surface-variant font-bold">
                        <span className="material-symbols-outlined text-sm text-tertiary">videocam_off</span>
                        Camera Off
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-mono text-[11px] font-bold ${
                        isRemoteMuted
                          ? 'bg-error-container/70 text-error border-error/30'
                          : 'bg-secondary-container text-on-secondary-container border-tertiary/20'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {isRemoteMuted ? 'mic_off' : 'mic'}
                        </span>
                        {isRemoteMuted ? 'Mic Off' : 'Mic Active'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Live Video Overlay Badge */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
                  <div className="flex items-center gap-1.5 bg-[#221a0e]/85 text-[#feeeda] px-2.5 py-1 rounded-lg border border-[#6E3511]/40 font-mono text-[11px] backdrop-blur-sm shadow-[1px_1px_0px_#6E3511]">
                    <span className={`w-2 h-2 rounded-none ${!isRemoteVideoOff ? 'bg-primary animate-ping' : 'bg-outline'}`} />
                    <span className="font-bold">HD CAM 01</span>
                    <span className="opacity-60">|</span>
                    <span className={!isRemoteVideoOff ? 'text-primary-fixed font-bold' : 'text-outline font-medium'}>
                      {!isRemoteVideoOff ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-surface-container-high/90 px-2 py-0.5 rounded border border-tertiary/30 font-mono text-[10px] shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
                    <span className={`material-symbols-outlined text-xs ${isRemoteMuted ? 'text-error' : 'text-primary'}`}>
                      {isRemoteMuted ? 'mic_off' : 'equalizer'}
                    </span>
                    <span className={isRemoteMuted ? 'text-error font-bold' : 'text-primary font-bold'}>
                      {isRemoteMuted ? 'PEER MUTED' : 'SPEAKING'}
                    </span>
                  </div>
                </div>

                {/* Local Stream PIP Preview Card */}
                <div className="absolute bottom-16 right-3 sm:bottom-16 sm:right-4 w-32 h-44 sm:w-44 sm:h-60 rounded-xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] overflow-hidden bg-surface-container-lowest z-30 flex flex-col justify-between">
                  <video
                    ref={setLocalVideo}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`}
                  />
                  {isVideoOff && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-surface-container p-2 text-center text-on-surface">
                      <div className="p-1 bg-secondary-container rounded-xl border border-tertiary shadow-[1px_1px_0px_#6E3511]">
                        <Avatar src={getUserAvatar(user)} alt={user?.displayName || 'You'} size={48} ring={false} />
                      </div>
                      <span className="font-display text-[11px] font-bold text-on-surface mt-1 truncate max-w-full">
                        {user?.displayName || 'You'}
                      </span>
                      <span className="font-mono text-[9px] text-tertiary font-bold flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[10px]">videocam_off</span>
                        Cam Off
                      </span>
                    </div>
                  )}
                  {/* Local PIP Name Tag */}
                  <div className="bg-surface-container-high/90 px-2 py-0.5 border-t border-tertiary/20 flex items-center justify-between shrink-0">
                    <span className="font-mono text-[9px] font-bold text-primary">YOU</span>
                    {canSwitchCamera && (
                      <button
                        type="button"
                        onClick={switchCamera}
                        className="text-primary hover:text-tertiary"
                        title="Flip camera"
                      >
                        <span className="material-symbols-outlined text-[13px]">flip_camera_ios</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Video Nameplate */}
                <div className="absolute bottom-2 inset-x-2 bg-surface-container-high/95 backdrop-blur-sm p-2 rounded-xl border border-tertiary/30 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 ${!isRemoteVideoOff ? 'bg-primary' : 'bg-outline'}`} />
                    <span className="font-headline-sm text-body-md font-bold text-on-surface truncate">
                      @{partnerUsername}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant hidden sm:inline">
                      ({partnerDisplayName})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20">
                    <span className="material-symbols-outlined text-xs text-primary">graphic_eq</span>
                    <span>16-BIT RETRO MESH</span>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Docked Arcade Toolbar */}
            <div className="mt-2.5 flex-shrink-0 flex justify-center pb-1 w-full z-30">
              <div className="bg-surface-container-high/95 backdrop-blur-md px-3.5 sm:px-4 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2.5 sm:p-3 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press ${
                    isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
                  }`}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`p-2.5 sm:p-3 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press ${
                    isVideoOff ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
                  }`}
                  title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                  aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isVideoOff ? 'videocam_off' : 'videocam'}
                  </span>
                </button>

                {/* Switch Camera (Mobile) */}
                {canSwitchCamera && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-2.5 sm:p-3 rounded-xl border border-tertiary bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] hover:bg-secondary-container/40 press"
                    title="Switch Camera"
                    aria-label="Switch front or back camera"
                  >
                    <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
                  </button>
                )}

                {/* Live Reactions Tray */}
                <div className="hidden sm:flex items-center bg-surface-container-lowest px-2 py-1 rounded-xl border border-tertiary gap-1 shadow-[1px_1px_0px_#6E3511]">
                  {['❤️', '👍', '🍄', '🔥', '⭐'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => triggerReaction(emoji)}
                      className="hover:scale-125 transition-transform text-base p-1"
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2.5 sm:p-3 rounded-xl border border-tertiary bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] hover:bg-secondary-container/40 press"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>

                {/* End / Leave Video Call Button */}
                <button
                  type="button"
                  onClick={endCall}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-error text-on-error font-mono text-label-sm font-bold border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 press"
                  aria-label="Leave call"
                >
                  <span className="material-symbols-outlined text-[20px]">call_end</span>
                  <span>LEAVE CALL</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CALL ERROR TOAST                                            */}
      {/* ============================================================== */}
      {callError && (
        <div className="fixed bottom-6 right-6 z-50 p-3 bg-surface-container-high rounded-xl border-2 border-error text-on-surface font-mono text-label-sm shadow-[3px_3px_0px_#ba1a1a] flex items-center gap-2 animate-bounce-in">
          <span className="material-symbols-outlined text-error text-[18px]">error</span>
          <span>{callError}</span>
        </div>
      )}
    </>
  );
}
