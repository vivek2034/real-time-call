import React, { useState } from 'react';
import { User, ArrowRight, Sparkles } from 'lucide-react';

interface NamePromptProps {
  initialName?: string;
  initialColor?: string;
  onSubmit: (name: string, color: string) => void;
  isEditing?: boolean;
  onCancel?: () => void;
}

const PRESET_NAMES = ['Alex', 'Taylor', 'Jordan', 'Sam', 'Morgan', 'Casey', 'Robin', 'Quinn'];

const AVATAR_COLORS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#059669', // Emerald
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#d97706', // Amber
];

export const NamePrompt: React.FC<NamePromptProps> = ({
  initialName = '',
  initialColor = '#2563eb',
  onSubmit,
  isEditing = false,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a display name to continue');
      return;
    }
    if (cleanName.length > 25) {
      setError('Name must be 25 characters or fewer');
      return;
    }
    setError('');
    onSubmit(cleanName, color);
  };

  const handlePickPreset = (preset: string) => {
    setName(preset);
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm shadow-stone-200/50 p-6 sm:p-8">
        {/* Avatar preview */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md transition-all"
            style={{ backgroundColor: color }}
          >
            {name.trim() ? name.trim().charAt(0).toUpperCase() : <User className="w-9 h-9" />}
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {isEditing ? 'Update your display name' : 'Welcome to Audio Call'}
          </h2>
          <p className="text-sm text-stone-500 mt-1 max-w-xs">
            {isEditing
              ? 'Change how other users see you in the calling directory.'
              : 'Zero registration needed. Choose a name so others know who is calling.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="user-name-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              Your Display Name
            </label>
            <div className="relative">
              <input
                id="user-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Alex"
                maxLength={25}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium transition-all"
              />
            </div>
            {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Quick preset suggestions */}
          <div>
            <div className="flex items-center gap-1 text-xs text-stone-500 mb-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or pick a quick name:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePickPreset(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    name === preset
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Color choice */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
              Avatar Color
            </span>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-stone-900 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-2">
            {isEditing && onCancel && (
              <button
                id="cancel-name-edit-button"
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              id="submit-name-button"
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all"
            >
              <span>{isEditing ? 'Save Changes' : 'Start Calling'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
