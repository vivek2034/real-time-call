import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, WebSocketMessage } from './types';
import { Header } from './components/Header';
import { NamePrompt } from './components/NamePrompt';
import { UserList } from './components/UserList';
import { ActiveCallScreen } from './components/ActiveCallScreen';
import { IncomingCallModal } from './components/IncomingCallModal';
import { OutgoingCallModal } from './components/OutgoingCallModal';
import { MicTestModal } from './components/MicTestModal';
import { WebRTCClient } from './utils/webrtc';
import { sounds } from './utils/soundEffects';
import { AlertCircle, WifiOff } from 'lucide-react';

const STORAGE_NAME_KEY = 'audiocall_username';
const STORAGE_COLOR_KEY = 'audiocall_usercolor';

export default function App() {
  // Identity state
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_NAME_KEY) || '';
  });
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    return localStorage.getItem(STORAGE_COLOR_KEY) || '#2563eb';
  });
  const [userId, setUserId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  // Connection & Directory state
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Call state
  const [callStatus, setCallStatus] = useState<
    'idle' | 'outgoing' | 'incoming' | 'in_call'
  >('idle');
  const [callPartner, setCallPartner] = useState<User | null>(null);
  const [incomingCaller, setIncomingCaller] = useState<{
    id: string;
    name: string;
    avatarColor: string;
  } | null>(null);

  // Media & Controls
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [isMicTestOpen, setIsMicTestOpen] = useState<boolean>(false);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const rtcRef = useRef<WebRTCClient>(new WebRTCClient());
  const bannerTimerRef = useRef<number | null>(null);
  const callPartnerRef = useRef<User | null>(null);
  const incomingCallerRef = useRef<{ id: string; name: string; avatarColor: string } | null>(null);

  const showBanner = (message: string) => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }
    setBannerNotice(message);
    bannerTimerRef.current = window.setTimeout(() => {
      setBannerNotice(null);
    }, 4500);
  };

  const sendWs = useCallback((msg: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // WebRTC teardown
  const cleanupCall = useCallback(() => {
    sounds.stopAll();
    rtcRef.current.closePeerConnection();
    callPartnerRef.current = null;
    incomingCallerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCallPartner(null);
    setIncomingCaller(null);
    setIsMuted(false);
    setConnectionState('new');
  }, []);

  // Initialize WebSockets once on mount
  useEffect(() => {
    let reconnectTimer: number | null = null;
    let pingInterval: number | null = null;
    let isUnmounted = false;

    // Set up WebRTC client callbacks
    const rtc = rtcRef.current;
    rtc.onRemoteStream = (stream) => {
      setRemoteStream(stream);
    };

    rtc.onIceCandidate = (candidate) => {
      const activePartner = callPartnerRef.current;
      if (activePartner && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'signal',
            targetId: activePartner.id,
            signal: { type: 'candidate', candidate: candidate.toJSON() },
          })
        );
      }
    };

    rtc.onConnectionStateChange = async (state) => {
      setConnectionState(state);
      if (state === 'connected') {
        setBannerNotice(null);
      } else if (state === 'failed') {
        const partner = callPartnerRef.current;
        if (partner && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          showBanner('Audio connection interrupted. Attempting automatic recovery...');
          const restartOffer = await rtcRef.current.restartIce();
          if (restartOffer) {
            wsRef.current.send(
              JSON.stringify({
                type: 'signal',
                targetId: partner.id,
                signal: { type: 'offer', sdp: restartOffer },
              })
            );
          }
        } else {
          showBanner('Audio peer connection failed.');
        }
      }
    };

    function connect() {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);

        // If user already had a saved name, register immediately
        const savedName = localStorage.getItem(STORAGE_NAME_KEY);
        const savedColor = localStorage.getItem(STORAGE_COLOR_KEY) || '#2563eb';
        if (savedName) {
          ws.send(
            JSON.stringify({
              type: 'register',
              name: savedName,
              avatarColor: savedColor,
            })
          );
        }

        // Keepalive ping
        pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'registered': {
              setUserId(msg.id);
              setUsers(msg.users || []);
              break;
            }

            case 'users_updated': {
              setUsers(msg.users || []);
              break;
            }

            case 'incoming_call': {
              // If already in a call, notify caller that we are busy
              if (callPartnerRef.current) {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'reject_call',
                      callerId: msg.fromId,
                      reason: 'User is currently in another call.',
                    })
                  );
                }
                return;
              }

              sounds.startIncomingRingtone();
              const caller = {
                id: msg.fromId,
                name: msg.fromName,
                avatarColor: msg.fromAvatarColor,
              };
              incomingCallerRef.current = caller;
              setIncomingCaller(caller);
              setCallStatus('incoming');
              break;
            }

            case 'call_accepted': {
              // Partner accepted our outgoing call
              sounds.playConnectedChime();
              const partner: User = {
                id: msg.partnerId,
                name: msg.partnerName,
                status: 'in_call',
                avatarColor: msg.partnerAvatarColor,
              };
              callPartnerRef.current = partner;
              setCallPartner(partner);
              setCallStatus('in_call');

              // Caller initiates the WebRTC offer
              try {
                const stream = await rtcRef.current.getLocalAudioStream();
                setLocalStream(stream);

                const offer = await rtcRef.current.createOffer();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'signal',
                      targetId: msg.partnerId,
                      signal: { type: 'offer', sdp: offer },
                    })
                  );
                }
              } catch (err) {
                console.error('Failed to initiate WebRTC offer:', err);
                showBanner('Microphone permission required to start call');
                cleanupCall();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'end_call', partnerId: msg.partnerId }));
                }
              }
              break;
            }

            case 'call_started': {
              // Target confirmed call has started, waiting for offer
              sounds.playConnectedChime();
              const partner: User = {
                id: msg.partnerId,
                name: msg.partnerName,
                status: 'in_call',
                avatarColor: msg.partnerAvatarColor,
              };
              callPartnerRef.current = partner;
              setCallPartner(partner);
              setCallStatus('in_call');

              try {
                const stream = await rtcRef.current.getLocalAudioStream();
                setLocalStream(stream);
              } catch (err) {
                console.error('Failed to get mic on call start:', err);
                showBanner('Microphone permission required to start call');
              }
              break;
            }

            case 'call_rejected': {
              sounds.playEndChime();
              showBanner(msg.reason || 'Call was declined');
              cleanupCall();
              break;
            }

            case 'call_ended': {
              sounds.playEndChime();
              showBanner(msg.reason || 'Call ended');
              cleanupCall();
              break;
            }

            case 'signal': {
              const signal = msg.signal;
              if (signal.type === 'offer') {
                try {
                  const stream = await rtcRef.current.getLocalAudioStream();
                  setLocalStream(stream);

                  const answer = await rtcRef.current.handleOffer(signal.sdp);
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(
                      JSON.stringify({
                        type: 'signal',
                        targetId: msg.fromId,
                        signal: { type: 'answer', sdp: answer },
                      })
                    );
                  }
                } catch (e) {
                  console.error('Error handling offer:', e);
                }
              } else if (signal.type === 'answer') {
                try {
                  await rtcRef.current.handleAnswer(signal.sdp);
                } catch (e) {
                  console.error('Error handling answer:', e);
                }
              } else if (signal.type === 'candidate' && signal.candidate) {
                try {
                  await rtcRef.current.addIceCandidate(signal.candidate);
                } catch (e) {
                  console.error('Error adding candidate:', e);
                }
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingInterval) clearInterval(pingInterval);
        if (!isUnmounted) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingInterval) clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [cleanupCall]);

  // User registration / Name submit
  const handleRegisterName = (name: string, color: string) => {
    setUserName(name);
    setAvatarColor(color);
    localStorage.setItem(STORAGE_NAME_KEY, name);
    localStorage.setItem(STORAGE_COLOR_KEY, color);
    setIsEditingName(false);

    sendWs({
      type: 'register',
      name,
      avatarColor: color,
    });
  };

  // Initiate Call
  const handleStartCall = async (targetUser: User) => {
    try {
      // Pre-flight mic access check
      const stream = await rtcRef.current.getLocalAudioStream();
      setLocalStream(stream);

      callPartnerRef.current = targetUser;
      setCallPartner(targetUser);
      setCallStatus('outgoing');
      sounds.startOutgoingRingtone();

      sendWs({
        type: 'call_user',
        targetId: targetUser.id,
      });
    } catch (err: any) {
      console.error('Microphone error starting call:', err);
      showBanner('Microphone permission required to place a call');
      cleanupCall();
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    const caller = incomingCallerRef.current || incomingCaller;
    if (!caller) return;

    try {
      const stream = await rtcRef.current.getLocalAudioStream();
      setLocalStream(stream);

      sounds.stopAll();
      sendWs({
        type: 'accept_call',
        callerId: caller.id,
      });
    } catch (err) {
      console.error('Microphone error on accepting call:', err);
      showBanner('Could not access microphone');
      handleDeclineCall();
    }
  };

  // Decline Incoming Call
  const handleDeclineCall = () => {
    const caller = incomingCallerRef.current || incomingCaller;
    if (caller) {
      sendWs({
        type: 'reject_call',
        callerId: caller.id,
        reason: 'Call declined',
      });
    }
    cleanupCall();
  };

  // Cancel Outgoing Call
  const handleCancelOutgoing = () => {
    sendWs({ type: 'cancel_call' });
    cleanupCall();
  };

  // End active call
  const handleEndCall = () => {
    const partner = callPartnerRef.current || callPartner;
    if (partner) {
      sendWs({
        type: 'end_call',
        partnerId: partner.id,
      });
    }
    sounds.playEndChime();
    showBanner('Call ended');
    cleanupCall();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    rtcRef.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
    sounds.playClick(nextMuted);
  };

  // Toggle Sound Effects (Ringtones)
  const handleToggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    sounds.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <Header
        userName={userName}
        avatarColor={avatarColor}
        onlineCount={users.length}
        onEditName={() => setIsEditingName(true)}
        onOpenMicTest={() => setIsMicTestOpen(true)}
        isSoundMuted={isSoundMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Reconnecting banner if WebSocket drops */}
      {!isConnected && (
        <div className="bg-amber-500 text-stone-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>Connecting to real-time calling server...</span>
        </div>
      )}

      {/* Floating notification toast / banner */}
      {bannerNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-stone-900/90 backdrop-blur-md text-white rounded-full text-xs font-medium flex items-center gap-2 shadow-lg animate-fade-in border border-stone-700/50">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {callStatus === 'in_call' && callPartner ? (
          /* Active Voice Call Screen */
          <ActiveCallScreen
            partner={callPartner}
            localStream={localStream}
            remoteStream={remoteStream}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onEndCall={handleEndCall}
            connectionState={connectionState}
          />
        ) : !userName || isEditingName ? (
          /* Name / Setup Screen */
          <NamePrompt
            initialName={userName}
            initialColor={avatarColor}
            onSubmit={handleRegisterName}
            isEditing={isEditingName}
            onCancel={userName ? () => setIsEditingName(false) : undefined}
          />
        ) : (
          /* Online Directory / User List */
          <UserList
            currentUserId={userId}
            users={users}
            onCallUser={handleStartCall}
            disabled={callStatus !== 'idle'}
          />
        )}
      </main>

      {/* Outgoing Call Ringing Overlay */}
      {callStatus === 'outgoing' && callPartner && (
        <OutgoingCallModal partner={callPartner} onCancel={handleCancelOutgoing} />
      )}

      {/* Incoming Call Ringing Overlay */}
      {callStatus === 'incoming' && incomingCaller && (
        <IncomingCallModal
          callerName={incomingCaller.name}
          callerAvatarColor={incomingCaller.avatarColor}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Microphone Test Modal */}
      <MicTestModal isOpen={isMicTestOpen} onClose={() => setIsMicTestOpen(false)} />
    </div>
  );
}
