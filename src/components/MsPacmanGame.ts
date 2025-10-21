// Ms. Pac-Man Game Engine
// Handles game state, rendering, and physics

import mapData from '../../assets/msmap1.json';
import { ACTION_TO_DIRECTION } from '../ai/constants';

export interface GameState {
  score: number;
  lives: number;
  pelletsLeft: number;
  mode: 'manual' | 'ai';
  gameOver: boolean;
  paused: boolean;
  level: number;
}

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  x: number;
  y: number;
  color: string;
  direction: { dx: number; dy: number };
  mode: 'chase' | 'scatter' | 'frightened';
  frightTimer: number;
}

export class MsPacmanGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  
  // Map data
  private map: string[];
  private tileSize: number;
  private mapWidth: number;
  private mapHeight: number;
  
  // Game entities
  private pacman: Position & { direction: { dx: number; dy: number }; mouthAngle: number };
  private ghosts: Ghost[];
  private pellets: Set<string>;
  private powerPellets: Set<string>;
  
  // Animation
  private animationFrame: number = 0;
  
  // Input
  private nextDirection: { dx: number; dy: number } | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Load map
    this.map = mapData.walls;
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;
    
    // Calculate tile size based on canvas
    const canvasSize = Math.min(canvas.width, canvas.height);
    this.tileSize = Math.floor(canvasSize / Math.max(this.mapWidth, this.mapHeight));
    
    // Initialize game state
    this.state = {
      score: 0,
      lives: 3,
      pelletsLeft: 0,
      mode: 'manual',
      gameOver: false,
      paused: false,
      level: 1,
    };
    
    // Initialize entities
    this.pacman = {
      x: mapData.pacmanStart.x,
      y: mapData.pacmanStart.y,
      direction: { dx: 0, dy: 0 },
      mouthAngle: 0,
    };
    
    this.ghosts = mapData.ghostStarts.map(g => ({
      x: g.x,
      y: g.y,
      color: g.color,
      direction: { dx: 0, dy: -1 },
      mode: 'scatter' as const,
      frightTimer: 0,
    }));
    
    // Initialize pellets
    this.pellets = new Set();
    this.powerPellets = new Set();
    this.initializePellets();
  }
  
  private initializePellets(): void {
    // Add pellets to all walkable tiles
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        if (tile === '.' || tile === ' ') {
          this.pellets.add(`${x},${y}`);
        } else if (tile === '*') {
          this.powerPellets.add(`${x},${y}`);
        }
      }
    }
    this.state.pelletsLeft = this.pellets.size + this.powerPellets.size;
  }
  
  public setMode(mode: 'manual' | 'ai'): void {
    this.state.mode = mode;
  }
  
  public getState(): GameState {
    return { ...this.state };
  }
  
  public handleKeyPress(key: string): void {
    if (this.state.mode !== 'manual') return;
    
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.nextDirection = { dx: 0, dy: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.nextDirection = { dx: 0, dy: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.nextDirection = { dx: -1, dy: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.nextDirection = { dx: 1, dy: 0 };
        break;
    }
  }
  
  public handleAIAction(action: number): void {
    if (this.state.mode !== 'ai') return;
    
    const direction = ACTION_TO_DIRECTION[action as keyof typeof ACTION_TO_DIRECTION];
    if (direction) {
      this.nextDirection = direction;
    }
  }
  
  private isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= this.map.length) return false;
    if (x < 0 || x >= this.map[y].length) return false;
    
    const tile = this.map[y][x];
    return tile !== '#' && tile !== '-';
  }
  
  public update(_deltaTime: number): void {
    if (this.state.gameOver || this.state.paused) return;
    
    this.animationFrame++;
    
    // Update Pac-Man position
    if (this.nextDirection) {
      const newX = Math.round(this.pacman.x + this.nextDirection.dx * 0.1);
      const newY = Math.round(this.pacman.y + this.nextDirection.dy * 0.1);
      
      if (this.isWalkable(newX, newY)) {
        this.pacman.direction = this.nextDirection;
      }
    }
    
    // Move Pac-Man
    if (this.pacman.direction.dx !== 0 || this.pacman.direction.dy !== 0) {
      const newX = this.pacman.x + this.pacman.direction.dx * 0.1;
      const newY = this.pacman.y + this.pacman.direction.dy * 0.1;
      
      if (this.isWalkable(Math.round(newX), Math.round(newY))) {
        this.pacman.x = newX;
        this.pacman.y = newY;
        
        // Wrap around tunnels
        if (this.pacman.x < 0) this.pacman.x = this.mapWidth - 1;
        if (this.pacman.x >= this.mapWidth) this.pacman.x = 0;
      }
    }
    
    // Check pellet collision
    const pacmanTile = `${Math.round(this.pacman.x)},${Math.round(this.pacman.y)}`;
    if (this.pellets.has(pacmanTile)) {
      this.pellets.delete(pacmanTile);
      this.state.score += 10;
      this.state.pelletsLeft--;
    }
    if (this.powerPellets.has(pacmanTile)) {
      this.powerPellets.delete(pacmanTile);
      this.state.score += 50;
      this.state.pelletsLeft--;
      // Frighten ghosts
      this.ghosts.forEach(g => {
        g.mode = 'frightened';
        g.frightTimer = 180; // ~3 seconds at 60 FPS
      });
    }
    
    // Update ghosts
    this.updateGhosts();
    
    // Check game over
    if (this.state.pelletsLeft === 0) {
      this.state.gameOver = true;
    }
  }
  
  private updateGhosts(): void {
    this.ghosts.forEach(ghost => {
      // Update fright timer
      if (ghost.frightTimer > 0) {
        ghost.frightTimer--;
        if (ghost.frightTimer === 0) {
          ghost.mode = 'chase';
        }
      }
      
      // Simple ghost AI: move randomly
      if (this.animationFrame % 10 === 0) {
        const directions = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ].filter(d => 
          this.isWalkable(
            Math.round(ghost.x + d.dx),
            Math.round(ghost.y + d.dy)
          )
        );
        
        if (directions.length > 0) {
          ghost.direction = directions[Math.floor(Math.random() * directions.length)];
        }
      }
      
      // Move ghost
      const speed = ghost.mode === 'frightened' ? 0.05 : 0.08;
      ghost.x += ghost.direction.dx * speed;
      ghost.y += ghost.direction.dy * speed;
      
      // Check collision with Pac-Man
      const dist = Math.hypot(ghost.x - this.pacman.x, ghost.y - this.pacman.y);
      if (dist < 0.5) {
        if (ghost.mode === 'frightened') {
          // Eat ghost
          this.state.score += 200;
          ghost.x = mapData.ghostHouse.x;
          ghost.y = mapData.ghostHouse.y;
          ghost.mode = 'scatter';
        } else {
          // Lose life
          this.state.lives--;
          if (this.state.lives <= 0) {
            this.state.gameOver = true;
          } else {
            this.resetPositions();
          }
        }
      }
    });
  }
  
  private resetPositions(): void {
    this.pacman.x = mapData.pacmanStart.x;
    this.pacman.y = mapData.pacmanStart.y;
    this.pacman.direction = { dx: 0, dy: 0 };
    
    mapData.ghostStarts.forEach((g, i) => {
      this.ghosts[i].x = g.x;
      this.ghosts[i].y = g.y;
      this.ghosts[i].mode = 'scatter';
      this.ghosts[i].frightTimer = 0;
    });
  }
  
  public render(): void {
    const { ctx } = this;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw map
    this.renderMap();
    
    // Draw pellets
    this.renderPellets();
    
    // Draw Pac-Man
    this.renderPacman();
    
    // Draw ghosts
    this.renderGhosts();
  }
  
  private renderMap(): void {
    const { ctx, map } = this;
    const tileSize = this.tileSize;
    
    ctx.strokeStyle = '#2121ff';
    ctx.lineWidth = 2;
    
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const tile = map[y][x];
        if (tile === '#' || tile === '-') {
          ctx.strokeRect(
            x * tileSize,
            y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    }
  }
  
  private renderPellets(): void {
    const { ctx, tileSize } = this;
    
    ctx.fillStyle = '#ffb8ae';
    this.pellets.forEach(pellet => {
      const [x, y] = pellet.split(',').map(Number);
      ctx.beginPath();
      ctx.arc(
        x * tileSize + tileSize / 2,
        y * tileSize + tileSize / 2,
        tileSize / 8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    
    // Power pellets (pulsing)
    const pulseSize = (Math.sin(this.animationFrame / 10) + 1) * 0.15 + 0.2;
    ctx.fillStyle = '#ffb8ae';
    this.powerPellets.forEach(pellet => {
      const [x, y] = pellet.split(',').map(Number);
      ctx.beginPath();
      ctx.arc(
        x * tileSize + tileSize / 2,
        y * tileSize + tileSize / 2,
        tileSize * pulseSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }
  
  private renderPacman(): void {
    const { ctx, tileSize, pacman } = this;
    
    const centerX = pacman.x * tileSize + tileSize / 2;
    const centerY = pacman.y * tileSize + tileSize / 2;
    const radius = tileSize * 0.4;
    
    // Mouth animation
    const mouthAngle = (Math.sin(this.animationFrame / 5) + 1) * 0.2 + 0.1;
    
    // Direction angle
    let angle = 0;
    if (pacman.direction.dx > 0) angle = 0;
    else if (pacman.direction.dx < 0) angle = Math.PI;
    else if (pacman.direction.dy > 0) angle = Math.PI / 2;
    else if (pacman.direction.dy < 0) angle = -Math.PI / 2;
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, angle + mouthAngle, angle - mouthAngle + Math.PI * 2);
    ctx.lineTo(centerX, centerY);
    ctx.fill();
  }
  
  private renderGhosts(): void {
    const { ctx, tileSize, ghosts } = this;
    
    ghosts.forEach(ghost => {
      const centerX = ghost.x * tileSize + tileSize / 2;
      const centerY = ghost.y * tileSize + tileSize / 2;
      const radius = tileSize * 0.4;
      
      // Ghost color
      if (ghost.mode === 'frightened') {
        ctx.fillStyle = ghost.frightTimer % 20 < 10 ? '#2121ff' : '#ffffff';
      } else {
        ctx.fillStyle = ghost.color;
      }
      
      // Draw ghost body (circle)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, 0);
      ctx.lineTo(centerX + radius, centerY + radius);
      ctx.lineTo(centerX - radius, centerY + radius);
      ctx.fill();
      
      // Draw eyes
      if (ghost.mode !== 'frightened') {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(centerX - radius / 3, centerY - radius / 4, radius / 4, 0, Math.PI * 2);
        ctx.arc(centerX + radius / 3, centerY - radius / 4, radius / 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - radius / 3, centerY - radius / 4, radius / 8, 0, Math.PI * 2);
        ctx.arc(centerX + radius / 3, centerY - radius / 4, radius / 8, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  public getCanvasImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
  
  public pause(): void {
    this.state.paused = true;
  }
  
  public resume(): void {
    this.state.paused = false;
  }
  
  public reset(): void {
    this.state.score = 0;
    this.state.lives = 3;
    this.state.gameOver = false;
    this.state.paused = false;
    this.pellets.clear();
    this.powerPellets.clear();
    this.initializePellets();
    this.resetPositions();
  }
}

