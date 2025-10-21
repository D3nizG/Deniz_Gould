// AI Constants for Ms. Pac-Man
// Maps ALE (Arcade Learning Environment) actions to game directions

export const ACTIONS = {
  NOOP: 0,
  UP: 2,
  RIGHT: 3,
  LEFT: 4,
  DOWN: 5,
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

export const ACTION_TO_DIRECTION = {
  [ACTIONS.NOOP]: null,
  [ACTIONS.UP]: { dx: 0, dy: -1 },
  [ACTIONS.DOWN]: { dx: 0, dy: 1 },
  [ACTIONS.LEFT]: { dx: -1, dy: 0 },
  [ACTIONS.RIGHT]: { dx: 1, dy: 0 },
} as const;

export const ACTION_NAMES = {
  [ACTIONS.NOOP]: 'NOOP',
  [ACTIONS.UP]: 'UP',
  [ACTIONS.DOWN]: 'DOWN',
  [ACTIONS.LEFT]: 'LEFT',
  [ACTIONS.RIGHT]: 'RIGHT',
} as const;

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
  OUTPUT_ACTIONS: 5,        // Number of possible actions
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

