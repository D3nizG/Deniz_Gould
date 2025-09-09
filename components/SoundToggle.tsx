'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useUIStore } from '../lib/store';
import { useEffect, useState } from 'react';
import { playNote } from '../lib/audio';

export default function SoundToggle() {
  const { muted, toggleMute } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Only render after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleHover = () => {
    // Only play sound when unmuted (sound is on)
    if (!muted) {
      playNote();
    }
  };

  // Show a placeholder during SSR/hydration
  if (!mounted) {
    return (
      <button 
        aria-label="Toggle sound" 
        className="p-2 rounded-full hover:bg-accent-primary/20 transition opacity-50"
      >
        <div className="w-[18px] h-[18px]" /> {/* Placeholder to maintain layout */}
      </button>
    );
  }

  return (
    <button 
      aria-label="Toggle sound" 
      className="p-2 rounded-full hover:bg-accent-primary/20 transition" 
      onClick={toggleMute}
      onMouseEnter={handleHover}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
