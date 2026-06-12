// Synthesizes an ALE-style 160×210 RGB frame from semantic game state.
// This frame is fed to the ONNX model instead of the stylized browser canvas,
// matching the visual distribution the QR-DQN was trained on.

export const ALE_FRAME_WIDTH = 160;
export const ALE_FRAME_HEIGHT = 210;

// Tile dimensions within the 160×210 frame.
// 28 tiles × 5 px = 140 px, centered: offsetX = 10
// 31 tiles × 6 px = 186 px, below a 16 px top margin
const TILE_W = 5;
const TILE_H = 6;
const MAZE_OFFSET_X = Math.floor((ALE_FRAME_WIDTH - 28 * TILE_W) / 2); // 10
const MAZE_OFFSET_Y = 16;

export interface SynthesisInput {
  tiles: string[];
  mapWidth: number;
  mapHeight: number;
  pacman: { x: number; y: number; direction: { dx: number; dy: number } };
  ghosts: Array<{ x: number; y: number; color: string; mode: string }>;
  pellets: Set<string>;
  powerPellets: Set<string>;
  wallColor?: readonly [number, number, number];
}

const GHOST_COLORS: Readonly<Record<string, readonly [number, number, number]>> = {
  red:    [228,  72,  72],
  pink:   [255, 184, 255],
  cyan:   [ 72, 228, 228],
  orange: [255, 184,  72],
};
const FRIGHTENED_COLOR = [0, 0, 160] as const;
const DEFAULT_WALL_COLOR = [228, 111, 111] as const; // ALE maze 1 (#e46f6f)

export function synthesizeALEFrame(input: SynthesisInput): Uint8ClampedArray {
  const { tiles, mapWidth, mapHeight, pacman, ghosts, pellets, powerPellets } = input;
  const [wr, wg, wb] = input.wallColor ?? DEFAULT_WALL_COLOR;
  const buf = new Uint8ClampedArray(ALE_FRAME_WIDTH * ALE_FRAME_HEIGHT * 3);

  function setPixel(x: number, y: number, r: number, g: number, b: number): void {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= ALE_FRAME_WIDTH || yi < 0 || yi >= ALE_FRAME_HEIGHT) return;
    const i = (yi * ALE_FRAME_WIDTH + xi) * 3;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
  }

  function fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number): void {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPixel(x + dx, y + dy, r, g, b);
  }

  function drawDisk(cx: number, cy: number, radius: number, r: number, g: number, b: number): void {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) setPixel(cx + dx, cy + dy, r, g, b);
      }
    }
  }

  // Tile top-left pixel
  function tileX(tx: number): number { return MAZE_OFFSET_X + tx * TILE_W; }
  function tileY(ty: number): number { return MAZE_OFFSET_Y + ty * TILE_H; }

  // Float tile position → pixel center (for moving entities)
  function entityCX(tx: number): number { return Math.round(MAZE_OFFSET_X + (tx + 0.5) * TILE_W); }
  function entityCY(ty: number): number { return Math.round(MAZE_OFFSET_Y + (ty + 0.5) * TILE_H); }

  // 1. Walls and ghost door
  for (let ty = 0; ty < mapHeight; ty++) {
    for (let tx = 0; tx < mapWidth; tx++) {
      const tile = tiles[ty]?.[tx];
      if (tile === '#') {
        fillRect(tileX(tx), tileY(ty), TILE_W, TILE_H, wr, wg, wb);
      } else if (tile === '-') {
        const midY = tileY(ty) + Math.floor(TILE_H / 2);
        fillRect(tileX(tx), midY, TILE_W, 1, 255, 184, 255);
      }
    }
  }

  // 2. Pellets (2×2 white square)
  for (const key of pellets) {
    const comma = key.indexOf(',');
    const tx = +key.slice(0, comma);
    const ty = +key.slice(comma + 1);
    fillRect(entityCX(tx), entityCY(ty), 2, 2, 255, 255, 255);
  }

  // 3. Power pellets (radius-2 white disk)
  for (const key of powerPellets) {
    const comma = key.indexOf(',');
    const tx = +key.slice(0, comma);
    const ty = +key.slice(comma + 1);
    drawDisk(entityCX(tx), entityCY(ty), 2, 255, 255, 255);
  }

  // 4. Ghosts
  for (const ghost of ghosts) {
    const [gr, gg, gb] = ghost.mode === 'frightened' ? FRIGHTENED_COLOR : (GHOST_COLORS[ghost.color] ?? GHOST_COLORS.red);
    drawDisk(entityCX(ghost.x), entityCY(ghost.y), 2, gr, gg, gb);
  }

  // 5. Pac-Man (yellow disk, drawn last so it's on top)
  drawDisk(entityCX(pacman.x), entityCY(pacman.y), 2, 255, 255, 0);

  return buf;
}
