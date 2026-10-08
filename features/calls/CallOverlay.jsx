/**
 * File: CallOverlay.jsx
 *
 * Responsibility:
 * Unified UI stage and modals for 1-to-1 and Group WebRTC Voice & Video Calling:
 * - 1-to-1 Incoming Call Modal (Accept / Decline) with retro voxel buttons & pixel brackets
 * - 1-to-1 Outgoing Call Modal (Calling transmission… / Cancel)
 * - 1-to-1 Bento Voice Call Stage (active speaker card, animated equalizer waveform, docked arcade toolbar)
 * - 1-to-1 Responsive Video Call Stage (full-canvas remote video with CRT scanlines, local PIP preview & docked toolbar)
 * - Group Voice Call Stage (Multi-participant bento grid, animated voice meters, active speaker glow)
 * - Group Video Call Stage (Adaptive CSS video grid, Speaker View, Screen Sharing stage)
 * - Mandatory Camera-Off Avatar Fallback (renders full-tile PixelTalk avatar + username + mic status when camera is off)
 * - Screen Sharing Stage (prioritized screen view with docked participant strip)
 * - Floating Docked Arcade Toolbar (Microphone, Camera, Screen Share, Flip Camera, Reactions, Fullscreen, Minimize, Leave Call)
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

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useCall } from './CallContext';
import { Avatar, Modal } from '@/components/ui';
import { getUserAvatar, avatarSrc } from '@/lib/avatars';

function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CallOverlay() {
  const {
    callState,
    callData,
    localStream,
    remoteStream,
    groupParticipants,
    isMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
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
    toggleScreenShare,
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

  // Callback ref for 1:1 remote audio element
  const setRemoteAudio = (node) => {
    remoteAudioRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for 1:1 remote video element
  const setRemoteVideo = (node) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for 1:1 local preview video element
  const setLocalVideo = (node) => {
    localVideoRef.current = node;
    if (node && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }
    }
  };

  // Attach 1:1 remote stream to audio/video elements when stream updates
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

  // Attach 1:1 local stream to preview video element when stream updates
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

  const isGroup = Boolean(callData?.isGroup);
  const isVideoCall = callData?.type === 'video';
  const partnerDisplayName = callData?.partnerUser?.displayName || callData?.conversationName || 'PixelTalk Player';
  const partnerUsername = callData?.partnerUser?.username || 'player';

  return (
    <>
      {/* Hidden audio element for 1:1 remote stream */}
      {!isGroup && <audio ref={setRemoteAudio} autoPlay playsInline />}

      {/* Hidden audio elements for group remote streams */}
      {isGroup && (
        <div className="hidden">
          {groupParticipants
            .filter((p) => !p.isLocal && p.stream)
            .map((p) => (
              <RemoteAudioPlayer key={p.userId} stream={p.stream} />
            ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. INCOMING 1:1 CALL MODAL (Retro Voxel Styling)               */}
      {/* ============================================================== */}
      {callState === 'RINGING' && callData && !isGroup && (
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
      {/* 2. OUTGOING 1:1 CALL MODAL (Calling transmission…)             */}
      {/* ============================================================== */}
      {callState === 'CALLING' && callData && !isGroup && (
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
            {isGroup ? (
              <Avatar src={avatarSrc('avatar-06')} alt="" size={36} ring={false} />
            ) : (
              <Avatar src={getUserAvatar(callData.partnerUser)} alt="" size={36} ring={false} />
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border border-surface" />
          </div>

          <div className="min-w-0 pr-1">
            <p className="font-display text-[12px] font-bold text-on-surface truncate">
              {isGroup ? `#${callData.conversationName || 'room'}` : partnerDisplayName}
            </p>
            <p className="font-mono text-[10px] text-primary font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary inline-block animate-pulse" />
              <span>{formatSeconds(callDuration)}</span>
              {isGroup && (
                <span className="text-on-surface-variant font-normal">
                  • {groupParticipants.length}p
                </span>
              )}
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
      {/* 4. ACTIVE 1-TO-1 VOICE CALL STAGE                              */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && !isGroup && callData?.type === 'audio' && !isMinimized && (
        <div className="fixed inset-0 z-50 bg-background text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
          {/* Top Stage Header Bar */}
          <header className="flex justify-between items-center w-full px-space-md py-space-sm h-14 z-40 bg-surface-container-high border-b border-tertiary/20 shadow-[0_2px_0px_0px_rgba(110,53,17,0.15)] shrink-0">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="flex items-center gap-space-xs cursor-pointer">
                <div className="w-8 h-8 rounded-lg border-2 border-tertiary bg-surface-container flex items-center justify-center shadow-[1px_1px_0_0_#844721]">
                  <span className="material-symbols-outlined text-primary text-[20px]">call</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight hidden sm:inline">PixelTalk</span>
              </div>
              <div className="h-5 w-px bg-tertiary/30 hidden sm:block" />
              <div className="flex items-center gap-space-sm truncate">
                <span className="font-label-md text-label-md text-primary font-bold border-b-2 border-primary pb-0.5 truncate">
                  CALL://VOICE
                </span>
                <span className="hidden md:flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 bg-primary inline-block" />
                  Opus 48kHz
                </span>
                <span className="hidden sm:flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded border border-tertiary/20 font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-xs text-primary">lock</span>
                  E2EE Locked
                </span>
              </div>
            </div>

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
            {activeReaction && (
              <div className="absolute top-1/3 text-4xl floating-reaction-1 pointer-events-none z-30">
                {activeReaction.emoji}
              </div>
            )}

            <div className="w-full flex-1 flex items-center justify-center my-auto">
              <section className="w-full max-w-lg bg-surface-container-lowest rounded-2xl border-2 border-tertiary shadow-[4px_4px_0px_#6E3511] p-6 sm:p-8 flex flex-col items-center justify-center relative min-h-[360px]">
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-tertiary pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-tertiary pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-tertiary pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-tertiary pointer-events-none" />

                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container border border-tertiary/30 text-on-secondary-container font-mono text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-primary" />
                    MAIN STAGE // 1:1 PEER
                  </span>
                </div>

                <div className="relative flex items-center justify-center my-6">
                  <div className="hidden sm:flex items-end gap-1.5 mr-6 h-24">
                    <div className="w-2.5 bg-tertiary-container border border-tertiary animate-pulse h-12" />
                    <div className="w-2.5 bg-primary-container border border-tertiary animate-pulse h-20" />
                    <div className="w-2.5 bg-secondary border border-tertiary animate-pulse h-14" />
                  </div>

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

                  <div className="hidden sm:flex items-end gap-1.5 ml-6 h-24">
                    <div className="w-2.5 bg-primary-container border border-tertiary animate-pulse h-16" />
                    <div className="w-2.5 bg-secondary-container border border-tertiary animate-pulse h-22" />
                    <div className="w-2.5 bg-tertiary-container border border-tertiary animate-pulse h-10" />
                  </div>
                </div>

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

                <button
                  type="button"
                  onClick={toggleMinimize}
                  className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press"
                  title="Minimize"
                  aria-label="Minimize call"
                >
                  <span className="material-symbols-outlined text-xl">close_fullscreen</span>
                </button>

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
      {/* 5. ACTIVE 1-TO-1 VIDEO CALL STAGE                              */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && !isGroup && callData?.type === 'video' && !isMinimized && (
        <div className="fixed inset-0 z-50 bg-[#121a0e] text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
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
                  VIDEO://1-TO-1
                </span>
                <span className="hidden md:flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 bg-primary inline-block" />
                  HD 1080p
                </span>
                <span className="hidden sm:flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded border border-tertiary/20 font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-xs text-primary">lock</span>
                  E2EE Locked
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm">
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
          <main className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden relative bg-zinc-950 pixel-grid-dots justify-between">
            {activeReaction && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-5xl floating-reaction-2 pointer-events-none z-40">
                {activeReaction.emoji}
              </div>
            )}

            <div className="flex-1 relative rounded-2xl border-2 border-tertiary overflow-hidden bg-surface-container-lowest flex items-center justify-center shadow-[4px_4px_0px_#6E3511]">
              <div className="absolute inset-0 scanlines pointer-events-none opacity-25 z-10" />

              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary z-20 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary z-20 pointer-events-none" />
              <div className="absolute bottom-16 left-2 w-3 h-3 border-b-2 border-l-2 border-primary z-20 pointer-events-none" />
              <div className="absolute bottom-16 right-2 w-3 h-3 border-b-2 border-r-2 border-primary z-20 pointer-events-none" />

              <video
                ref={setRemoteVideo}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-zinc-950"
              />

              {/* Local Stream PIP Preview Card */}
              <div className="absolute bottom-16 right-3 sm:bottom-16 sm:right-4 w-32 h-44 sm:w-44 sm:h-60 rounded-xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] overflow-hidden bg-zinc-900 z-30">
                <video
                  ref={setLocalVideo}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container p-2 text-center text-on-surface">
                    <span className="material-symbols-outlined text-[28px] text-tertiary">videocam_off</span>
                    <span className="font-mono text-[10px] text-tertiary font-bold mt-1">CAMERA OFF</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-surface-container-high/90 px-2 py-0.5 border-t border-tertiary/20 flex items-center justify-between">
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

              <div className="absolute bottom-2 inset-x-2 bg-surface-container-high/95 backdrop-blur-sm p-2 rounded-xl border border-tertiary/30 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-primary rounded-none" />
                  <span className="font-headline-sm text-body-md font-bold text-on-surface truncate">
                    @{partnerUsername}
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant hidden sm:inline">
                    ({partnerDisplayName})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20">
                    <span className="material-symbols-outlined text-xs text-primary">graphic_eq</span>
                    <span>16-BIT RETRO MESH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Docked Arcade Toolbar */}
            <div className="mt-2.5 flex-shrink-0 flex justify-center pb-1 w-full z-30">
              <div className="bg-surface-container-high/95 backdrop-blur-md px-3.5 sm:px-4 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
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
      {/* 6. ACTIVE GROUP VOICE CALL STAGE                               */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && isGroup && !isVideoCall && !isMinimized && (
        <GroupVoiceStage
          callData={callData}
          participants={groupParticipants}
          callDuration={callDuration}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onLeave={endCall}
          onMinimize={toggleMinimize}
          onFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onReaction={triggerReaction}
          activeReaction={activeReaction}
        />
      )}

      {/* ============================================================== */}
      {/* 7. ACTIVE GROUP VIDEO CALL STAGE (Mesh Grid & Screen Share)    */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && isGroup && isVideoCall && !isMinimized && (
        <GroupVideoStage
          callData={callData}
          participants={groupParticipants}
          localStream={localStream}
          callDuration={callDuration}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          screenStream={screenStream}
          canSwitchCamera={canSwitchCamera}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onSwitchCamera={switchCamera}
          onLeave={endCall}
          onMinimize={toggleMinimize}
          onFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onReaction={triggerReaction}
          activeReaction={activeReaction}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
        />
      )}

      {/* ============================================================== */}
      {/* 8. CALL ERROR TOAST                                            */}
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

/**
 * ==============================================================
 * GROUP VOICE CALL STAGE COMPONENT
 * ==============================================================
 */
function GroupVoiceStage({
  callData,
  participants,
  callDuration,
  isMuted,
  onToggleMute,
  onLeave,
  onMinimize,
  onFullscreen,
  isFullscreen,
  onReaction,
  activeReaction,
}) {
  const roomName = callData?.conversationName || 'Community Room';

  return (
    <div className="fixed inset-0 z-50 bg-background text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-4 py-2.5 h-14 z-40 bg-surface-container-high border-b border-tertiary/20 shadow-[0_2px_0px_0px_rgba(110,53,17,0.15)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg border-2 border-tertiary bg-surface-container flex items-center justify-center shadow-[1px_1px_0_0_#844721]">
            <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-bold text-on-surface truncate">
              #{roomName}
            </h1>
            <p className="font-mono text-[10px] text-tertiary flex items-center gap-1.5">
              <span className="w-2 h-2 bg-primary inline-block" />
              <span>GROUP VOICE • {participants.length} CONNECTED</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/30 font-bold shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
            <span className="w-2 h-2 bg-primary animate-pulse inline-block" />
            <span>LIVE {formatSeconds(callDuration)}</span>
          </div>

          <button
            type="button"
            onClick={onMinimize}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
            title="Minimize"
          >
            <span className="material-symbols-outlined text-base">close_fullscreen</span>
          </button>

          <button
            type="button"
            onClick={onFullscreen}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <span className="material-symbols-outlined text-base">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Roster Canvas */}
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto bg-surface pixel-grid-dots justify-between relative">
        {activeReaction && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-4xl floating-reaction-1 pointer-events-none z-30">
            {activeReaction.emoji}
          </div>
        )}

        {/* Bento Grid of Group Participants */}
        <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 p-2">
          {participants.map((p) => {
            const displayName = p.user?.displayName || p.user?.username || 'Player';
            const username = p.user?.username || 'player';
            const isSelf = p.isLocal;
            const isMutedState = isSelf ? isMuted : p.isMuted;

            return (
              <div
                key={p.userId}
                className={`bg-surface-container-lowest border-2 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center relative transition-all shadow-[3px_3px_0px_#6E3511] ${
                  !isMutedState ? 'border-primary-container bg-secondary-container/10' : 'border-tertiary/40'
                }`}
              >
                {/* 4 Corner brackets */}
                <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-tertiary/40 pointer-events-none" />
                <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-tertiary/40 pointer-events-none" />

                {/* Avatar with status */}
                <div className="relative mb-3">
                  <div className={`p-1 rounded-2xl border-2 ${!isMutedState ? 'border-primary bg-secondary-container' : 'border-tertiary bg-surface-container'}`}>
                    <Avatar src={getUserAvatar(p.user)} alt={displayName} size={72} ring={false} />
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 p-1 rounded-lg border border-tertiary text-surface-container font-mono text-[9px] font-bold ${
                      isMutedState ? 'bg-error text-on-error' : 'bg-primary text-on-primary animate-pulse'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px] block">
                      {isMutedState ? 'mic_off' : 'mic'}
                    </span>
                  </span>
                </div>

                <div className="min-w-0 max-w-full">
                  <p className="font-display text-[14px] font-bold text-on-surface truncate">
                    {displayName} {isSelf && <span className="text-primary font-mono text-[11px]">(YOU)</span>}
                  </p>
                  <p className="font-mono text-[11px] text-tertiary truncate">@{username}</p>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded border border-tertiary/20 bg-surface-container/60">
                  <span className={`w-1.5 h-1.5 inline-block ${!isMutedState ? 'bg-primary animate-ping' : 'bg-outline'}`} />
                  <span className={!isMutedState ? 'text-primary font-bold' : 'text-on-surface-variant'}>
                    {!isMutedState ? 'AUDIO LIVE' : 'MUTED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Docked Controls Toolbar */}
        <div className="mt-4 flex-shrink-0 flex justify-center pb-2 w-full z-20">
          <div className="bg-surface-container-high/95 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3.5 py-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] flex items-center gap-2 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all press ${
                isMuted
                  ? 'bg-error-container text-error'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-primary text-xl">
                {isMuted ? 'mic_off' : 'mic'}
              </span>
              <span>{isMuted ? 'MUTED' : 'MIC'}</span>
            </button>

            <div className="hidden sm:flex items-center bg-surface-container-lowest px-2 py-1 rounded-xl border border-tertiary gap-1 shadow-[1px_1px_0px_#6E3511]">
              {['❤️', '👍', '🍄', '🔥', '⭐'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReaction(emoji)}
                  className="hover:scale-125 transition-transform text-base p-1"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onMinimize}
              className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press"
              title="Minimize"
            >
              <span className="material-symbols-outlined text-xl">close_fullscreen</span>
            </button>

            <button
              type="button"
              onClick={onFullscreen}
              className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <span className="material-symbols-outlined text-xl">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            <button
              type="button"
              onClick={onLeave}
              className="bg-error hover:bg-error/90 text-on-error px-4 sm:px-5 py-2 rounded-xl border-[1.5px] border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-1.5 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all press"
            >
              <span className="material-symbols-outlined text-xl">call_end</span>
              <span>LEAVE ROOM CALL</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * ==============================================================
 * GROUP VIDEO CALL STAGE COMPONENT (Adaptive Mesh Grid)
 * ==============================================================
 */
function GroupVideoStage({
  callData,
  participants,
  localStream,
  callDuration,
  isMuted,
  isVideoOff,
  isScreenSharing,
  screenStream,
  canSwitchCamera,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onSwitchCamera,
  onLeave,
  onMinimize,
  onFullscreen,
  isFullscreen,
  onReaction,
  activeReaction,
  viewMode,
  onSetViewMode,
}) {
  const roomName = callData?.conversationName || 'Community Room';

  // Dynamic grid column class based on participant count
  const count = Math.max(1, participants.length);
  const gridClass = useMemo(() => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 bg-[#121a0e] text-on-surface flex flex-col overflow-hidden h-screen h-[100dvh]">
      {/* Top Stage Header Bar */}
      <header className="flex justify-between items-center w-full px-4 py-2.5 h-14 z-40 bg-surface-container-high border-b border-tertiary/20 shadow-[0_2px_0px_0px_rgba(110,53,17,0.15)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg border-2 border-tertiary bg-surface-container flex items-center justify-center shadow-[1px_1px_0_0_#844721]">
            <span className="material-symbols-outlined text-primary text-[20px]">videocam</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-bold text-on-surface truncate">
              #{roomName}
            </h1>
            <p className="font-mono text-[10px] text-tertiary flex items-center gap-1.5">
              <span className="w-2 h-2 bg-primary inline-block" />
              <span>GROUP VIDEO • {participants.length} CONNECTED</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid vs Speaker Mode Switcher */}
          <div className="hidden sm:flex items-center bg-surface-container rounded-lg p-0.5 border border-tertiary/30">
            <button
              type="button"
              onClick={() => onSetViewMode('grid')}
              className={`px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-[1px_1px_0px_#6E3511]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">grid_view</span>
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => onSetViewMode('speaker')}
              className={`px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'speaker'
                  ? 'bg-surface-container-lowest text-primary shadow-[1px_1px_0px_#6E3511]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xs">person</span>
              <span>Speaker</span>
            </button>
          </div>

          <div className="flex items-center gap-1 font-mono text-label-sm bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded border border-tertiary/30 font-bold shadow-[1px_1px_0px_rgba(110,53,17,0.15)]">
            <span className="w-2 h-2 bg-primary animate-ping inline-block" />
            <span>{formatSeconds(callDuration)}</span>
          </div>

          <button
            type="button"
            onClick={onMinimize}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
            title="Minimize"
          >
            <span className="material-symbols-outlined text-base">close_fullscreen</span>
          </button>

          <button
            type="button"
            onClick={onFullscreen}
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-tertiary/30 flex items-center justify-center shadow-[1px_1px_0px_#6E3511] press"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <span className="material-symbols-outlined text-base">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Video Mesh Grid */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden relative bg-zinc-950 pixel-grid-dots justify-between">
        {activeReaction && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-5xl floating-reaction-2 pointer-events-none z-40">
            {activeReaction.emoji}
          </div>
        )}

        {/* Video Tiles Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 w-full flex items-center justify-center">
          <div className={`grid ${gridClass} gap-2.5 sm:gap-3.5 w-full h-full max-h-full p-1`}>
            {participants.map((p) => {
              const isSelf = p.isLocal;
              const stream = isSelf ? localStream : p.stream;
              const muted = isSelf ? isMuted : p.isMuted;
              const videoOff = isSelf ? isVideoOff : p.isVideoOff;

              return (
                <VideoTile
                  key={p.userId}
                  participant={p}
                  stream={stream}
                  isSelf={isSelf}
                  isMuted={muted}
                  isVideoOff={videoOff}
                  isScreenSharing={p.isScreenSharing}
                  canSwitchCamera={isSelf && canSwitchCamera}
                  onSwitchCamera={onSwitchCamera}
                />
              );
            })}
          </div>
        </div>

        {/* Floating Docked Arcade Toolbar */}
        <div className="mt-2.5 flex-shrink-0 flex justify-center pb-1 w-full z-30">
          <div className="bg-surface-container-high/95 backdrop-blur-md px-3.5 sm:px-4 py-2 rounded-2xl border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {/* Mic */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2.5 sm:p-3 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press ${
                isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isMuted ? 'mic_off' : 'mic'}
              </span>
            </button>

            {/* Camera */}
            <button
              type="button"
              onClick={onToggleVideo}
              className={`p-2.5 sm:p-3 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press ${
                isVideoOff ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isVideoOff ? 'videocam_off' : 'videocam'}
              </span>
            </button>

            {/* Screen Share */}
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={`p-2.5 sm:p-3 rounded-xl border border-tertiary shadow-[2px_2px_0px_#6E3511] press ${
                isScreenSharing ? 'bg-primary text-surface-container font-bold' : 'bg-surface-container-lowest text-on-surface hover:bg-secondary-container/40'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isScreenSharing ? 'stop_screen_share' : 'screen_share'}
              </span>
            </button>

            {/* Flip Camera (Mobile) */}
            {canSwitchCamera && (
              <button
                type="button"
                onClick={onSwitchCamera}
                className="p-2.5 sm:p-3 rounded-xl border border-tertiary bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] hover:bg-secondary-container/40 press"
                title="Switch Camera"
              >
                <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
              </button>
            )}

            {/* Live Reactions */}
            <div className="hidden sm:flex items-center bg-surface-container-lowest px-2 py-1 rounded-xl border border-tertiary gap-1 shadow-[1px_1px_0px_#6E3511]">
              {['❤️', '👍', '🍄', '🔥', '⭐'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReaction(emoji)}
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
              onClick={onFullscreen}
              className="p-2.5 sm:p-3 rounded-xl border border-tertiary bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] hover:bg-secondary-container/40 press"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            {/* Leave Video Call */}
            <button
              type="button"
              onClick={onLeave}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-error text-on-error font-mono text-label-sm font-bold border-2 border-tertiary shadow-[3px_3px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 press"
            >
              <span className="material-symbols-outlined text-[20px]">call_end</span>
              <span>LEAVE ROOM CALL</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * ==============================================================
 * VIDEO TILE COMPONENT (With Camera-Off PixelTalk Avatar Fallback)
 * ==============================================================
 */
function VideoTile({
  participant,
  stream,
  isSelf,
  isMuted,
  isVideoOff,
  isScreenSharing,
  canSwitchCamera,
  onSwitchCamera,
}) {
  const videoRef = useRef(null);
  const displayName = participant.user?.displayName || participant.user?.username || 'Player';
  const username = participant.user?.username || 'player';

  // Attach MediaStream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  const hasVideoStream = Boolean(stream && !isVideoOff);

  return (
    <div className="relative w-full h-full min-h-[160px] sm:min-h-[220px] rounded-2xl border-2 border-tertiary overflow-hidden bg-surface-container-lowest flex items-center justify-center shadow-[3px_3px_0px_#6E3511]">
      {/* CRT Scanline effect */}
      <div className="absolute inset-0 scanlines pointer-events-none opacity-20 z-10" />

      {/* 4 Corner pixel brackets */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 border-primary z-20 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 border-primary z-20 pointer-events-none" />

      {/* REAL VIDEO STREAM (When Camera is ON) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={`w-full h-full object-cover bg-zinc-950 ${isSelf && !isScreenSharing ? '-scale-x-100' : ''} ${
          hasVideoStream ? 'block' : 'hidden'
        }`}
      />

      {/* CAMERA OFF AVATAR FALLBACK (MANDATORY: NO EMPTY BLACK BOX) */}
      {!hasVideoStream && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-low p-4 text-center">
          <div className="relative mb-2">
            <div className="p-1 rounded-2xl border-2 border-tertiary bg-surface-container shadow-[2px_2px_0px_#6E3511]">
              <Avatar src={getUserAvatar(participant.user)} alt={displayName} size={80} ring={false} />
            </div>
            {isMuted && (
              <span className="absolute -bottom-1 -right-1 p-1 rounded bg-error text-on-error border border-tertiary">
                <span className="material-symbols-outlined text-[12px] block">mic_off</span>
              </span>
            )}
          </div>
          <p className="font-display text-[13px] font-bold text-on-surface truncate max-w-full">
            {displayName} {isSelf && <span className="text-primary font-mono text-[10px]">(YOU)</span>}
          </p>
          <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-tertiary bg-surface-container px-2 py-0.5 rounded border border-tertiary/20 font-bold">
            <span className="material-symbols-outlined text-[12px]">videocam_off</span>
            <span>CAMERA OFF</span>
          </div>
        </div>
      )}

      {/* Top Video Tile Badge */}
      <div className="absolute top-2 inset-x-2 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-1 bg-[#221a0e]/85 text-[#feeeda] px-2 py-0.5 rounded border border-[#6E3511]/40 font-mono text-[10px] backdrop-blur-sm shadow-[1px_1px_0px_#6E3511]">
          <span className={`w-1.5 h-1.5 rounded-none ${!isMuted ? 'bg-primary animate-ping' : 'bg-outline'}`} />
          <span className="font-bold truncate">{isSelf ? 'YOU' : `@${username}`}</span>
        </div>

        <div className="flex items-center gap-1">
          {isScreenSharing && (
            <span className="bg-primary text-surface-container px-1.5 py-0.5 rounded font-mono text-[9px] font-bold flex items-center gap-0.5 border border-tertiary">
              <span className="material-symbols-outlined text-[11px]">screen_share</span>
              <span>SCREEN</span>
            </span>
          )}
          {isMuted && (
            <span className="bg-error text-on-error px-1.5 py-0.5 rounded font-mono text-[9px] font-bold flex items-center gap-0.5 border border-tertiary">
              <span className="material-symbols-outlined text-[11px]">mic_off</span>
              <span>MUTED</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Identity Nameplate */}
      <div className="absolute bottom-2 inset-x-2 bg-surface-container-high/90 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-tertiary/30 flex items-center justify-between z-20">
        <span className="font-mono text-[10px] font-bold text-on-surface truncate">
          {displayName}
        </span>
        {canSwitchCamera && (
          <button
            type="button"
            onClick={onSwitchCamera}
            className="text-primary hover:text-tertiary pointer-events-auto"
            title="Flip camera"
          >
            <span className="material-symbols-outlined text-[14px]">flip_camera_ios</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hidden audio element for receiving remote peer audio stream
 */
function RemoteAudioPlayer({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}
