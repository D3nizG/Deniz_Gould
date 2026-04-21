// Ms. Pac-Man Game Engine
// Handles game state, rendering, and physics

import mapData from '../../assets/msmap1.json';
import { ACTION_NAMES, ACTION_TO_INTENTS } from '../ai/constants';
import {
  pushTrace,
  isTraceEnabled,
  type CardinalName,
  type Direction,
  type PacSnapshot,
} from '../ai/trace';

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

interface RenderMetrics {
  boardHeight: number;
  boardWidth: number;
  offsetX: number;
  offsetY: number;
}

export const MS_PACMAN_WORLD_SIZE = {
  width: mapData.width,
  height: mapData.height,
} as const;

// Tile semantics (from msmap1.json `walls`):
//   '#' wall          — non-walkable for all
//   '.' pellet lane   — walkable, carries a pellet
//   '*' power pellet  — walkable, carries a power pellet
//   ' ' open corridor — walkable, no pellet (tunnel rows, ghost-house exterior)
//   '-' ghost door    — walkable by ghosts only; Pac-Man cannot cross
//   'x' void / ghost-house interior — walkable by ghosts only; off-limits to Pac-Man
const TILE = {
  WALL:     '#',
  PELLET:   '.',
  POWER:    '*',
  CORRIDOR: ' ',
  DOOR:     '-',
  VOID:     'x',
} as const;

const PACMAN_SPEED_TILES_PER_SECOND = 4.15;
const GHOST_SPEED_TILES_PER_SECOND = 3.4;
const FRIGHTENED_GHOST_SPEED_TILES_PER_SECOND = 2.35;
const FRIGHTENED_DURATION_MS = 3000;
const GHOST_DECISION_INTERVAL_MS = 180;
const MAX_FRAME_TIME_MS = 34;
const COLLISION_DISTANCE = 0.55;

