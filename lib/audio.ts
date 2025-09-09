import { useUIStore } from './store';

export const playNote = (() => {
  let context: AudioContext | null = null;

  // Let's Get It Started bassline — 2 octaves up (×4) for audibility
  const bassline = [
    // --- Phrase 1 ---
    246.96, // 2B
    185.00, // 1F#
    246.96, // 2B
    277.20, // 2C#
    293.68, // 2D
    220.00, // 1A
    293.68, // 2D
    220.00, // 1A
    196.00, // 1G
    293.68, // 2D
    392.00, // 3G
    293.68, // 2D
    185.00, // 1F#
    277.20, // 2C#
    370.00, // 3F#
    277.20, // 2C#


    // --- Phrase 2  ---
    246.96, // 2B
    370.00, // 3F#
    493.88, // 4B
    554.36, // 4C#
    587.32, // 4D
    440.00, // 3A
    293.68, // 2D
    220.00, // 1A

    196.00, // 1G
    293.68, // 2D
    392.00, // 3G
    293.68, // 2D

    185.00, // 1F#
    277.20, // 2C#
    370.00, // 3F#
    277.20, // 2C#
  ];

  let index = 0; // which note we’re on

  return () => {
    // Check if sound is muted
    const { muted } = useUIStore.getState();
    if (muted) return;
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!context) context = new (window.AudioContext || (window as any).webkitAudioContext)();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = bassline[index];

    // short pluck envelope
    const now = context.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(now + 0.25);

    index = (index + 1) % bassline.length; // loop
  };
})();
