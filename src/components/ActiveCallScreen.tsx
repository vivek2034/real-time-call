import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { useAudioLevel } from '../utils/useAudioLevel';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  Radio,
  Wifi,
  AlertCircle,
} from 'lucide-react';

interface ActiveCallScreenProps {
  partner: User;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  connectionState: RTCPeerConnectionState;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  partner,
  localStream,
  remoteStream,
  isMuted,
  onToggleMute,
  onEndCall,
  connectionState,
}) => {
  const [duration, setDuration] = useState(0);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Measure audio levels for visualizer
  const { level: localLevel, isSpeaking: isLocalSpeaking } = useAudioLevel(localStream, isMuted);
  const { level: remoteLevel, isSpeaking: isRemoteSpeaking } = useAudioLevel(remoteStream, isSpeakerMuted);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Attach remote stream to audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch((err) => {
          console.warn('Audio autoplay prevented by browser:', err);
          setAutoplayBlocked(true);
        });
    }
  }, [remoteStream]);

  const handleManualPlay = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => {
        setAutoplayBlocked(false);
      });
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerMuted;
      setIsSpeakerMuted(!isSpeakerMuted);
    }
  };

  // Keyboard shortcut: 'm' for mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !e.repeat) {
        onToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleMute]);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Hidden audio element for WebRTC remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Safari / Mobile Autoplay Permission Banner if blocked */}
      {autoplayBlocked && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Browser paused audio playback. Tap to activate speaker.</span>
          </div>
          <button
            id="unblock-audio-button"
            type="button"
            onClick={handleManualPlay}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shrink-0 transition-colors"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Main Call Card */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-800 flex flex-col items-center justify-between min-h-[440px] relative overflow-hidden">
        {/* Subtle background glow effect when speaking */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: partner.avatarColor || '#2563eb',
            opacity: isRemoteSpeaking ? 0.25 : 0.08,
          }}
        />

        {/* Top bar: duration & connection status */}
        <div className="w-full flex items-center justify-between text-xs text-stone-400 z-10">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-stone-800/80 backdrop-blur-md rounded-full border border-stone-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-emerald-400 font-semibold text-xs tracking-wider">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800/80 backdrop-blur-md rounded-full border border-stone-700/50 text-stone-300 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted P2P</span>
          </div>
        </div>

        {/* Center: Partner Avatar with Speaking Pulse */}
        <div className="flex flex-col items-center my-6 z-10 text-center">
          <div className="relative mb-5 flex items-center justify-center">
            {/* Dynamic speaking pulse rings */}
            <div
              className="absolute rounded-full transition-all duration-150 pointer-events-none"
              style={{
                width: `${120 + remoteLevel * 60}px`,
                height: `${120 + remoteLevel * 60}px`,
                backgroundColor: partner.avatarColor || '#2563eb',
                opacity: isRemoteSpeaking ? 0.35 : 0.05,
              }}
            />
            <div
              className="absolute rounded-full transition-all duration-200 pointer-events-none"
              style={{
                width: `${100 + remoteLevel * 30}px`,
                height: `${100 + remoteLevel * 30}px`,
                backgroundColor: partner.avatarColor || '#2563eb',
                opacity: isRemoteSpeaking ? 0.5 : 0.1,
              }}
            />

            {/* Avatar circle */}
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl z-10 transition-transform duration-150"
              style={{
                backgroundColor: partner.avatarColor || '#2563eb',
                transform: isRemoteSpeaking ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {partner.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Partner Name */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {partner.name}
          </h2>

          {/* Live Status indicator */}
          <div className="flex items-center gap-2 mt-2">
            {isRemoteSpeaking ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                Speaking...
              </span>
            ) : (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-stone-500" />
                {connectionState === 'connected' ? 'Connected' : 'Connecting stream...'}
              </span>
            )}
          </div>

          {/* Audio Waveform Bars (Interactive visualizer) */}
          <div className="flex items-center gap-1 mt-4 h-6 px-4 py-1 bg-stone-800/60 rounded-full">
            {[0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6].map((multiplier, i) => {
              const barHeight = Math.max(
                4,
                Math.round(20 * (isRemoteSpeaking ? remoteLevel * multiplier : 0.1))
              );
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isRemoteSpeaking ? 'bg-emerald-400' : 'bg-stone-600'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom: Microphone level & controls */}
        <div className="w-full flex flex-col items-center gap-5 z-10">
          {/* User's own microphone status bar */}
          <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-800/70 px-3 py-1.5 rounded-full border border-stone-700/40">
            <span className="text-stone-400">Your Mic:</span>
            {isMuted ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <MicOff className="w-3 h-3" /> Muted
              </span>
            ) : isLocalSpeaking ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Speaking
              </span>
            ) : (
              <span className="text-stone-300">Listening (Ready)</span>
            )}
            {/* Small local mic audio meter */}
            {!isMuted && (
              <div className="w-10 h-1.5 bg-stone-700 rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, localLevel * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Call Controls Dock */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Mute Mic button */}
            <button
              id="mute-mic-button"
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Unmute microphone (Press M)' : 'Mute microphone (Press M)'}
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              <span className="text-[10px] mt-0.5 font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* End Call Button */}
            <button
              id="end-call-button"
              type="button"
              onClick={onEndCall}
              title="End call"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-600/40 transition-all transform hover:scale-105"
            >
              <PhoneOff className="w-7 h-7" />
              <span className="text-[10px] mt-0.5 font-bold uppercase tracking-wider">End</span>
            </button>

            {/* Speaker Mute/Deafen button */}
            <button
              id="toggle-speaker-button"
              type="button"
              onClick={toggleSpeaker}
              title={isSpeakerMuted ? 'Unmute remote audio' : 'Mute remote audio'}
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
                isSpeakerMuted
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              <span className="text-[10px] mt-0.5 font-medium">
                {isSpeakerMuted ? 'Silent' : 'Speaker'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
