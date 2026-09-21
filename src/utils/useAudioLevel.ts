import { useState, useEffect, useRef } from 'react';

export function useAudioLevel(stream: MediaStream | null, isMuted: boolean = false) {
  const [level, setLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || isMuted || !stream.active) {
      setLevel(0);
      setIsSpeaking(false);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      audioCtx = new AudioCtx();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      source = audioCtx.createMediaStreamSource(stream);
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
        const normalized = Math.min(1, avg / 128);

        setLevel(normalized);
        setIsSpeaking(normalized > 0.12);

        animFrameRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (err) {
      console.warn('AudioLevel analyser error:', err);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      try {
        source?.disconnect();
        audioCtx?.close();
      } catch (e) {}
    };
  }, [stream, isMuted]);

  return { level, isSpeaking };
}
