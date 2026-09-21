import React from 'react';
import { Phone, PhoneOff, Radio } from 'lucide-react';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatarColor?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  callerAvatarColor = '#2563eb',
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-800 flex flex-col items-center text-center relative overflow-hidden">
        {/* Pulsing halo */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: callerAvatarColor }}
        />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          <span>Incoming Audio Call</span>
        </div>

        {/* Caller Avatar with ring animation */}
        <div className="relative mb-4">
          <div
            className="absolute -inset-3 rounded-full animate-ping opacity-30 pointer-events-none"
            style={{ backgroundColor: callerAvatarColor }}
          />
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl relative z-10"
            style={{ backgroundColor: callerAvatarColor }}
          >
            {callerName.charAt(0).toUpperCase()}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white tracking-tight mb-1">{callerName}</h3>
        <p className="text-xs text-stone-400 mb-8">is requesting a real-time voice call...</p>

        {/* Action buttons */}
        <div className="w-full flex items-center justify-center gap-6">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="decline-call-button"
              type="button"
              onClick={onDecline}
              title="Decline call"
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] text-stone-400 font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="accept-call-button"
              type="button"
              onClick={onAccept}
              title="Accept call"
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40 transition-all hover:scale-105 animate-bounce"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-[11px] text-emerald-400 font-semibold">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
