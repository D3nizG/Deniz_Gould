'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Play, Bot, User } from 'lucide-react';
import { scaleIn } from '@/lib/motion.client';

const MsPacmanCanvas = dynamic(
  () => import('../src/components/MsPacmanCanvas'),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-black" /> }
);

interface GameBezelProps {
  animate?: boolean;
}

export default function GameBezel({ animate = true }: GameBezelProps) {
  const [isAIMode, setIsAIMode] = useState(true);
  const [gameKey, setGameKey] = useState(0);

  const switchMode = (ai: boolean) => {
    setIsAIMode(ai);
    setGameKey((k) => k + 1);
  };

  return (
    <motion.div
      variants={animate ? scaleIn : undefined}
      className="w-full max-w-[560px] mx-auto flex flex-col rounded-2xl overflow-hidden border border-accent-primary/30 bg-black"
      style={{
        boxShadow:
          '0 0 60px rgba(100,255,218,0.07), inset 0 0 40px rgba(100,255,218,0.03)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent-primary/20">
        <span className="font-mono text-xs text-accent-primary tracking-widest uppercase">
          Ms. Pac-Man AI
        </span>
        <span
          className={`text-xs font-mono px-2.5 py-0.5 rounded-full border transition-colors ${
            isAIMode
              ? 'border-accent-secondary/40 text-accent-secondary bg-accent-secondary/10'
              : 'border-accent-primary/40 text-accent-primary bg-accent-primary/10'
          }`}
        >
          {isAIMode ? 'AI Mode' : 'Manual'}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-square">
        <MsPacmanCanvas key={gameKey} mode={isAIMode ? 'ai' : 'manual'} />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-accent-primary/20">
        {/* Segmented toggle */}
        <div className="flex rounded-lg border border-fg/20 overflow-hidden text-xs font-mono">
          <button
            onClick={() => switchMode(true)}
            aria-pressed={isAIMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              isAIMode
                ? 'bg-accent-secondary/20 text-accent-secondary'
                : 'text-fg/50 hover:text-fg/80'
            }`}
          >
            <Bot size={13} />
            AI
          </button>
          <button
            onClick={() => switchMode(false)}
            aria-pressed={!isAIMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-fg/20 transition-colors ${
              !isAIMode
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-fg/50 hover:text-fg/80'
            }`}
          >
            <User size={13} />
            Manual
          </button>
        </div>

        {/* Restart/Play button */}
        <button
          onClick={() => setGameKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono rounded-lg bg-accent-primary/15 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/25 transition-colors"
        >
          <Play size={13} />
          {gameKey > 0 ? 'Restart' : 'Play'}
        </button>
      </div>
    </motion.div>
  );
}
