/**
 * File: CallContext.jsx
 *
 * Responsibility:
 * Central WebRTC 1-to-1 Voice & Video Call State Machine and Signaling Engine:
 * - Direct peer-to-peer MediaStream management (Audio & Video)
 * - Native RTCPeerConnection lifecycle (Offer / Answer / ICE Candidates)
 * - Asymmetric Offer/Answer negotiation (initiator creates offer, recipient creates answer)
 * - Resilient getUserMedia with progressive constraint fallback (audio-only fallback if camera is busy/missing)
 * - Immediate synchronous state cache (callDataRef) to eliminate race conditions on Accept
 * - Socket.IO signaling synchronization (call:initiate, call:accept, call:reject, call:cancel, call:signal, call:end)
 * - Web Audio API synthesized telephone ringtone and ringback chimes (no external assets needed)
 * - Dynamic STUN / TURN ICE server configuration via environment variables
 * - Call duration elapsed timer & unanswered timeout (35s)
 * - Mute microphone & Camera toggle controls
 * - Camera switching (front/back facingMode) without rebuilding peer connection
 * - Minimize / restore call UI stage
 * - Fullscreen toggle
 *
 * Layer:
 * Frontend / Call Features & State Context
 *
 * Connected to:
 * - frontend/lib/socket.js
 * - frontend/features/calls/CallOverlay.jsx
 * - frontend/components/AppShell.jsx
 * - frontend/app/chat/[conversationId]/page.jsx
 */

'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { sfx } from '@/lib/sound';