export class MsPacmanGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  // Map data
  private map: string[];
  private tileSize: number;
  private mapWidth: number;
  private mapHeight: number;
  private renderMetrics: RenderMetrics;

  // Game entities
  private pacman: Position & { direction: { dx: number; dy: number }; mouthAngle: number };
  private ghosts: Ghost[];
  private pellets: Set<string>;
  private powerPellets: Set<string>;

  // Animation
  private animationFrame: number = 0;
  private ghostDecisionTimerMs: number = 0;

  // Input — priority-ordered list of cardinal intents. The first intent that
  // becomes legal this frame commits and clears the list; otherwise the list
  // persists so pre-turn intents fire at the next valid turn opportunity.
  private pendingIntents: Direction[] = [];

  // Diagnostics state (only read when tracing is enabled)
  private wasBlockedLastFrame: boolean = false;
  private lastMoveAtMs: number = 0;
  private stuckReported: boolean = false;
  private lastMovePos: { x: number; y: number } = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Load map
    this.map = mapData.walls;
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;
    this.tileSize = 1;
    this.renderMetrics = {
      boardHeight: 0,
      boardWidth: 0,
      offsetX: 0,
      offsetY: 0,
    };
    this.recalculateLayout();

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

  private recalculateLayout(): void {
    const tileSizeByWidth = Math.floor(this.canvas.width / this.mapWidth);
    const tileSizeByHeight = Math.floor(this.canvas.height / this.mapHeight);

    this.tileSize = Math.max(1, Math.min(tileSizeByWidth, tileSizeByHeight));

    const boardWidth = this.tileSize * this.mapWidth;
    const boardHeight = this.tileSize * this.mapHeight;

    this.renderMetrics = {
      boardHeight,
      boardWidth,
      offsetX: Math.floor((this.canvas.width - boardWidth) / 2),
      offsetY: Math.floor((this.canvas.height - boardHeight) / 2),
    };
  }

  private toCanvasX(tileX: number): number {
    return this.renderMetrics.offsetX + tileX * this.tileSize;
  }

  private toCanvasY(tileY: number): number {
    return this.renderMetrics.offsetY + tileY * this.tileSize;
  }

  private getEntityCenter(tileX: number, tileY: number): Position {
    return {
      x: this.toCanvasX(tileX) + this.tileSize / 2,
      y: this.toCanvasY(tileY) + this.tileSize / 2,
    };
  }

  private initializePellets(): void {
    // Seed pellets strictly from explicit tile glyphs. Corridors (' ') and void
    // ('x') are NOT pellet-bearing — seeding them inflated pelletsLeft and
    // placed pellets in non-navigable / tunnel space.
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tile = this.map[y][x];
        if (tile === TILE.PELLET) {
          this.pellets.add(`${x},${y}`);
        } else if (tile === TILE.POWER) {
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

  public resize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));

    if (this.canvas.width === nextWidth && this.canvas.height === nextHeight) {
      return;
    }

    if (this.canvas.width !== nextWidth) {
      this.canvas.width = nextWidth;
    }

    if (this.canvas.height !== nextHeight) {
      this.canvas.height = nextHeight;
    }

    this.recalculateLayout();
  }

  public handleKeyPress(key: string): void {
    if (this.state.mode !== 'manual') return;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.pendingIntents = [{ dx: 0, dy: -1 }];
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.pendingIntents = [{ dx: 0, dy: 1 }];
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.pendingIntents = [{ dx: -1, dy: 0 }];
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.pendingIntents = [{ dx: 1, dy: 0 }];
        break;
    }
  }

  public handleAIAction(
    action: number,
    meta?: { qValues?: number[]; actionName?: string; fallback?: boolean },
  ): void {
    if (this.state.mode !== 'ai') return;

    const intents = ACTION_TO_INTENTS[action];
    if (!intents) {
      if (isTraceEnabled()) {
        pushTrace({
          kind: 'decision',
          t: performance.now(),
          frame: Math.floor(this.animationFrame),
          pac: this.snapshotPac(),
          action,
          actionName: meta?.actionName ?? `UNKNOWN(${action})`,
          qValues: meta?.qValues,
          intents: [],
          pendingBefore: this.pendingIntents.slice(),
          legalNow: this.legalCardinalsNow(),
        });
      }
      return;
    }

    if (isTraceEnabled()) {
      pushTrace({
        kind: 'decision',
        t: performance.now(),
        frame: Math.floor(this.animationFrame),
        pac: this.snapshotPac(),
        action,
        actionName: meta?.actionName ?? ACTION_NAMES[action] ?? `UNKNOWN(${action})`,
        qValues: meta?.qValues,
        intents: intents.map(d => ({ ...d })),
        pendingBefore: this.pendingIntents.slice(),
        legalNow: this.legalCardinalsNow(),
      });
    }

    this.pendingIntents = intents.map(d => ({ ...d }));
  }

  private snapshotPac(): PacSnapshot {
    const tileX = Math.round(this.pacman.x);
    const tileY = Math.round(this.pacman.y);
    return {
      x: this.pacman.x,
      y: this.pacman.y,
      tileX,
      tileY,
      offX: this.pacman.x - tileX,
      offY: this.pacman.y - tileY,
      dir: { ...this.pacman.direction },
    };
  }

  private legalCardinalsNow(): CardinalName[] {
    const tx = Math.round(this.pacman.x);
    const ty = Math.round(this.pacman.y);
    const wrap = (x: number) => ((x % this.mapWidth) + this.mapWidth) % this.mapWidth;
    const legal: CardinalName[] = [];
    if (this.isWalkable(tx, ty - 1)) legal.push('UP');
    if (this.isWalkable(tx, ty + 1)) legal.push('DOWN');
    if (this.isWalkable(wrap(tx - 1), ty)) legal.push('LEFT');
    if (this.isWalkable(wrap(tx + 1), ty)) legal.push('RIGHT');
    return legal;
  }

  // Pac-Man walkability: pellet lanes, power pellets, and open corridors only.
  // Walls, the ghost door, and void/ghost-house interior are all off-limits —
  // so Pac-Man cannot enter the ghost house and cannot wrap through 'x' edges.
  private isWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= this.map.length) return false;
    if (x < 0 || x >= this.map[y].length) return false;

    const tile = this.map[y][x];
    return tile === TILE.PELLET || tile === TILE.POWER || tile === TILE.CORRIDOR;
  }

  // Ghost walkability: everything except solid walls. Ghosts may traverse the
  // door and the ghost-house interior (void) where they spawn.
  private isGhostWalkable(x: number, y: number): boolean {
    if (y < 0 || y >= this.map.length) return false;
    if (x < 0 || x >= this.map[y].length) return false;

    return this.map[y][x] !== TILE.WALL;
  }

  public update(_deltaTime: number): void {
    if (this.state.gameOver || this.state.paused) return;

    const deltaTime = Math.min(Math.max(_deltaTime, 0), MAX_FRAME_TIME_MS);
    const deltaSeconds = deltaTime / 1000;

    this.animationFrame += deltaTime / (1000 / 60);
    this.ghostDecisionTimerMs += deltaTime;

    const tracing = isTraceEnabled();
    const now = performance.now();
    const frame = Math.floor(this.animationFrame);
    const dirBefore = { ...this.pacman.direction };

    // ── Intent resolution ──────────────────────────────────────────────────
    // Try each pending intent in priority order. Commit on the first that
    // succeeds; if none do, keep the list so the intent fires at the next
    // valid turn opportunity (fallback to current direction is automatic —
    // pacman.direction is unchanged and the movement block below continues).
    if (this.pendingIntents.length > 0) {
      const tried = this.pendingIntents.map(d => ({ ...d }));
      let committedIdx: number | null = null;
      for (let i = 0; i < this.pendingIntents.length; i++) {
        if (this.tryApplyDirection(this.pendingIntents[i])) {
          committedIdx = i;
          this.pendingIntents = [];
          break;
        }
      }

      if (tracing) {
        const outcome: 'committed' | 'no-change' | 'fell-back' | 'buffered' =
          committedIdx === null
            ? 'buffered'
            : committedIdx > 0
              ? 'fell-back'
              : (dirBefore.dx === this.pacman.direction.dx &&
                 dirBefore.dy === this.pacman.direction.dy)
                ? 'no-change'
                : 'committed';
        pushTrace({
          kind: 'apply',
          t: now,
          frame,
          pac: this.snapshotPac(),
          tried,
          committedIdx,
          outcome,
          resultDir: { ...this.pacman.direction },
          pendingAfter: this.pendingIntents.slice(),
        });
      }
    }

    if (
      tracing &&
      (dirBefore.dx !== this.pacman.direction.dx || dirBefore.dy !== this.pacman.direction.dy)
    ) {
      pushTrace({
        kind: 'event',
        t: now,
        frame,
        pac: this.snapshotPac(),
        event: 'direction_changed',
        detail: { from: dirBefore, to: { ...this.pacman.direction } },
      });
    }

    // ── Movement ───────────────────────────────────────────────────────────
    // Pac-Man is ALWAYS centered in corridors. The perpendicular axis is
    // snapped every frame so drift is impossible. Wall collision: check the
    // tile one step ahead; if blocked, glide to the current tile center and
    // stop — no oscillation, no off-center parking.
    const dir = this.pacman.direction;
    let blockedThisFrame = false;

    if (dir.dx !== 0 || dir.dy !== 0) {
      const step = PACMAN_SPEED_TILES_PER_SECOND * deltaSeconds;

      const forwardX = ((Math.round(this.pacman.x) + dir.dx) % this.mapWidth + this.mapWidth) % this.mapWidth;
      const forwardY = Math.round(this.pacman.y) + dir.dy;

      if (this.isWalkable(forwardX, forwardY)) {
        this.pacman.x += dir.dx * step;
        this.pacman.y += dir.dy * step;

        if (this.pacman.x < 0) this.pacman.x = this.mapWidth - 1;
        if (this.pacman.x >= this.mapWidth) this.pacman.x = 0;
      } else {
        blockedThisFrame = true;
        const cx = Math.round(this.pacman.x);
        const cy = Math.round(this.pacman.y);

        if (dir.dx !== 0) {
          const rem = cx - this.pacman.x;
          this.pacman.x = Math.abs(rem) <= step ? cx : this.pacman.x + Math.sign(rem) * step;
        } else {
          const rem = cy - this.pacman.y;
          this.pacman.y = Math.abs(rem) <= step ? cy : this.pacman.y + Math.sign(rem) * step;
        }
      }

      if (dir.dx !== 0) this.pacman.y = Math.round(this.pacman.y);
      else              this.pacman.x = Math.round(this.pacman.x);
    }

    // Edge-triggered hit_wall (only on transition from open → blocked)
    if (tracing && blockedThisFrame && !this.wasBlockedLastFrame) {
      pushTrace({
        kind: 'event',
        t: now,
        frame,
        pac: this.snapshotPac(),
        event: 'hit_wall',
        detail: { dir: { ...dir } },
      });
    }
    this.wasBlockedLastFrame = blockedThisFrame;

    // Stuck detection: position effectively unchanged for > 1 s while a
    // direction is set. Emitted once per stuck episode.
    if (tracing) {
      const moved = Math.hypot(this.pacman.x - this.lastMovePos.x, this.pacman.y - this.lastMovePos.y) > 0.01;
      if (moved) {
        this.lastMovePos = { x: this.pacman.x, y: this.pacman.y };
        this.lastMoveAtMs = now;
        this.stuckReported = false;
      } else if (
        !this.stuckReported &&
        this.lastMoveAtMs > 0 &&
        now - this.lastMoveAtMs > 1000 &&
        (this.pacman.direction.dx !== 0 || this.pacman.direction.dy !== 0)
      ) {
        pushTrace({
          kind: 'event',
          t: now,
          frame,
          pac: this.snapshotPac(),
          event: 'stuck',
          detail: { idleMs: Math.round(now - this.lastMoveAtMs) },
        });
        this.stuckReported = true;
      }
    }

    // Pellet / power pellet collision
    const pacmanTile = `${Math.round(this.pacman.x)},${Math.round(this.pacman.y)}`;
    if (this.pellets.has(pacmanTile)) {
      this.pellets.delete(pacmanTile);
      this.state.score += 10;
      this.state.pelletsLeft--;
      if (tracing) {
        pushTrace({ kind: 'event', t: now, frame, pac: this.snapshotPac(), event: 'pellet' });
      }
    }
    if (this.powerPellets.has(pacmanTile)) {
      this.powerPellets.delete(pacmanTile);
      this.state.score += 50;
      this.state.pelletsLeft--;
      this.ghosts.forEach(g => {
        g.mode = 'frightened';
        g.frightTimer = FRIGHTENED_DURATION_MS;
      });
      if (tracing) {
        pushTrace({ kind: 'event', t: now, frame, pac: this.snapshotPac(), event: 'power' });
      }
    }

    this.updateGhosts(deltaSeconds, deltaTime);

    if (this.state.pelletsLeft === 0) {
      this.state.gameOver = true;
    }
  }

  // Returns true if the direction was successfully applied (buffer can be cleared).
  // Perpendicular turns only apply when Pac-Man is close enough to a tile center on
  // the axis being crossed, so he always stays aligned inside alleys.
  private tryApplyDirection(dir: { dx: number; dy: number }): boolean {
    const ALIGN_THRESHOLD = 0.35;
    const { pacman } = this;
    const cur = pacman.direction;

    // Stopped: apply immediately if target tile is open
    if (cur.dx === 0 && cur.dy === 0) {
      if (this.isWalkable(Math.round(pacman.x) + dir.dx, Math.round(pacman.y) + dir.dy)) {
        pacman.direction = dir;
        return true;
      }
      return false;
    }

    // Same axis (includes U-turns): apply if the target tile is open
    if ((dir.dx !== 0 && cur.dx !== 0) || (dir.dy !== 0 && cur.dy !== 0)) {
      if (this.isWalkable(Math.round(pacman.x) + dir.dx, Math.round(pacman.y) + dir.dy)) {
        pacman.direction = dir;
        return true;
      }
      return false;
    }

    // Perpendicular turn — only allow when aligned on the crossing axis
    if (dir.dx !== 0) {
      // Turning horizontal: Y must be near a tile center
      const alignedY = Math.round(pacman.y);
      if (Math.abs(pacman.y - alignedY) <= ALIGN_THRESHOLD &&
          this.isWalkable(Math.round(pacman.x) + dir.dx, alignedY)) {
        pacman.y = alignedY;
        pacman.direction = dir;
        return true;
      }
    } else {
      // Turning vertical: X must be near a tile center
      const alignedX = Math.round(pacman.x);
      if (Math.abs(pacman.x - alignedX) <= ALIGN_THRESHOLD &&
          this.isWalkable(alignedX, Math.round(pacman.y) + dir.dy)) {
        pacman.x = alignedX;
        pacman.direction = dir;
        return true;
      }
    }

    // Can't turn yet — keep buffered so it fires at the next valid tile center
    return false;
  }

  private updateGhosts(deltaSeconds: number, deltaTime: number): void {
    const shouldRefreshDirections = this.ghostDecisionTimerMs >= GHOST_DECISION_INTERVAL_MS;

    this.ghosts.forEach(ghost => {
      // Update fright timer
      if (ghost.frightTimer > 0) {
        ghost.frightTimer = Math.max(0, ghost.frightTimer - deltaTime);
        if (ghost.frightTimer === 0) {
          ghost.mode = 'chase';
        }
      }

      // Ghost AI: pick a new direction at tile centers
      const speed = ghost.mode === 'frightened' ? FRIGHTENED_GHOST_SPEED_TILES_PER_SECOND : GHOST_SPEED_TILES_PER_SECOND;
      const step = speed * deltaSeconds;

      // Forward-tile check (ghosts can cross the door and be inside the ghost house)
      const fwdX = ((Math.round(ghost.x) + ghost.direction.dx) % this.mapWidth + this.mapWidth) % this.mapWidth;
      const fwdY = Math.round(ghost.y) + ghost.direction.dy;

      if (this.isGhostWalkable(fwdX, fwdY)) {
        ghost.x += ghost.direction.dx * step;
        ghost.y += ghost.direction.dy * step;
      } else {
        // Glide to current tile center, then pick a new direction
        const cx = Math.round(ghost.x);
        const cy = Math.round(ghost.y);
        if (ghost.direction.dx !== 0) {
          const rem = cx - ghost.x;
          ghost.x = Math.abs(rem) <= step ? cx : ghost.x + Math.sign(rem) * step;
        } else {
          const rem = cy - ghost.y;
          ghost.y = Math.abs(rem) <= step ? cy : ghost.y + Math.sign(rem) * step;
        }
      }

      // At a tile center: choose a new direction (random, excluding reverse)
      if (shouldRefreshDirections || !this.isGhostWalkable(fwdX, fwdY)) {
        const atCenterX = Math.abs(ghost.x - Math.round(ghost.x)) < 0.1;
        const atCenterY = Math.abs(ghost.y - Math.round(ghost.y)) < 0.1;
        if (atCenterX && atCenterY) {
          const reverse = { dx: -ghost.direction.dx, dy: -ghost.direction.dy };
          const options = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          ].filter(d => {
            if (d.dx === reverse.dx && d.dy === reverse.dy) return false;
            const tx = ((Math.round(ghost.x) + d.dx) % this.mapWidth + this.mapWidth) % this.mapWidth;
            const ty = Math.round(ghost.y) + d.dy;
            return this.isGhostWalkable(tx, ty);
          });
          if (options.length > 0) {
            ghost.direction = options[Math.floor(Math.random() * options.length)];
          }
        }
      }

      // Snap perpendicular axis — ghosts stay centered in corridors
      if (ghost.direction.dx !== 0) ghost.y = Math.round(ghost.y);
      else                          ghost.x = Math.round(ghost.x);

      // Check collision with Pac-Man
      const dist = Math.hypot(ghost.x - this.pacman.x, ghost.y - this.pacman.y);
      if (dist < COLLISION_DISTANCE) {
        if (ghost.mode === 'frightened') {
          // Eat ghost
          this.state.score += 200;
          ghost.x = mapData.ghostHouse.x;
          ghost.y = mapData.ghostHouse.y;
          ghost.mode = 'scatter';
          ghost.frightTimer = 0;
          if (isTraceEnabled()) {
            pushTrace({
              kind: 'event',
              t: performance.now(),
              frame: Math.floor(this.animationFrame),
              pac: this.snapshotPac(),
              event: 'ghost_eaten',
              detail: { color: ghost.color },
            });
          }
        } else {
          // Lose life
          this.state.lives--;
          if (isTraceEnabled()) {
            pushTrace({
              kind: 'event',
              t: performance.now(),
              frame: Math.floor(this.animationFrame),
              pac: this.snapshotPac(),
              event: 'lost_life',
              detail: { color: ghost.color, livesLeft: this.state.lives },
            });
          }
          if (this.state.lives <= 0) {
            this.state.gameOver = true;
          } else {
            this.resetPositions();
          }
        }
      }
    });

    if (shouldRefreshDirections) {
      this.ghostDecisionTimerMs = 0;
    }
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
    const ts = this.tileSize;

    const isWall = (tx: number, ty: number): boolean => {
      if (ty < 0 || ty >= map.length) return false;
      const row = map[ty];
      return !!row && tx >= 0 && tx < row.length && row[tx] === '#';
    };

    const WALL_COLOR = '#2563eb'; // solid blue fill
    const BG_COLOR   = '#000000';
    const cornerR      = Math.max(2, Math.floor(ts * 0.44));

    // ── Pass 1: fill every wall tile solid ──────────────────────────────────
    ctx.fillStyle = WALL_COLOR;
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === '#') {
          ctx.fillRect(this.toCanvasX(x), this.toCanvasY(y), ts, ts);
        }
      }
    }

    // ── Pass 2: round convex (outer) corners by painting background arcs ───
    // For each corner of a wall tile where BOTH adjacent edge tiles are non-wall,
    // we overdraw a quarter-circle in background colour to "cut" the corner.
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] !== '#') continue;

        const px = this.toCanvasX(x);
        const py = this.toCanvasY(y);
        ctx.fillStyle = BG_COLOR;

        // Top-left
        if (!isWall(x - 1, y) && !isWall(x, y - 1)) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.arc(px, py, cornerR, 0, Math.PI / 2);
          ctx.fill();
        }
        // Top-right
        if (!isWall(x + 1, y) && !isWall(x, y - 1)) {
          ctx.beginPath();
          ctx.moveTo(px + ts, py);
          ctx.arc(px + ts, py, cornerR, Math.PI / 2, Math.PI);
          ctx.fill();
        }
        // Bottom-left
        if (!isWall(x - 1, y) && !isWall(x, y + 1)) {
          ctx.beginPath();
          ctx.moveTo(px, py + ts);
          ctx.arc(px, py + ts, cornerR, -Math.PI / 2, 0);
          ctx.fill();
        }
        // Bottom-right
        if (!isWall(x + 1, y) && !isWall(x, y + 1)) {
          ctx.beginPath();
          ctx.moveTo(px + ts, py + ts);
          ctx.arc(px + ts, py + ts, cornerR, Math.PI, -Math.PI / 2);
          ctx.fill();
        }
      }
    }

    // ── Pass 3: outline that follows the rounded contour ────────────────────
    // Two sub-passes create a soft gradient: a wide faint halo first,
    // then a narrower opaque line on top.
    const R = cornerR;
    const outlinePasses = [
      { lw: Math.max(2, ts * 0.30), color: 'rgba(26,52,140,0.35)' },
      { lw: Math.max(1, ts * 0.11), color: 'rgba(26,52,140,0.92)' },
    ];

    for (const { lw, color } of outlinePasses) {
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';

      for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
          if (map[y][x] !== '#') continue;

          const px = this.toCanvasX(x);
          const py = this.toCanvasY(y);

          const topExp   = !isWall(x, y - 1);
          const botExp   = !isWall(x, y + 1);
          const leftExp  = !isWall(x - 1, y);
          const rightExp = !isWall(x + 1, y);

          const tlOut = leftExp && topExp;
          const trOut = rightExp && topExp;
          const blOut = leftExp && botExp;
          const brOut = rightExp && botExp;

          // Straight segments — trimmed back where a rounded corner replaces the end
          ctx.beginPath();
          if (topExp) {
            const x1 = tlOut ? px + R : px;
            const x2 = trOut ? px + ts - R : px + ts;
            if (x1 < x2) { ctx.moveTo(x1, py); ctx.lineTo(x2, py); }
          }
          if (botExp) {
            const x1 = blOut ? px + R : px;
            const x2 = brOut ? px + ts - R : px + ts;
            if (x1 < x2) { ctx.moveTo(x1, py + ts); ctx.lineTo(x2, py + ts); }
          }
          if (leftExp) {
            const y1 = tlOut ? py + R : py;
            const y2 = blOut ? py + ts - R : py + ts;
            if (y1 < y2) { ctx.moveTo(px, y1); ctx.lineTo(px, y2); }
          }
          if (rightExp) {
            const y1 = trOut ? py + R : py;
            const y2 = brOut ? py + ts - R : py + ts;
            if (y1 < y2) { ctx.moveTo(px + ts, y1); ctx.lineTo(px + ts, y2); }
          }
          ctx.stroke();

          // Arc segments at outer corners — same radius as the fill cut
          if (tlOut) { ctx.beginPath(); ctx.arc(px,      py,      R, 0,            Math.PI / 2); ctx.stroke(); }
          if (trOut) { ctx.beginPath(); ctx.arc(px + ts, py,      R, Math.PI / 2,  Math.PI);     ctx.stroke(); }
          if (blOut) { ctx.beginPath(); ctx.arc(px,      py + ts, R, -Math.PI / 2, 0);           ctx.stroke(); }
          if (brOut) { ctx.beginPath(); ctx.arc(px + ts, py + ts, R, Math.PI,      3*Math.PI/2); ctx.stroke(); }
        }
      }
    }

    // ── Pass 4: ghost house door — pink horizontal bar ───────────────────────
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === '-') {
          const px = this.toCanvasX(x);
          const py = this.toCanvasY(y);
          ctx.fillStyle = '#ffb8ff';
          ctx.fillRect(px, py + Math.floor(ts * 0.35), ts, Math.ceil(ts * 0.3));
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
        this.toCanvasX(x) + tileSize / 2,
        this.toCanvasY(y) + tileSize / 2,
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
        this.toCanvasX(x) + tileSize / 2,
        this.toCanvasY(y) + tileSize / 2,
        tileSize * pulseSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }

  private renderPacman(): void {
    const { ctx, tileSize, pacman } = this;

    const { x: centerX, y: centerY } = this.getEntityCenter(pacman.x, pacman.y);
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
      const { x: centerX, y: centerY } = this.getEntityCenter(ghost.x, ghost.y);
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
    this.animationFrame = 0;
    this.ghostDecisionTimerMs = 0;
    this.pendingIntents = [];
    this.pellets.clear();
    this.powerPellets.clear();
    this.initializePellets();
    this.resetPositions();
  }
}
