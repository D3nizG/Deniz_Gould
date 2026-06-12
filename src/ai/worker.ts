// AI Worker for background inference
// Handles ALE-frame preprocessing and model inference

import { ACTIONS, FRAME_CONFIG, ACTION_NAMES } from './constants';
import { initSession, infer, getSessionStatus } from './onnxSession';

const ALE_W = 160;
const ALE_H = 210;

interface WorkerMessage {
  type: 'init' | 'infer' | 'status' | 'replayFixture';
  rawFrame?: Uint8ClampedArray;  // ALE-style 160×210 RGB from synthesizeALEFrame
  fixtureData?: Float32Array;    // Pre-stacked 4×84×84 tensor for fixture replay
  legalActions?: number[];
}

interface WorkerResponse {
  type: 'init' | 'infer' | 'status' | 'error';
  success?: boolean;
  action?: number;
  actionName?: string;
  qValues?: number[];
  fallback?: boolean;
  error?: string;
  status?: {
    loaded: boolean;
    metadata: unknown;
  };
}

// Frame stack buffer (4 preprocessed 84×84 grayscale frames)
let frameStack: Float32Array[] = [];
const MAX_FRAMES = FRAME_CONFIG.STACK_SIZE;

// Previous raw frame for max-pooling (ALE flicker elimination)
let prevRawFrame: Uint8ClampedArray | null = null;

function bilinearResize(
  src: Float32Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Float32Array {
  const dst = new Float32Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      // Sample at the center of the destination pixel
      const sx = (dx + 0.5) * scaleX - 0.5;
      const sy = (dy + 0.5) * scaleY - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.max(0, Math.floor(sy));
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fx = sx - Math.floor(sx);
      const fy = sy - Math.floor(sy);
      const v00 = src[y0 * srcW + x0];
      const v10 = src[y0 * srcW + x1];
      const v01 = src[y1 * srcW + x0];
      const v11 = src[y1 * srcW + x1];
      dst[dy * dstW + dx] =
        (v00 * (1 - fx) + v10 * fx) * (1 - fy) +
        (v01 * (1 - fx) + v11 * fx) * fy;
    }
  }
  return dst;
}

/**
 * Preprocess an ALE-style 160×210 RGB frame into a normalized 84×84 grayscale
 * tensor, matching the SB3 AtariWrapper pipeline used during training:
 *   max-pool(t, t-1) → BT.601 luma → bilinear 84×84 → [0, 1]
 */
function preprocessFrame(rawFrame: Uint8ClampedArray): Float32Array {
  // 1. Max-pool with previous frame (eliminates sprite flicker)
  let pooled: Uint8ClampedArray;
  if (prevRawFrame) {
    pooled = new Uint8ClampedArray(rawFrame.length);
    for (let i = 0; i < rawFrame.length; i++) {
      pooled[i] = rawFrame[i] > prevRawFrame[i] ? rawFrame[i] : prevRawFrame[i];
    }
  } else {
    pooled = rawFrame;
  }
  prevRawFrame = rawFrame;

  // 2. BT.601 luminance → [0, 1]
  const gray = new Float32Array(ALE_W * ALE_H);
  for (let i = 0; i < ALE_W * ALE_H; i++) {
    const j = i * 3;
    gray[i] = (0.299 * pooled[j] + 0.587 * pooled[j + 1] + 0.114 * pooled[j + 2]) / 255.0;
  }

  // 3. Bilinear downsample 160×210 → 84×84
  return bilinearResize(gray, ALE_W, ALE_H, FRAME_CONFIG.WIDTH, FRAME_CONFIG.HEIGHT);
}

function getRandomAction(legalActions?: number[]): number {
  const actions = legalActions ?? [ACTIONS.UP, ACTIONS.DOWN, ACTIONS.LEFT, ACTIONS.RIGHT, ACTIONS.NOOP];
  return actions[Math.floor(Math.random() * actions.length)];
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, rawFrame, legalActions, fixtureData } = e.data;

  try {
    switch (type) {
      case 'init': {
        const result = await initSession();
        const response: WorkerResponse = { type: 'init', success: result.success, error: result.error };
        self.postMessage(response);
        break;
      }

      case 'status': {
        const status = getSessionStatus();
        const response: WorkerResponse = {
          type: 'status',
          status: { loaded: status.loaded, metadata: status.metadata },
        };
        self.postMessage(response);
        break;
      }

      case 'infer': {
        if (!rawFrame) throw new Error('No frame data provided for inference');

        const processedFrame = preprocessFrame(rawFrame);

        frameStack.push(processedFrame);
        if (frameStack.length > MAX_FRAMES) frameStack.shift();

        const status = getSessionStatus();
        let action: number;
        let actionName: string;
        let qValues: number[] | undefined;
        let fallback = false;

        if (!status.loaded || frameStack.length < MAX_FRAMES) {
          action = getRandomAction(legalActions);
          actionName = (ACTION_NAMES[action] ?? `UNKNOWN(${action})`) + ' (random)';
          fallback = true;
        } else {
          const stackedFrames = new Float32Array(MAX_FRAMES * FRAME_CONFIG.HEIGHT * FRAME_CONFIG.WIDTH);
          for (let i = 0; i < MAX_FRAMES; i++) {
            stackedFrames.set(frameStack[i], i * FRAME_CONFIG.HEIGHT * FRAME_CONFIG.WIDTH);
          }
          const result = await infer(stackedFrames);
          action = result.action;
          actionName = ACTION_NAMES[action] ?? `UNKNOWN(${action})`;
          qValues = Array.from(result.qValues);
        }

        const response: WorkerResponse = { type: 'infer', action, actionName, qValues, fallback };
        self.postMessage(response);
        break;
      }

      // Fixture replay: feed a pre-captured ALE observation stack directly to the
      // model, bypassing preprocessFrame. Used to validate the ONNX checkpoint.
      case 'replayFixture': {
        if (!fixtureData) throw new Error('No fixture data provided');
        const status = getSessionStatus();
        if (!status.loaded) throw new Error('Model not loaded');
        const result = await infer(fixtureData);
        const response: WorkerResponse = {
          type: 'infer',
          action: result.action,
          actionName: ACTION_NAMES[result.action] ?? `UNKNOWN(${result.action})`,
          qValues: Array.from(result.qValues),
          fallback: false,
        };
        self.postMessage(response);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

export {};