function getIceServers() {
  const servers = [
    { urls: process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.counterpath.com:3478' },
  ];

  if (process.env.NEXT_PUBLIC_TURN_SERVER_URL) {
    const turn = { urls: process.env.NEXT_PUBLIC_TURN_SERVER_URL };
    if (process.env.NEXT_PUBLIC_TURN_USERNAME) turn.username = process.env.NEXT_PUBLIC_TURN_USERNAME;
    if (process.env.NEXT_PUBLIC_TURN_CREDENTIAL) turn.credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    servers.push(turn);
  }

  return servers;
}

const CallContext = createContext(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return ctx;
}

export function CallProvider({ children }) {
  const { user } = useAuth();

  // Call lifecycle state: 'IDLE' | 'CALLING' | 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDING' | 'ENDED' | 'REJECTED' | 'CANCELLED' | 'BUSY' | 'FAILED' | 'TIMEOUT'
  const [callState, setCallState] = useState('IDLE');
  const [callData, setCallData] = useState(null); // { callId, partnerUser, type: 'audio'|'video', conversationId, isInitiator }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState('');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callDataRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const ringtoneTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const callTimeoutTimerRef = useRef(null);

  // Synchronize ref with active callData state
  useEffect(() => {
    if (callData) {
      callDataRef.current = callData;
    } else if (callState === 'IDLE') {
      callDataRef.current = null;
    }
  }, [callData, callState]);

  // Detect camera devices for mobile flip
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          setCanSwitchCamera(videoInputs.length > 1);
        })
        .catch(() => {});
    }
  }, []);

  // -------------------------------------------------------------
  // Web Audio Synthesizer: Retro Telephone Rings
  // -------------------------------------------------------------
  const stopRingtone = useCallback(() => {
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(() => {
    stopRingtone();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playBurst = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 1.6);
        gain.gain.linearRampToValueAtTime(0, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.85);
        osc2.stop(now + 1.85);
      };

      playBurst();
      ringtoneTimerRef.current = setInterval(playBurst, 3200);
    } catch {
      /* ignore audio error */
    }
  }, [stopRingtone]);

  // -------------------------------------------------------------
  // Call Duration Timer
  // -------------------------------------------------------------
  useEffect(() => {
    if (callState !== 'CONNECTED') {
      setCallDuration(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  // -------------------------------------------------------------
  // Call Timeout Timer (35s limit on unanswered calls)
  // -------------------------------------------------------------
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutTimerRef.current) {
      clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = null;
    }
  }, []);

  const startCallTimeout = useCallback(
    (onTimeout) => {
      clearCallTimeout();
      callTimeoutTimerRef.current = setTimeout(() => {
        onTimeout();
      }, 35000);
    },
    [clearCallTimeout],
  );

  // -------------------------------------------------------------
  // Cleanup WebRTC & Media Tracks
  // -------------------------------------------------------------
  const cleanupCall = useCallback(() => {
    stopRingtone();
    clearCallTimeout();
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsRemoteVideoOff(false);
    setIsRemoteMuted(false);
    setIsMinimized(false);
    iceCandidateQueueRef.current = [];
  }, [stopRingtone, clearCallTimeout]);

  // -------------------------------------------------------------
  // Create Peer Connection & Attach Tracks
  // -------------------------------------------------------------
  const createPeerConnection = useCallback((currentCall) => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;
    iceCandidateQueueRef.current = [];

    // Send local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (e) {
          console.warn('Track add warning:', e.message);
        }
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Relay ICE candidates via Socket.IO
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        const callInfo = callDataRef.current || currentCall;
        if (socket && callInfo?.callId) {
          const partnerId = String(callInfo.partnerUser?._id || callInfo.partnerUser?.id || '');
          if (partnerId) {
            socket.emit('call:signal', {
              callId: callInfo.callId,
              targetUserId: partnerId,
              toUserId: partnerId,
              signal: { candidate: event.candidate },
            });
          }
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, []);

  // -------------------------------------------------------------
  // Outgoing Call Initiation
  // -------------------------------------------------------------
  const startCall = async (targetUserOrOptions, typeOrOptions = 'audio') => {
    if (!user || callState !== 'IDLE') return;
    setCallError('');

    let targetUser = null;
    let conversationId = null;
    let type = 'audio';

    if (targetUserOrOptions && typeof targetUserOrOptions === 'object' && targetUserOrOptions.targetUser) {
      targetUser = targetUserOrOptions.targetUser;
      conversationId = targetUserOrOptions.conversationId;
      type = targetUserOrOptions.isVideo ? 'video' : 'audio';
    } else {
      targetUser = targetUserOrOptions;
      type = typeOrOptions === 'video' ? 'video' : 'audio';
    }

    if (!targetUser) return;

    try {
      let stream = null;
      const isVideo = type === 'video';

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: 'user' } : false,
        });
      } catch (err1) {
        console.warn('Initial video constraints failed, trying fallback:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo,
          });
        } catch (err2) {
          console.warn('Standard video constraints failed, falling back to audio only:', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setIsVideoOff(true);
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const targetId = String(targetUser._id || targetUser.id);
      const initialCallData = {
        callId: null,
        partnerUser: targetUser,
        type,
        conversationId,
        isInitiator: true,
      };

      callDataRef.current = initialCallData;
      setCallData(initialCallData);
      setCallState('CALLING');
      playRingtone();

      const socket = getSocket();
      if (!socket) throw new Error('Socket connection unavailable');

      socket.emit(
        'call:initiate',
        {
          targetUserId: targetId,
          toUserId: targetId,
          conversationId,
          callType: type,
          type,
        },
        (res) => {
          if (res?.success) {
            setCallData((prev) => {
              const updated = prev ? { ...prev, callId: res.callId } : { ...initialCallData, callId: res.callId };
              callDataRef.current = updated;
              return updated;
            });
          } else if (res?.reason === 'BUSY') {
            stopRingtone();
            cleanupCall();
            setCallState('BUSY');
            setCallError('User is currently on another call');
            setTimeout(() => {
              setCallState('IDLE');
              setCallData(null);
            }, 2500);
          }
        },
      );

      // Start 35s timeout
      startCallTimeout(() => {
        stopRingtone();
        const current = callDataRef.current;
        if (current?.callId) {
          socket.emit('call:cancel', { callId: current.callId });
        }
        cleanupCall();
        setCallState('TIMEOUT');
        setCallError('No answer — call timed out');
        sfx.error();
        setTimeout(() => {
          setCallState('IDLE');
          setCallData(null);
        }, 2500);
      });
    } catch (err) {
      sfx.error();
      cleanupCall();
      setCallState('FAILED');
      setCallData(null);

      let msg = 'Could not access media devices';
      if (err.name === 'NotAllowedError') {
        msg = type === 'video' ? 'Camera and microphone access denied' : 'Microphone access denied';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone or camera found';
      } else if (err.name === 'NotReadableError') {
        msg = 'Hardware is already in use by another app';
      }
      setCallError(msg);
      setTimeout(() => setCallState('IDLE'), 3000);
    }
  };

  // -------------------------------------------------------------
  // Accept Incoming Call (Recipient)
  // -------------------------------------------------------------
  const acceptCall = async () => {
    const current = callDataRef.current || callData;
    if (!current) {
      console.warn('acceptCall called without active callData');
      return;
    }

    stopRingtone();
    clearCallTimeout();
    setCallError('');
    setCallState('CONNECTING');

    try {
      let stream = null;
      const isVideo = current.type === 'video';

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } } : false,
        });
      } catch (err1) {
        console.warn('Initial video constraints failed, trying relaxed constraints:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo,
          });
        } catch (err2) {
          console.warn('Video constraints failed, falling back to audio only:', err2);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setIsVideoOff(true);
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Recipient creates RTCPeerConnection and attaches local tracks
      createPeerConnection(current);

      const socket = getSocket();
      if (socket) {
        socket.emit('call:accept', { callId: current.callId });
      }

      sfx.success();
    } catch (err) {
      sfx.error();
      rejectCall('Hardware access error');
      setCallState('FAILED');
      let msg = 'Microphone/camera access error';
      if (err.name === 'NotAllowedError') msg = 'Permission denied for microphone/camera';
      setCallError(msg);
      setTimeout(() => setCallState('IDLE'), 2500);
    }
  };

  // -------------------------------------------------------------
  // Reject Incoming Call
  // -------------------------------------------------------------
  const rejectCall = (reason = 'declined') => {
    const current = callDataRef.current || callData;
    if (current?.callId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('call:reject', { callId: current.callId, reason });
      }
    }
    cleanupCall();
    setCallState('REJECTED');
    sfx.click();
    setTimeout(() => {
      setCallState('IDLE');
      setCallData(null);
    }, 1200);
  };

  // -------------------------------------------------------------
  // Cancel Outgoing Call
  // -------------------------------------------------------------
  const cancelCall = () => {
    const current = callDataRef.current || callData;
    if (current?.callId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('call:cancel', { callId: current.callId });
      }
    }
    cleanupCall();
    setCallState('CANCELLED');
    sfx.click();
    setTimeout(() => {
      setCallState('IDLE');
      setCallData(null);
    }, 1200);
  };

  // -------------------------------------------------------------
  // End Active Call
  // -------------------------------------------------------------
  const endCall = () => {
    setCallState('ENDING');
    const current = callDataRef.current || callData;
    if (current?.callId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('call:end', { callId: current.callId });
      }
    }
    cleanupCall();
    setCallState('ENDED');
    sfx.click();
    setTimeout(() => {
      setCallState('IDLE');
      setCallData(null);
    }, 1200);
  };

  // -------------------------------------------------------------
  // Remote Stream Track State Sync
  // -------------------------------------------------------------
  useEffect(() => {
    if (!remoteStream) {
      setIsRemoteVideoOff(false);
      setIsRemoteMuted(false);
      return undefined;
    }

    const videoTrack = remoteStream.getVideoTracks()[0];
    const audioTrack = remoteStream.getAudioTracks()[0];

    if (videoTrack) {
      setIsRemoteVideoOff(!videoTrack.enabled || videoTrack.muted);
      const onMute = () => setIsRemoteVideoOff(true);
      const onUnmute = () => setIsRemoteVideoOff(false);
      const onEnded = () => setIsRemoteVideoOff(true);

      videoTrack.addEventListener('mute', onMute);
      videoTrack.addEventListener('unmute', onUnmute);
      videoTrack.addEventListener('ended', onEnded);

      return () => {
        videoTrack.removeEventListener('mute', onMute);
        videoTrack.removeEventListener('unmute', onUnmute);
        videoTrack.removeEventListener('ended', onEnded);
      };
    }
    return undefined;
  }, [remoteStream]);

  // -------------------------------------------------------------
  // Audio Mute & Video Toggle (Local + Realtime Socket Broadcast)
  // -------------------------------------------------------------
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);
        sfx.click();

        const socket = getSocket();
        const currentCall = callDataRef.current;
        if (socket && currentCall?.callId) {
          const partnerId = String(currentCall.partnerUser?._id || currentCall.partnerUser?.id || '');
          if (partnerId) {
            socket.emit('call:media_state', {
              callId: currentCall.callId,
              targetUserId: partnerId,
              toUserId: partnerId,
              isVideoOff,
              isMuted: newMuted,
            });
          }
        }
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOff = !videoTrack.enabled;
        setIsVideoOff(newVideoOff);
        sfx.click();

        const socket = getSocket();
        const currentCall = callDataRef.current;
        if (socket && currentCall?.callId) {
          const partnerId = String(currentCall.partnerUser?._id || currentCall.partnerUser?.id || '');
          if (partnerId) {
            socket.emit('call:media_state', {
              callId: currentCall.callId,
              targetUserId: partnerId,
              toUserId: partnerId,
              isVideoOff: newVideoOff,
              isMuted,
            });
          }
        }
      }
    }
  };

  // -------------------------------------------------------------
  // Mobile Camera Switching (Front/Back)
  // -------------------------------------------------------------
  const switchCamera = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current.getVideoTracks()[0];

      if (oldTrack) {
        oldTrack.stop();
        localStreamRef.current.removeTrack(oldTrack);
      }
      localStreamRef.current.addTrack(newTrack);

      const senders = pcRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
      }
      setFacingMode(nextMode);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      sfx.click();
    } catch (err) {
      console.warn('Camera switch error:', err.message);
    }
  };

  // -------------------------------------------------------------
  // Minimize & Fullscreen Controls
  // -------------------------------------------------------------
  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
    sfx.click();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // -------------------------------------------------------------
  // Socket.IO Call Signaling Handlers
  // -------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return undefined;

    // 1. Incoming Call received
    const onIncoming = (payload) => {
      if (callState !== 'IDLE') {
        socket.emit('call:reject', { callId: payload.callId, reason: 'busy' });
        return;
      }
      const incomingCall = {
        callId: payload.callId,
        partnerUser: payload.caller || payload.fromUser,
        type: payload.callType || payload.type || 'audio',
        conversationId: payload.conversationId,
        isInitiator: false,
      };

      // Set state and update ref synchronously
      callDataRef.current = incomingCall;
      setCallData(incomingCall);
      setCallState('RINGING');
      playRingtone();

      // Incoming call 35s timeout
      startCallTimeout(() => {
        stopRingtone();
        cleanupCall();
        setCallState('TIMEOUT');
        setCallError('Missed call');
        setTimeout(() => {
          setCallState('IDLE');
          setCallData(null);
        }, 2000);
      });
    };

    // 2. Call accepted by recipient
    const onAccepted = async (payload) => {
      stopRingtone();
      clearCallTimeout();

      const currentCall = {
        ...callDataRef.current,
        callId: payload.callId,
      };
      callDataRef.current = currentCall;
      setCallData(currentCall);

      // ONLY the initiator creates the SDP offer!
      if (!currentCall.isInitiator) {
        setCallState('CONNECTED');
        return;
      }

      setCallState('CONNECTING');
      sfx.success();

      // Initiator creates and sends SDP offer
      const pc = pcRef.current || createPeerConnection(currentCall);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const partnerId = String(currentCall.partnerUser?._id || currentCall.partnerUser?.id || '');
        socket.emit('call:signal', {
          callId: payload.callId,
          targetUserId: partnerId,
          toUserId: partnerId,
          signal: { sdp: offer },
        });
        setCallState('CONNECTED');
      } catch (err) {
        console.error('Error generating WebRTC offer:', err);
        setCallError(err.message || 'Error generating WebRTC offer');
        setCallState('FAILED');
      }
    };

    // 3. Call rejected
    const onRejected = (payload) => {
      stopRingtone();
      clearCallTimeout();
      cleanupCall();
      setCallState('REJECTED');
      setCallError(payload.reason === 'busy' ? 'User is in another call' : 'Call declined');
      sfx.error();
      setTimeout(() => {
        setCallState('IDLE');
        setCallData(null);
      }, 2000);
    };

    // 4. Call cancelled by caller
    const onCancelled = () => {
      stopRingtone();
      clearCallTimeout();
      cleanupCall();
      setCallState('CANCELLED');
      sfx.click();
      setTimeout(() => {
        setCallState('IDLE');
        setCallData(null);
      }, 1200);
    };

    // 5. WebRTC Signal Relay (SDP Offer / Answer & ICE Candidate)
    const onSignal = async (payload) => {
      let pc = pcRef.current;
      const currentCall = callDataRef.current;
      if (!pc && currentCall) {
        pc = createPeerConnection(currentCall);
      }
      if (!pc || !payload.signal) return;

      const { sdp, candidate } = payload.signal;

      try {
        if (sdp) {
          if (sdp.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Drain any queued ICE candidates
            while (iceCandidateQueueRef.current.length > 0) {
              const cand = iceCandidateQueueRef.current.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('ICE drain notice:', e.message);
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call:signal', {
              callId: payload.callId,
              targetUserId: String(payload.fromUserId),
              toUserId: String(payload.fromUserId),
              signal: { sdp: answer },
            });
            setCallState('CONNECTED');
          } else if (sdp.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            while (iceCandidateQueueRef.current.length > 0) {
              const cand = iceCandidateQueueRef.current.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('ICE drain notice:', e.message);
              }
            }
            setCallState('CONNECTED');
          }
        } else if (candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('Add ICE candidate notice:', e.message);
            }
          } else {
            iceCandidateQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.warn('WebRTC signal handling notice:', err.message);
      }
    };

    // 6. Call ended by peer
    const onEnded = () => {
      stopRingtone();
      clearCallTimeout();
      cleanupCall();
      setCallState('ENDED');
      sfx.click();
      setTimeout(() => {
        setCallState('IDLE');
        setCallData(null);
      }, 1200);
    };

    // 7. Busy event
    const onBusy = () => {
      stopRingtone();
      clearCallTimeout();
      cleanupCall();
      setCallState('BUSY');
      setCallError('User is currently busy on another call');
      sfx.error();
      setTimeout(() => {
        setCallState('IDLE');
        setCallData(null);
      }, 2000);
    };

    // 8. Realtime peer media state updates (camera toggle / mute toggle)
    const onMediaState = (payload) => {
      if (payload) {
        if (typeof payload.isVideoOff === 'boolean') {
          setIsRemoteVideoOff(payload.isVideoOff);
        }
        if (typeof payload.isMuted === 'boolean') {
          setIsRemoteMuted(payload.isMuted);
        }
      }
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:signal', onSignal);
    socket.on('call:ended', onEnded);
    socket.on('call:busy', onBusy);
    socket.on('call:media_state', onMediaState);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:signal', onSignal);
      socket.off('call:ended', onEnded);
      socket.off('call:busy', onBusy);
      socket.off('call:media_state', onMediaState);
    };
  }, [user, callState, createPeerConnection, cleanupCall, playRingtone, stopRingtone, clearCallTimeout, startCallTimeout]);

  return (
    <CallContext.Provider
      value={{
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
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
        toggleMinimize,
        toggleFullscreen,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
