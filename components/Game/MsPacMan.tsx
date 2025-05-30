'use client';

import { useEffect, useRef } from 'react';
import  * as Phaser from 'phaser';

export default function MsPacMan() {
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (!containerRef.current) return;
// dynamic import game scene later – placeholder black square for now
const width = containerRef.current.clientWidth;
const height = containerRef.current.clientHeight;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width,
  height,
  parent: containerRef.current,
  scene: {
    create() {
      this.add.text(width / 2, height / 2, 'Ms Pac-Man AI\nComing soon…', {
        fontFamily: 'Fira Code',
        color: '#64FFDA',
        align: 'center'
      }).setOrigin(0.5);
    }
  }
};

const game = new Phaser.Game(config);
return () => game.destroy(true);

}, []);

return <div ref={containerRef} className="w-full h-full bg-black rounded-2xl" />;
}