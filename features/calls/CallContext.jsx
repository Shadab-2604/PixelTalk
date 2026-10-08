/**
 * File: CallContext.jsx
 *
 * Responsibility:
 * Unified WebRTC 1-to-1 and Group Voice & Video Call State Machine and Signaling Engine:
 * - 1-to-1 WebRTC Call Architecture (direct peer-to-peer MediaStream & RTCPeerConnection)
 * - Group Multi-Peer WebRTC Mesh Architecture (dynamic peer-per-participant mesh for groups)
 * - Camera-Off Avatar Fallback support (MediaStream toggles, track enabled state, camera-off signaling)
 * - Screen Sharing support with seamless track swap and presenter priority
 * - Real-time Socket.IO signaling synchronization for 1:1 and group rooms
 * - Active Group Call discovery and live banner state broadcast
 * - Web Audio API synthesized telephone ringtone and ringback chimes
 * - Dynamic STUN / TURN ICE server configuration via environment variables
 * - Call duration elapsed timer & unanswered timeout (35s)
 * - Mute microphone & Camera toggle controls
 * - Mobile Camera switching (front/back facingMode) without rebuilding peer connections
 * - Minimize / restore call UI stage & fullscreen mode
 *
 * Layer:
 * Frontend / Call Features & State Context
 *
 * Connected to:
 * - frontend/lib/socket.js
 * - frontend/features/calls/CallOverlay.jsx
 * - frontend/components/AppShell.jsx
 * - frontend/app/chat/[conversationId]/page.jsx
 * - frontend/app/rooms/[conversationId]/page.jsx
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
  const [callData, setCallData] = useState(null); // { callId, partnerUser, type: 'audio'|'video', conversationId, isInitiator, isGroup, conversationName }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); // 1:1 remote stream
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState('');

  // Group call multi-participant state: Array<{ userId, user, isMuted, isVideoOff, isScreenSharing, isSpeaking, stream, isLocal }>
  const [groupParticipants, setGroupParticipants] = useState([]);
  // Active group calls indexed by conversationId: { [conversationId]: activeCallObject }
  const [activeGroupCalls, setActiveGroupCalls] = useState({});

  // 1-to-1 WebRTC refs
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callDataRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const ringtoneTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const callTimeoutTimerRef = useRef(null);

  // Group WebRTC mesh refs (userId -> RTCPeerConnection, userId -> MediaStream, userId -> ICE candidate queue)
  const groupPeersRef = useRef(new Map());
  const groupStreamsRef = useRef(new Map());
  const groupIceQueueRef = useRef(new Map());

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
  // Call Timeout Timer (35s limit on unanswered 1:1 calls)
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
  // Cleanup WebRTC & Media Tracks (Unified 1:1 and Group)
  // -------------------------------------------------------------
  const cleanupCall = useCallback(() => {
    stopRingtone();
    clearCallTimeout();

    // 1:1 Peer connection cleanup
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    // Group Mesh Peer connections cleanup
    if (groupPeersRef.current) {
      for (const [, pc] of groupPeersRef.current.entries()) {
        try {
          pc.close();
        } catch {}
      }
      groupPeersRef.current.clear();
    }
    groupStreamsRef.current.clear();
    groupIceQueueRef.current.clear();

    // Local camera/mic media tracks cleanup
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Screen sharing media tracks cleanup
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    setGroupParticipants([]);
    iceCandidateQueueRef.current = [];
  }, [stopRingtone, clearCallTimeout]);

  // -------------------------------------------------------------
  // 1-to-1 WebRTC Peer Connection Factory
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
  // Group WebRTC Mesh Peer Connection Factory
  // -------------------------------------------------------------
  const createGroupPeerConnection = useCallback((targetUserId, conversationId) => {
    const existingPc = groupPeersRef.current.get(String(targetUserId));
    if (existingPc) {
      try {
        existingPc.close();
      } catch {}
    }

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    groupPeersRef.current.set(String(targetUserId), pc);

    // Attach local media stream tracks
    const activeStream = localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, activeStream);
        } catch (e) {
          console.warn('Group track add warning:', e.message);
        }
      });
    }

    // Receive remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        groupStreamsRef.current.set(String(targetUserId), remoteStream);

        setGroupParticipants((prev) =>
          prev.map((p) => (String(p.userId) === String(targetUserId) ? { ...p, stream: remoteStream } : p)),
        );
      }
    };

    // Send ICE candidates to specific group peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (socket) {
          socket.emit('call:group_signal', {
            conversationId,
            targetUserId: String(targetUserId),
            signal: { candidate: event.candidate },
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        console.warn(`[WebRTC] Group peer connection ${pc.connectionState} for user ${targetUserId}`);
      }
    };

    return pc;
  }, []);

  // Helper: Request media stream with graceful fallback
  const acquireMediaStream = async (isVideo) => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
          ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: 'user' }
          : false,
      });
    } catch (err1) {
      console.warn('Initial video constraints failed, trying relaxed video:', err1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
      } catch (err2) {
        console.warn('Standard video failed, falling back to audio only:', err2);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        setIsVideoOff(true);
      }
    }
    return stream;
  };

  // -------------------------------------------------------------
  // 1-to-1 Call Initiation
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
      const isVideo = type === 'video';
      const stream = await acquireMediaStream(isVideo);

      localStreamRef.current = stream;
      setLocalStream(stream);

      const targetId = String(targetUser._id || targetUser.id);
      const initialCallData = {
        callId: null,
        partnerUser: targetUser,
        type,
        conversationId,
        isInitiator: true,
        isGroup: false,
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
  // Accept Incoming 1:1 Call
  // -------------------------------------------------------------
  const acceptCall = async () => {
    const current = callDataRef.current || callData;
    if (!current) return;

    stopRingtone();
    clearCallTimeout();
    setCallError('');
    setCallState('CONNECTING');

    try {
      const isVideo = current.type === 'video';
      const stream = await acquireMediaStream(isVideo);

      localStreamRef.current = stream;
      setLocalStream(stream);

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
  // Reject / Cancel / End 1:1 Call
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

  const endCall = () => {
    const current = callDataRef.current || callData;
    if (current?.isGroup) {
      leaveGroupCall();
      return;
    }
    setCallState('ENDING');
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
  // Group Call: Start or Join Live Room Call
  // -------------------------------------------------------------
  const startGroupCall = async ({ conversationId, isVideo = false, conversationName = 'Room' }) => {
    if (!user || callState !== 'IDLE' || !conversationId) return;
    setCallError('');

    try {
      const type = isVideo ? 'video' : 'audio';
      const stream = await acquireMediaStream(isVideo);

      localStreamRef.current = stream;
      setLocalStream(stream);

      const myUserId = String(user._id || user.id);
      const initialCallData = {
        callId: null,
        partnerUser: null,
        type,
        conversationId,
        isInitiator: true,
        isGroup: true,
        conversationName,
      };

      callDataRef.current = initialCallData;
      setCallData(initialCallData);
      setCallState('CONNECTING');

      // Add self to initial group participants list
      const selfParticipant = {
        userId: myUserId,
        user: {
          _id: myUserId,
          id: myUserId,
          username: user.username,
          displayName: user.displayName,
          avatarId: user.avatarId,
          avatarUrl: user.avatarUrl || '',
        },
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isSpeaking: false,
        stream,
        isLocal: true,
      };
      setGroupParticipants([selfParticipant]);

      const socket = getSocket();
      if (!socket) throw new Error('Socket connection unavailable');

      socket.emit(
        'call:group_start',
        {
          conversationId,
          callType: type,
          type,
        },
        async (res) => {
          if (res?.success && res.callSession) {
            const session = res.callSession;
            setCallData((prev) => ({
              ...prev,
              callId: session.callId || session.id,
            }));
            setCallState('CONNECTED');
            sfx.success();

            // If there are existing participants already in call (we joined an ongoing call):
            const existingParticipants = (session.participants || []).filter(
              (p) => String(p.userId) !== myUserId,
            );

            // Create peer connection and send offer to each existing participant
            for (const p of existingParticipants) {
              const targetUserId = String(p.userId);
              const pc = createGroupPeerConnection(targetUserId, conversationId);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('call:group_signal', {
                  conversationId,
                  targetUserId,
                  signal: { sdp: offer },
                });
              } catch (err) {
                console.warn(`[WebRTC] Group offer error to ${targetUserId}:`, err.message);
              }
            }

            // Sync participant roster with existing members
            setGroupParticipants((prev) => {
              const existingMap = new Map(prev.map((p) => [String(p.userId), p]));
              existingParticipants.forEach((p) => {
                if (!existingMap.has(String(p.userId))) {
                  existingMap.set(String(p.userId), {
                    userId: String(p.userId),
                    user: p.user,
                    isMuted: !!p.isMuted,
                    isVideoOff: !!p.isVideoOff,
                    isScreenSharing: !!p.isScreenSharing,
                    isSpeaking: false,
                    stream: groupStreamsRef.current.get(String(p.userId)) || null,
                    isLocal: false,
                  });
                }
              });
              return Array.from(existingMap.values());
            });
          } else {
            throw new Error(res?.message || 'Failed to start group call');
          }
        },
      );
    } catch (err) {
      sfx.error();
      cleanupCall();
      setCallState('FAILED');
      setCallData(null);
      setCallError(err.message || 'Could not join group call');
      setTimeout(() => setCallState('IDLE'), 3000);
    }
  };

  const joinGroupCall = async ({ conversationId, isVideo = false, conversationName = 'Room' }) => {
    return startGroupCall({ conversationId, isVideo, conversationName });
  };

  const leaveGroupCall = () => {
    const current = callDataRef.current || callData;
    const convoId = current?.conversationId;
    if (convoId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('call:group_leave', { conversationId: convoId });
      }
    }
    cleanupCall();
    setCallState('ENDED');
    sfx.click();
    setTimeout(() => {
      setCallState('IDLE');
      setCallData(null);
    }, 1000);
  };

  // -------------------------------------------------------------
  // Audio Mute & Video Toggle
  // -------------------------------------------------------------
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuteState = !audioTrack.enabled;
        setIsMuted(newMuteState);
        sfx.click();

        const current = callDataRef.current || callData;
        const socket = getSocket();
        if (socket && current) {
          if (current.isGroup) {
            socket.emit('call:group_media_state', {
              conversationId: current.conversationId,
              isMuted: newMuteState,
            });
            setGroupParticipants((prev) =>
              prev.map((p) => (p.isLocal ? { ...p, isMuted: newMuteState } : p)),
            );
          } else {
            const partnerId = String(current.partnerUser?._id || current.partnerUser?.id || '');
            socket.emit('call:media_state', {
              callId: current.callId,
              targetUserId: partnerId,
              isMuted: newMuteState,
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
        const newVideoOffState = !videoTrack.enabled;
        setIsVideoOff(newVideoOffState);
        sfx.click();

        const current = callDataRef.current || callData;
        const socket = getSocket();
        if (socket && current) {
          if (current.isGroup) {
            socket.emit('call:group_media_state', {
              conversationId: current.conversationId,
              isVideoOff: newVideoOffState,
            });
            setGroupParticipants((prev) =>
              prev.map((p) => (p.isLocal ? { ...p, isVideoOff: newVideoOffState } : p)),
            );
          } else {
            const partnerId = String(current.partnerUser?._id || current.partnerUser?.id || '');
            socket.emit('call:media_state', {
              callId: current.callId,
              targetUserId: partnerId,
              isVideoOff: newVideoOffState,
            });
          }
        }
      }
    }
  };

  // -------------------------------------------------------------
  // Screen Sharing Engine
  // -------------------------------------------------------------
  const startScreenShare = async () => {
    if (isScreenSharing || !navigator.mediaDevices?.getDisplayMedia) return;
    try {
      const screenStreamObj = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });

      screenStreamRef.current = screenStreamObj;
      setScreenStream(screenStreamObj);
      setIsScreenSharing(true);
      sfx.success();

      const screenVideoTrack = screenStreamObj.getVideoTracks()[0];

      // Replace video tracks in peer connections
      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && screenVideoTrack) sender.replaceTrack(screenVideoTrack);
      }

      if (groupPeersRef.current) {
        for (const [, pc] of groupPeersRef.current.entries()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender && screenVideoTrack) sender.replaceTrack(screenVideoTrack);
        }
      }

      // Notify group peers
      const current = callDataRef.current || callData;
      const socket = getSocket();
      if (socket && current?.isGroup) {
        socket.emit('call:group_media_state', {
          conversationId: current.conversationId,
          isScreenSharing: true,
        });
        setGroupParticipants((prev) =>
          prev.map((p) => (p.isLocal ? { ...p, isScreenSharing: true } : p)),
        );
      }

      // Handle user stopping screen share via browser stop sharing button
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err.message);
    }
  };

  const stopScreenShare = () => {
    if (!isScreenSharing && !screenStreamRef.current) return;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);
    sfx.click();

    // Restore camera track to all peer connections
    const localVideoTrack = localStreamRef.current ? localStreamRef.current.getVideoTracks()[0] : null;

    if (pcRef.current && localVideoTrack) {
      const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(localVideoTrack);
    }

    if (groupPeersRef.current && localVideoTrack) {
      for (const [, pc] of groupPeersRef.current.entries()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(localVideoTrack);
      }
    }

    const current = callDataRef.current || callData;
    const socket = getSocket();
    if (socket && current?.isGroup) {
      socket.emit('call:group_media_state', {
        conversationId: current.conversationId,
        isScreenSharing: false,
      });
      setGroupParticipants((prev) =>
        prev.map((p) => (p.isLocal ? { ...p, isScreenSharing: false } : p)),
      );
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  };

  // -------------------------------------------------------------
  // Mobile Camera Switching (Front/Back)
  // -------------------------------------------------------------
  const switchCamera = async () => {
    if (!localStreamRef.current) return;
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

      // Replace track on 1:1 peer connection
      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) await videoSender.replaceTrack(newTrack);
      }

      // Replace track on group mesh peer connections
      if (groupPeersRef.current) {
        for (const [, pc] of groupPeersRef.current.entries()) {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) await videoSender.replaceTrack(newTrack);
        }
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
  // Socket.IO Call Signaling Handlers (1:1 and Group)
  // -------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return undefined;

    // --- 1-to-1 Handlers ---
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
        isGroup: false,
      };

      callDataRef.current = incomingCall;
      setCallData(incomingCall);
      setCallState('RINGING');
      playRingtone();

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

    const onAccepted = async (payload) => {
      stopRingtone();
      clearCallTimeout();

      const currentCall = {
        ...callDataRef.current,
        callId: payload.callId,
      };
      callDataRef.current = currentCall;
      setCallData(currentCall);

      if (!currentCall.isInitiator) {
        setCallState('CONNECTED');
        return;
      }

      setCallState('CONNECTING');
      sfx.success();

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

    const onSignal = async (payload) => {
      let pc = pcRef.current;
      const currentCall = callDataRef.current;
      if (!pc && currentCall && !currentCall.isGroup) {
        pc = createPeerConnection(currentCall);
      }
      if (!pc || !payload.signal) return;

      const { sdp, candidate } = payload.signal;

      try {
        if (sdp) {
          if (sdp.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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

    // --- Group Call Handlers ---
    const onGroupActiveState = (payload) => {
      if (!payload?.conversationId) return;
      setActiveGroupCalls((prev) => ({
        ...prev,
        [String(payload.conversationId)]: payload.activeCall,
      }));
    };

    const onGroupStarted = (payload) => {
      if (!payload?.conversationId) return;
      setActiveGroupCalls((prev) => ({
        ...prev,
        [String(payload.conversationId)]: payload.activeCall,
      }));
    };

    const onGroupUserJoined = async (payload) => {
      const current = callDataRef.current;
      if (!current?.isGroup || String(current.conversationId) !== String(payload.conversationId)) {
        return;
      }

      const joinerUser = payload.user || payload.participant?.user;
      const joinerId = String(joinerUser?._id || joinerUser?.id);
      const myId = String(user._id || user.id);

      if (!joinerId || joinerId === myId) return;

      setGroupParticipants((prev) => {
        if (prev.some((p) => String(p.userId) === joinerId)) return prev;
        return [
          ...prev,
          {
            userId: joinerId,
            user: joinerUser,
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false,
            isSpeaking: false,
            stream: null,
            isLocal: false,
          },
        ];
      });
    };

    const onGroupUserLeft = (payload) => {
      const current = callDataRef.current;
      if (!current?.isGroup || String(current.conversationId) !== String(payload.conversationId)) {
        return;
      }
      const leftId = String(payload.userId);
      const pc = groupPeersRef.current.get(leftId);
      if (pc) {
        try {
          pc.close();
        } catch {}
        groupPeersRef.current.delete(leftId);
      }
      groupStreamsRef.current.delete(leftId);
      groupIceQueueRef.current.delete(leftId);

      setGroupParticipants((prev) => prev.filter((p) => String(p.userId) !== leftId));
    };

    const onGroupSignal = async (payload) => {
      const current = callDataRef.current;
      if (!current?.isGroup || String(current.conversationId) !== String(payload.conversationId)) {
        return;
      }

      const fromUserId = String(payload.fromUserId);
      let pc = groupPeersRef.current.get(fromUserId);
      if (!pc) {
        pc = createGroupPeerConnection(fromUserId, current.conversationId);
      }

      const { sdp, candidate } = payload.signal || {};

      try {
        if (sdp) {
          if (sdp.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));

            // Drain queued ICE candidates
            const queue = groupIceQueueRef.current.get(fromUserId) || [];
            while (queue.length > 0) {
              const cand = queue.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Group ICE drain notice:', e.message);
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call:group_signal', {
              conversationId: current.conversationId,
              targetUserId: fromUserId,
              signal: { sdp: answer },
            });
          } else if (sdp.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const queue = groupIceQueueRef.current.get(fromUserId) || [];
            while (queue.length > 0) {
              const cand = queue.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn('Group ICE drain notice:', e.message);
              }
            }
          }
        } else if (candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('Group add ICE notice:', e.message);
            }
          } else {
            const queue = groupIceQueueRef.current.get(fromUserId) || [];
            queue.push(candidate);
            groupIceQueueRef.current.set(fromUserId, queue);
          }
        }
      } catch (err) {
        console.warn('Group WebRTC signal notice:', err.message);
      }
    };

    const onGroupMediaState = (payload) => {
      const fromUserId = String(payload.fromUserId);
      setGroupParticipants((prev) =>
        prev.map((p) => {
          if (String(p.userId) === fromUserId) {
            return {
              ...p,
              ...(payload.isMuted !== undefined ? { isMuted: payload.isMuted } : {}),
              ...(payload.isVideoOff !== undefined ? { isVideoOff: payload.isVideoOff } : {}),
              ...(payload.isScreenSharing !== undefined ? { isScreenSharing: payload.isScreenSharing } : {}),
            };
          }
          return p;
        }),
      );
    };

    const onGroupEnded = (payload) => {
      const current = callDataRef.current;
      setActiveGroupCalls((prev) => {
        const next = { ...prev };
        delete next[String(payload.conversationId)];
        return next;
      });

      if (current?.isGroup && String(current.conversationId) === String(payload.conversationId)) {
        cleanupCall();
        setCallState('ENDED');
        sfx.click();
        setTimeout(() => {
          setCallState('IDLE');
          setCallData(null);
        }, 1200);
      }
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:cancelled', onCancelled);
    socket.on('call:signal', onSignal);
    socket.on('call:ended', onEnded);
    socket.on('call:busy', onBusy);

    socket.on('call:group_active_state', onGroupActiveState);
    socket.on('call:group_started', onGroupStarted);
    socket.on('call:group_user_joined', onGroupUserJoined);
    socket.on('call:group_user_left', onGroupUserLeft);
    socket.on('call:group_signal', onGroupSignal);
    socket.on('call:group_media_state', onGroupMediaState);
    socket.on('call:group_ended', onGroupEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:cancelled', onCancelled);
      socket.off('call:signal', onSignal);
      socket.off('call:ended', onEnded);
      socket.off('call:busy', onBusy);

      socket.off('call:group_active_state', onGroupActiveState);
      socket.off('call:group_started', onGroupStarted);
      socket.off('call:group_user_joined', onGroupUserJoined);
      socket.off('call:group_user_left', onGroupUserLeft);
      socket.off('call:group_signal', onGroupSignal);
      socket.off('call:group_media_state', onGroupMediaState);
      socket.off('call:group_ended', onGroupEnded);
    };
  }, [
    user,
    callState,
    createPeerConnection,
    createGroupPeerConnection,
    cleanupCall,
    playRingtone,
    stopRingtone,
    clearCallTimeout,
    startCallTimeout,
  ]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callData,
        localStream,
        remoteStream,
        groupParticipants,
        activeGroupCalls,
        isMuted,
        isVideoOff,
        isScreenSharing,
        screenStream,
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
        startGroupCall,
        joinGroupCall,
        leaveGroupCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        startScreenShare,
        stopScreenShare,
        switchCamera,
        toggleMinimize,
        toggleFullscreen,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
