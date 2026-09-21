import React, { useState } from 'react';
import { User } from '../types';
import { Phone, Search, Users, ExternalLink, Copy, Check, Info, Sparkles } from 'lucide-react';

interface UserListProps {
  currentUserId: string;
  users: User[];
  onCallUser: (targetUser: User) => void;
  disabled?: boolean;
}

export const UserList: React.FC<UserListProps> = ({
  currentUserId,
  users,
  onCallUser,
  disabled = false,
}) => {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  // Exclude current user from callable list
  const otherUsers = users.filter((u) => u.id !== currentUserId);

  // Filter based on search query
  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenTestWindow = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Search & Directory Title */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span>Online People</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                {otherUsers.length} available
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Select anyone below to start an instant voice call.
            </p>
          </div>

          {/* Quick invite / test tab action */}
          <div className="flex items-center gap-2">
            <button
              id="copy-invite-link-button"
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              id="open-test-window-button"
              type="button"
              onClick={handleOpenTestWindow}
              title="Open a second browser tab with another user to test calling"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Test Tab</span>
            </button>
          </div>
        </div>

        {/* Search bar (if multiple users) */}
        {otherUsers.length > 2 && (
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-users-input"
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>
        )}

        {/* Users list */}
        {filteredUsers.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {filteredUsers.map((user) => {
              const isAvailable = user.status === 'available';
              const isInCall = user.status === 'in_call';
              const isRinging = user.status === 'ringing' || user.status === 'calling';

              return (
                <div
                  key={user.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow-xs"
                        style={{ backgroundColor: user.avatarColor || '#2563eb' }}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      {/* Status indicator dot */}
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                          isAvailable
                            ? 'bg-emerald-500'
                            : isInCall
                            ? 'bg-amber-500'
                            : 'bg-blue-500 animate-pulse'
                        }`}
                        title={
                          isAvailable
                            ? 'Available to call'
                            : isInCall
                            ? 'Busy in call'
                            : 'Connecting'
                        }
                      />
                    </div>

                    {/* Name & Status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900 text-sm truncate">
                          {user.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                        {isAvailable && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ready to call
                          </span>
                        )}
                        {isInCall && (
                          <span className="text-amber-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            In another call
                          </span>
                        )}
                        {isRinging && (
                          <span className="text-blue-700 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            Calling...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Call Button */}
                  <button
                    id={`call-user-${user.id}`}
                    type="button"
                    onClick={() => onCallUser(user)}
                    disabled={!isAvailable || disabled}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                      isAvailable && !disabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer shadow-emerald-600/20'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/60'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isAvailable ? 'Call' : isInCall ? 'Busy' : 'Unavailable'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : otherUsers.length === 0 ? (
          /* Empty state: Waiting for people to join */
          <div className="py-10 px-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-stone-800 mb-1">
              You're the only one online right now
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5 leading-relaxed">
              Open this website in a second browser window, or send the link to a colleague on another phone or computer to test the call!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                id="empty-test-tab-button"
                type="button"
                onClick={handleOpenTestWindow}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs shadow-emerald-600/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Second Window to Test</span>
              </button>
              <button
                id="empty-copy-link-button"
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                <span>{copied ? 'Copied!' : 'Copy Shareable Link'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* No search matches */
          <div className="py-8 text-center text-xs text-stone-500">
            No users found matching "{search}"
          </div>
        )}
      </div>

      {/* Cross-Device / Browser tip card */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Direct peer-to-peer audio: </span>
          Calls run directly between browsers using encrypted WebRTC streams. Works smoothly across Chrome, Safari (iPhone/iPad/Mac), Firefox, and Edge with no extensions required.
        </div>
      </div>
    </div>
  );
};
