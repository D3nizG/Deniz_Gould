// AI Constants for Ms. Pac-Man
// 9-action compact minimal-action set (ALE MsPacman): NOOP, UP, RIGHT, LEFT,
// DOWN, UPRIGHT, UPLEFT, DOWNRIGHT, DOWNLEFT at indices 0..8.

export const ACTIONS = {
  NOOP:      0,
  UP:        1,
  RIGHT:     2,
  LEFT:      3,
  DOWN:      4,
  UPRIGHT:   5,
  UPLEFT:    6,
  DOWNRIGHT: 7,
  DOWNLEFT:  8,
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];
export type Direction = { dx: number; dy: number };

const UP:    Direction = { dx:  0, dy: -1 };
const DOWN:  Direction = { dx:  0, dy:  1 };
const LEFT:  Direction = { dx: -1, dy:  0 };
const RIGHT: Direction = { dx:  1, dy:  0 };

// Priority-ordered intent list per action. Diagonals are NOT movement vectors;
// they are "try axis A first, fall back to axis B if A is illegal right now."
export const ACTION_TO_INTENTS: Record<number, readonly Direction[]> = {
  [ACTIONS.NOOP]:      [],
  [ACTIONS.UP]:        [UP],
  [ACTIONS.RIGHT]:     [RIGHT],
  [ACTIONS.LEFT]:      [LEFT],
  [ACTIONS.DOWN]:      [DOWN],
  [ACTIONS.UPRIGHT]:   [UP, RIGHT],
  [ACTIONS.UPLEFT]:    [UP, LEFT],
  [ACTIONS.DOWNRIGHT]: [DOWN, RIGHT],
  [ACTIONS.DOWNLEFT]:  [DOWN, LEFT],
};

export const ACTION_NAMES: Record<number, string> = {
  [ACTIONS.NOOP]:      'NOOP',
  [ACTIONS.UP]:        'UP',
  [ACTIONS.RIGHT]:     'RIGHT',
  [ACTIONS.LEFT]:      'LEFT',
  [ACTIONS.DOWN]:      'DOWN',
  [ACTIONS.UPRIGHT]:   'UPRIGHT',
  [ACTIONS.UPLEFT]:    'UPLEFT',
  [ACTIONS.DOWNRIGHT]: 'DOWNRIGHT',
  [ACTIONS.DOWNLEFT]:  'DOWNLEFT',
};

// Frame processing constants
export const FRAME_CONFIG = {
  STACK_SIZE: 4,           // Number of frames to stack
  WIDTH: 84,               // Target width for model input
  HEIGHT: 84,              // Target height for model input
  CHANNELS: 1,             // Grayscale
  NORMALIZE_MIN: 0,        // Min value after normalization
  NORMALIZE_MAX: 1,        // Max value after normalization
} as const;

// Decision timing
export const TIMING = {
  TARGET_FPS: 60,           // Game rendering FPS
  DECISION_HZ: 12,          // AI decisions per second (10-15 Hz)
  MS_PER_DECISION: 1000 / 12,
} as const;

// Model configuration
export const MODEL_CONFIG = {
  INPUT_SHAPE: [1, FRAME_CONFIG.STACK_SIZE, FRAME_CONFIG.HEIGHT, FRAME_CONFIG.WIDTH],
  OUTPUT_ACTIONS: 9,
  MODEL_PATH: '/models/latest.onnx',
  METADATA_PATH: '/models/metadata.json',
} as const;

export interface ModelMetadata {
  sourceFile: string;
  steps?: number;
  updatedAt: string;
  sha256: string;
  n_actions: number;
  input: {
    stack: number;
    h: number;
    w: number;
  };
}
