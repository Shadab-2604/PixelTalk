/**
 * File: CallOverlay.jsx
 *
 * Responsibility:
 * Global UI stage and modals for 1-to-1 WebRTC Voice & Video Calling:
 * - Incoming Call Modal (Accept / Decline) with retro voxel buttons
 * - Outgoing Call Modal (Calling transmission… / Cancel)
 * - Stitch Bento Voice Call Stage (active speaker card, animated equalizer waveform, docked toolbar)
 * - Stitch Responsive Video Call Stage (full-canvas remote video with local PIP preview & docked toolbar)
 * - Minimized Floating Dock Pill (seamless in-app navigation during calls)
 * - Mobile safe-area & dynamic viewport height support
 *
 * Layer:
 * Frontend / Call Feature UI
 *
 * Connected to:
 * - frontend/features/calls/CallContext.jsx
 * - frontend/components/AppShell.jsx
 * - stitch_pixeltalk_design_system_app (visual design source of truth)
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useCall } from './CallContext';
import { Avatar, Modal } from '@/components/ui';
import { getUserAvatar } from '@/lib/avatars';

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
    isMuted,
    isVideoOff,
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

  // Callback ref for remote audio
  const setRemoteAudio = (node) => {
    remoteAudioRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for remote video
  const setRemoteVideo = (node) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      if (node.srcObject !== remoteStream) {
        node.srcObject = remoteStream;
      }
      node.play().catch(() => {});
    }
  };

  // Callback ref for local video
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
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream, callState]);

  // Attach local stream to preview video element when stream updates
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState]);

  if (callState === 'IDLE' && !callError) return null;

  return (
    <>
      {/* Hidden audio element for remote stream during voice calls */}
      <audio ref={setRemoteAudio} autoPlay playsInline />

      {/* ============================================================== */}
      {/* 1. INCOMING CALL MODAL                                         */}
      {/* ============================================================== */}
      {callState === 'RINGING' && callData && (
        <Modal
          open
          onClose={() => rejectCall('declined')}
          kicker="INCOMING TRANSMISSION"
          title={callData.type === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call'}
          maxW="max-w-md"
        >
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-surface-container border-4 border-surface shadow-pixel-md overflow-hidden ring-4 ring-primary-container relative">
                <Avatar
                  src={getUserAvatar(callData.partnerUser)}
                  alt={callData.partnerUser?.displayName}
                  size={96}
                  ring={false}
                />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-container border-2 border-surface animate-ping" />
            </div>

            <div>
              <h3 className="font-display text-headline-md font-bold text-on-surface">
                {callData.partnerUser?.displayName || 'PixelTalk Player'}
              </h3>
              <p className="font-mono text-label-md text-tertiary">
                @{callData.partnerUser?.username || 'player'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container/60 text-on-secondary-container rounded-full border border-[#6E3511]/20 font-mono text-[11px] font-bold">
              <span className="material-symbols-outlined text-[16px] text-primary">
                {callData.type === 'video' ? 'videocam' : 'call'}
              </span>
              <span>{callData.type === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call'}</span>
            </div>

            <div className="flex items-center justify-center gap-4 w-full pt-4 border-t border-[#6E3511]/20">
              <button
                type="button"
                onClick={() => rejectCall('declined')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-error text-on-error font-mono text-label-md font-bold border-2 border-[#6E3511] shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                aria-label="Decline call"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
                <span>Decline</span>
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-mono text-label-md font-bold border-2 border-[#6E3511] shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                aria-label="Accept call"
              >
                <span className="material-symbols-outlined text-[20px]">call</span>
                <span>Accept</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 2. OUTGOING CALL MODAL                                         */}
      {/* ============================================================== */}
      {callState === 'CALLING' && callData && (
        <Modal
          open
          onClose={cancelCall}
          kicker="OUTGOING TRANSMISSION"
          title={callData.type === 'video' ? 'Calling with Video…' : 'Calling…'}
          maxW="max-w-md"
        >
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-surface-container border-4 border-surface shadow-pixel-md overflow-hidden ring-4 ring-[#6E3511] relative">
                <Avatar
                  src={getUserAvatar(callData.partnerUser)}
                  alt={callData.partnerUser?.displayName}
                  size={96}
                  ring={false}
                />
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-primary animate-pulse border-2 border-surface" />
            </div>

            <div>
              <h3 className="font-display text-headline-md font-bold text-on-surface">
                {callData.partnerUser?.displayName || 'PixelTalk Player'}
              </h3>
              <p className="font-mono text-label-md text-tertiary">
                @{callData.partnerUser?.username || 'player'}
              </p>
            </div>

            <p className="font-mono text-label-sm text-primary font-bold flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-[16px]">ring_volume</span>
              <span>Calling transmission…</span>
            </p>

            <div className="w-full pt-4 border-t border-[#6E3511]/20">
              <button
                type="button"
                onClick={cancelCall}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-error text-on-error font-mono text-label-md font-bold border-2 border-[#6E3511] shadow-[2px_2px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                aria-label="Cancel call"
              >
                <span className="material-symbols-outlined text-[20px]">call_end</span>
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 3. MINIMIZED FLOATING CALL DOCK PILL                           */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && isMinimized && callData && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-[#6E3511] shadow-[3px_3px_0px_#6E3511] flex items-center gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-xl border border-[#6E3511] overflow-hidden bg-surface-container relative shrink-0">
            <Avatar src={getUserAvatar(callData.partnerUser)} alt="" size={36} ring={false} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-none border border-surface" />
          </div>

          <div className="min-w-0 pr-2">
            <p className="font-display text-[12px] font-bold text-on-surface truncate">
              {callData.partnerUser?.displayName || callData.partnerUser?.username}
            </p>
            <p className="font-mono text-[10px] text-primary font-bold">
              {formatSeconds(callDuration)}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border border-[#6E3511] ${
              isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isMuted ? 'mic_off' : 'mic'}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleMinimize}
            className="p-1.5 rounded-lg border border-[#6E3511] bg-surface-container-lowest text-on-surface hover:bg-secondary-container"
            title="Expand Call"
            aria-label="Expand call stage"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_full</span>
          </button>

          <button
            type="button"
            onClick={endCall}
            className="p-1.5 rounded-lg border border-[#6E3511] bg-error text-on-error hover:brightness-105"
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
        <div className="fixed inset-0 z-50 bg-[#fff8f3] dark:bg-[#221a0e] flex flex-col overflow-hidden h-[100dvh]">
          {/* Top Stage Bar */}
          <header className="h-14 px-4 bg-surface-container-high border-b border-[#6E3511]/30 flex items-center justify-between shadow-[2px_2px_0px_rgba(110,53,17,0.15)] shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-primary-container border border-[#6E3511] inline-block" />
              <span className="font-display font-bold text-headline-sm text-on-surface truncate">
                Voice Call Stage <span className="text-[#6E3511]/60 font-normal hidden sm:inline">— @{callData.partnerUser?.username}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 font-mono text-label-sm">
              <div className="hidden md:flex items-center gap-2 bg-surface-container-lowest border border-[#6E3511]/30 px-3 py-1 rounded-md shadow-[1px_1px_0px_#6E3511]">
                <span className="w-2 h-2 rounded-none bg-primary animate-ping" />
                <span className="text-label-sm font-bold text-[#6E3511] uppercase tracking-wider">Live Call</span>
                <span className="text-outline opacity-60">|</span>
                <span className="text-primary font-bold">{formatSeconds(callDuration)}</span>
              </div>
              <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded font-bold border border-[#6E3511]/20 text-[10px]">
                E2EE Locked
              </span>
              <button
                type="button"
                onClick={toggleMinimize}
                className="p-1.5 rounded-lg border border-[#6E3511]/40 hover:bg-surface-variant text-on-surface flex items-center justify-center"
                title="Minimize Call Stage"
                aria-label="Minimize call stage"
              >
                <span className="material-symbols-outlined text-[18px]">close_fullscreen</span>
              </button>
            </div>
          </header>

          {/* Central Stage Canvas */}
          <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-between relative overflow-y-auto">
            <div className="w-full flex justify-center flex-1 items-center">
              {/* Hero Active Speaker Stage Card */}
              <section className="w-full max-w-xl bg-surface-container-lowest rounded-2xl border-2 border-[#6E3511] shadow-[4px_4px_0px_#6E3511] p-6 sm:p-8 flex flex-col items-center justify-center relative min-h-[380px]">
                {/* Corner pixel brackets */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#6E3511]" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#6E3511]" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#6E3511]" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#6E3511]" />

                {/* Top Status Tag */}
                <div className="absolute top-3 left-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container border border-[#6E3511]/30 text-on-secondary-container text-label-sm font-bold">
                    <span className="w-1.5 h-1.5 bg-primary-container" />
                    MAIN STAGE FOCUS
                  </span>
                </div>
                <div className="absolute top-3 right-4 hidden sm:flex items-center gap-1 text-label-sm font-mono text-outline">
                  <span className="material-symbols-outlined text-[15px]">graphic_eq</span>
                  <span>48.0 kHz Opus</span>
                </div>

                {/* Pulsing Audio Waveform Visualizer & Central Avatar Container */}
                <div className="relative flex items-center justify-center my-6">
                  {/* Left Equalizer Bars */}
                  <div className="hidden sm:flex items-center gap-1.5 mr-6 h-24">
                    <div className="w-2.5 bg-tertiary-container border border-[#6E3511] animate-pulse h-12" />
                    <div className="w-2.5 bg-primary-container border border-[#6E3511] animate-pulse h-20" />
                    <div className="w-2.5 bg-secondary border border-[#6E3511] animate-pulse h-14" />
                  </div>

                  {/* Avatar with Speaking Glow and Pixel Frame */}
                  <div className="relative p-1.5 bg-secondary-container rounded-2xl border-[3px] border-[#597928] shadow-[0_0_24px_rgba(89,121,40,0.45)]">
                    <Avatar
                      src={getUserAvatar(callData.partnerUser)}
                      alt={callData.partnerUser?.displayName}
                      size={144}
                      ring={false}
                    />
                  </div>

                  {/* Right Equalizer Bars */}
                  <div className="hidden sm:flex items-center gap-1.5 ml-6 h-24">
                    <div className="w-2.5 bg-primary-container border border-[#6E3511] animate-pulse h-16" />
                    <div className="w-2.5 bg-secondary-container border border-[#6E3511] animate-pulse h-22" />
                    <div className="w-2.5 bg-tertiary-container border border-[#6E3511] animate-pulse h-10" />
                  </div>
                </div>

                <h2 className="font-display text-headline-md font-bold text-on-surface mt-2 text-center">
                  {callData.partnerUser?.displayName}
                </h2>
                <p className="font-mono text-label-md text-tertiary">
                  @{callData.partnerUser?.username}
                </p>

                <div className="mt-4 flex items-center gap-2 font-mono text-label-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-lg border border-[#6E3511]/20">
                  <span className="material-symbols-outlined text-[16px] text-primary">graphic_eq</span>
                  <span>Audio Level Active • Low Latency</span>
                </div>
              </section>
            </div>

            {/* Floating Docked Arcade Toolbar */}
            <div className="mt-4 flex-shrink-0 flex justify-center pb-2 w-full">
              <div className="bg-surface-container-high/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-[#6E3511] shadow-[3px_3px_0px_#6E3511] flex items-center gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-xl border border-[#6E3511] shadow-[2px_2px_0px_#6E3511] flex items-center gap-2 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                    isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface'
                  }`}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span className="material-symbols-outlined text-primary text-xl">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                  <span>{isMuted ? 'Muted' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMinimize}
                  className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2.5 rounded-xl border border-[#6E3511] shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title="Minimize"
                  aria-label="Minimize call"
                >
                  <span className="material-symbols-outlined text-xl">close_fullscreen</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="bg-surface-container-lowest hover:bg-surface-variant text-on-surface p-2.5 rounded-xl border border-[#6E3511] shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
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
                  className="bg-error hover:bg-error/90 text-on-error px-5 py-2 rounded-xl border-[1.5px] border-[#6E3511] shadow-[3px_3px_0px_#6E3511] flex items-center gap-2 font-bold font-mono text-label-sm active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  aria-label="End call"
                >
                  <span className="material-symbols-outlined text-xl">call_end</span>
                  <span>Leave Call</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. ACTIVE VIDEO CALL STAGE (Stitch Video Grid Layout)           */}
      {/* ============================================================== */}
      {callState === 'CONNECTED' && callData?.type === 'video' && !isMinimized && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden h-[100dvh]">
          {/* Main Remote Video Stream View */}
          <div className="flex-1 relative flex items-center justify-center bg-zinc-950 overflow-hidden">
            <video
              ref={setRemoteVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover sm:object-contain"
            />

            {/* Top Video Overlay Bar */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 text-white font-mono text-label-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold">HD CAM</span>
                <span>|</span>
                <span>@{callData.partnerUser?.username}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 text-emerald-400 font-mono text-label-sm font-bold">
                  {formatSeconds(callDuration)}
                </div>
                <button
                  type="button"
                  onClick={toggleMinimize}
                  className="pointer-events-auto p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20"
                  title="Minimize"
                  aria-label="Minimize video call"
                >
                  <span className="material-symbols-outlined text-[18px]">close_fullscreen</span>
                </button>
              </div>
            </div>

            {/* Local Stream Picture-in-Picture Tile */}
            <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-6 w-36 h-48 sm:w-48 sm:h-64 rounded-xl border-2 border-white/40 shadow-2xl overflow-hidden bg-black z-20">
              <video
              ref={setLocalVideo}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/60">
                  <span className="material-symbols-outlined text-[32px]">videocam_off</span>
                  <span className="font-mono text-[10px] mt-1">Cam Off</span>
                </div>
              )}
              <span className="absolute bottom-1 left-2 text-[10px] font-mono text-white/80 bg-black/50 px-1 rounded">
                You
              </span>
            </div>

            {/* Bottom Controls Floating Arcade Dock */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center z-30 pointer-events-auto px-4">
              <div className="bg-surface-container-high/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border-2 border-[#6E3511] shadow-[3px_3px_0px_#6E3511] flex items-center gap-3 flex-wrap justify-center">
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-3 rounded-xl border border-[#6E3511] shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                    isMuted ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface'
                  }`}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                </button>

                {/* Camera On/Off */}
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl border border-[#6E3511] shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                    isVideoOff ? 'bg-error-container text-error' : 'bg-surface-container-lowest text-on-surface'
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
                    className="p-3 rounded-xl border border-[#6E3511] bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    title="Switch Camera"
                    aria-label="Switch front or back camera"
                  >
                    <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-3 rounded-xl border border-[#6E3511] bg-surface-container-lowest text-on-surface shadow-[2px_2px_0px_#6E3511] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>

                {/* End Call */}
                <button
                  type="button"
                  onClick={endCall}
                  className="px-5 py-2.5 rounded-xl bg-error text-on-error font-mono text-label-sm font-bold border-2 border-[#6E3511] shadow-[3px_3px_0px_#6E3511] hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
                  aria-label="End call"
                >
                  <span className="material-symbols-outlined text-[20px]">call_end</span>
                  <span>Leave Call</span>
                </button>
              </div>
            </div>
          </div>
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
