'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';

export default function MsPacMan() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Wait for container to be properly sized
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const size = Math.min(containerRect.width, containerRect.height);
      
      // Clear any existing game
      containerRef.current.innerHTML = '';
      
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: size,
        height: size,
        parent: containerRef.current,
        backgroundColor: '#000000',
        scene: {
          create() {
            this.add.text(size / 2, size / 2, 'Ms Pac-Man AI\nComing soon…', {
              fontFamily: 'Inter, sans-serif',
              fontSize: Math.max(16, size * 0.04) + 'px',
              color: '#64FFDA',
              align: 'center'
            }).setOrigin(0.5);
          }
        }
      };

      const game = new Phaser.Game(config);
      
      // Store game instance for cleanup
      (containerRef.current as any).gameInstance = game;
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (containerRef.current && (containerRef.current as any).gameInstance) {
        (containerRef.current as any).gameInstance.destroy(true);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '200px' }} // Ensure minimum size for mobile
    />
  );
}