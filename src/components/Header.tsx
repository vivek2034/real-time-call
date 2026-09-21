import React from 'react';
import { PhoneCall, Volume2, VolumeX, Mic, User as UserIcon, Edit2 } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

interface HeaderProps {
  userName: string;
  avatarColor: string;
  onlineCount: number;
  onEditName: () => void;
  onOpenMicTest: () => void;
  isSoundMuted: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  avatarColor,
  onlineCount,
  onEditName,
  onOpenMicTest,
  isSoundMuted,
  onToggleSound,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 tracking-tight text-lg">Audio Call</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Browser-to-browser voice calling • No registration
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound effects toggle */}
          <button
            id="toggle-sounds-button"
            type="button"
            onClick={onToggleSound}
            title={isSoundMuted ? 'Unmute call ringtones' : 'Mute call ringtones'}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Test Microphone button */}
          <button
            id="test-mic-button"
            type="button"
            onClick={onOpenMicTest}
            title="Test your microphone"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
          >
            <Mic className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Test Mic</span>
          </button>

          {/* Current User Badge */}
          {userName && (
            <button
              id="edit-profile-button"
              type="button"
              onClick={onEditName}
              title="Click to change your display name"
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-full transition-colors group text-left"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: avatarColor || '#2563eb' }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-stone-800 max-w-[100px] sm:max-w-[140px] truncate">
                {userName}
              </span>
              <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-stone-600 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
