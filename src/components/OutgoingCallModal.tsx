import React from 'react';
import { PhoneOff, Loader2 } from 'lucide-react';
import { User } from '../types';

interface OutgoingCallModalProps {
  partner: User;
  onCancel: () => void;
}

export const OutgoingCallModal: React.FC<OutgoingCallModalProps> = ({ partner, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-800 flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: partner.avatarColor || '#2563eb' }}
        />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Calling...</span>
        </div>

        {/* Pulsing Avatar */}
        <div className="relative mb-5 flex items-center justify-center">
          <div
            className="absolute w-32 h-32 rounded-full animate-ping opacity-25 pointer-events-none"
            style={{ backgroundColor: partner.avatarColor || '#2563eb' }}
          />
          <div
            className="absolute w-28 h-28 rounded-full animate-pulse opacity-40 pointer-events-none"
            style={{ backgroundColor: partner.avatarColor || '#2563eb' }}
          />
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl relative z-10"
            style={{ backgroundColor: partner.avatarColor || '#2563eb' }}
          >
            {partner.name.charAt(0).toUpperCase()}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white tracking-tight mb-1">{partner.name}</h3>
        <p className="text-xs text-stone-400 mb-8">Ringing device, waiting for answer...</p>

        {/* Cancel Call Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            id="cancel-outgoing-call-button"
            type="button"
            onClick={onCancel}
            title="Cancel call"
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <span className="text-xs text-stone-400 font-medium">Cancel Call</span>
        </div>
      </div>
    </div>
  );
};
