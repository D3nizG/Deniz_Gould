export const playNote = (() => {
let context: AudioContext | null = null;

const majorScale = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88]; // C major Hz

return () => {
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
if (!context) context = new (window.AudioContext || (window as any).webkitAudioContext)();

const oscillator = context.createOscillator();
const gain = context.createGain();

oscillator.type = 'sine';
oscillator.frequency.value = majorScale[Math.floor(Math.random() * majorScale.length)];
gain.gain.setValueAtTime(0.2, context.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);

oscillator.connect(gain).connect(context.destination);
oscillator.start();
oscillator.stop(context.currentTime + 0.25);

};
})();