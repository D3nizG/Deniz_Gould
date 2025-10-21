// AI Worker for background inference
// Handles frame capture, preprocessing, and model inference

import { ACTIONS, FRAME_CONFIG, ACTION_NAMES } from './constants';
import { initSession, infer, getSessionStatus } from './onnxSession';

interface WorkerMessage {
  type: 'init' | 'infer' | 'status';
  imageData?: ImageData;
  legalActions?: number[];
}

interface WorkerResponse {
  type: 'init' | 'infer' | 'status' | 'error';
  success?: boolean;
  action?: number;
  actionName?: string;
  qValues?: number[];
  error?: string;
  status?: {
    loaded: boolean;
    metadata: any;
  };
}

// Frame stack buffer
let frameStack: Float32Array[] = [];
const MAX_FRAMES = FRAME_CONFIG.STACK_SIZE;

/**
 * Convert ImageData to grayscale and resize to 84x84
 */
function preprocessFrame(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const targetWidth = FRAME_CONFIG.WIDTH;
  const targetHeight = FRAME_CONFIG.HEIGHT;
  
  const grayscale = new Float32Array(targetWidth * targetHeight);
  
  // Simple nearest-neighbor resize with grayscale conversion
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor((x / targetWidth) * width);
      const srcY = Math.floor((y / targetHeight) * height);
      const srcIdx = (srcY * width + srcX) * 4;
      
      // Convert to grayscale (weighted average)
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Normalize to [0, 1]
      grayscale[y * targetWidth + x] = gray / 255.0;
    }
  }
  
  return grayscale;
}

/**
 * Get random legal action (fallback when model not loaded)
 */
function getRandomAction(legalActions?: number[]): number {
  const actions = legalActions || [
    ACTIONS.UP,
    ACTIONS.DOWN,
    ACTIONS.LEFT,
    ACTIONS.RIGHT,
    ACTIONS.NOOP,
  ];
  return actions[Math.floor(Math.random() * actions.length)];
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, imageData, legalActions } = e.data;
  
  try {
    switch (type) {
      case 'init': {
        const result = await initSession();
        const response: WorkerResponse = {
          type: 'init',
          success: result.success,
          error: result.error,
        };
        self.postMessage(response);
        break;
      }
      
      case 'status': {
        const status = getSessionStatus();
        const response: WorkerResponse = {
          type: 'status',
          status: {
            loaded: status.loaded,
            metadata: status.metadata,
          },
        };
        self.postMessage(response);
        break;
      }
      
      case 'infer': {
        if (!imageData) {
          throw new Error('No image data provided for inference');
        }
        
        // Preprocess frame
        const processedFrame = preprocessFrame(imageData);
        
        // Update frame stack
        frameStack.push(processedFrame);
        if (frameStack.length > MAX_FRAMES) {
          frameStack.shift();
        }
        
        // Check if model is loaded
        const status = getSessionStatus();
        
        let action: number;
        let actionName: string;
        
        if (!status.loaded || frameStack.length < MAX_FRAMES) {
          // Use random action as fallback
          action = getRandomAction(legalActions);
          actionName = ACTION_NAMES[action as keyof typeof ACTION_NAMES] + ' (random)';
        } else {
          // Stack frames for model input: [1, 4, 84, 84]
          const stackedFrames = new Float32Array(
            1 * MAX_FRAMES * FRAME_CONFIG.HEIGHT * FRAME_CONFIG.WIDTH
          );
          
          for (let i = 0; i < MAX_FRAMES; i++) {
            stackedFrames.set(
              frameStack[i],
              i * FRAME_CONFIG.HEIGHT * FRAME_CONFIG.WIDTH
            );
          }
          
          // Run inference
          action = await infer(stackedFrames);
          actionName = ACTION_NAMES[action as keyof typeof ACTION_NAMES];
        }
        
        const response: WorkerResponse = {
          type: 'infer',
          action,
          actionName,
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

