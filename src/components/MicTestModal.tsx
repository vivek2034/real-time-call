import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface MicTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MicTestModal: React.FC<MicTestModalProps> = ({ isOpen, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [level, setLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    let isMounted = true;

    async function testMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);
        setErrorMessage('');

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const update = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setLevel(Math.min(1, avg / 120));
            animRef.current = requestAnimationFrame(update);
          };

          update();
        }
      } catch (err: any) {
        if (!isMounted) return;
        setHasPermission(false);
        setErrorMessage(
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Microphone permission was denied. Please allow microphone access in your browser URL bar.'
            : 'Could not access microphone. Please ensure an input device is connected.'
        );
      }
    }

    testMic();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLevel(0);
    setHasPermission(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 shadow-xl relative">
        <button
          id="close-mic-test-modal"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">Microphone Check</h3>
            <p className="text-xs text-stone-500">Verify your audio input before calling</p>
          </div>
        </div>

        {hasPermission === true && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Microphone is active and working. Speak to test audio levels.</span>
            </div>

            {/* Level meter */}
            <div>
              <div className="flex justify-between text-xs text-stone-600 font-medium mb-1.5">
                <span>Input Level</span>
                <span>{Math.round(level * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, level * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900 mb-1">Microphone Access Error</p>
              <p className="leading-relaxed text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {hasPermission === null && (
          <div className="py-6 text-center text-xs text-stone-500">
            Requesting microphone access...
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            id="finish-mic-test-button"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
