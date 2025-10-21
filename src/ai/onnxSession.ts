// ONNX Runtime Session Manager
import * as ort from 'onnxruntime-web';
import { MODEL_CONFIG, FRAME_CONFIG, type ModelMetadata } from './constants';

let session: ort.InferenceSession | null = null;
let metadata: ModelMetadata | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize ONNX session with lazy loading
 * Uses WebGL/WebGPU backend for acceleration
 */
export async function initSession(): Promise<{ success: boolean; error?: string }> {
  // Return existing promise if already initializing
  if (initPromise) {
    await initPromise;
    return { success: session !== null };
  }

  initPromise = (async () => {
    try {
      console.log('[ONNX] Initializing session...');
      
      // Try to load metadata first
      try {
        const metadataResponse = await fetch(MODEL_CONFIG.METADATA_PATH);
        if (metadataResponse.ok) {
          metadata = await metadataResponse.json();
          console.log('[ONNX] Loaded metadata:', metadata);
        }
      } catch (e) {
        console.warn('[ONNX] Could not load metadata:', e);
      }

      // Configure ONNX Runtime with WebGL/WebGPU preference
      const options: ort.InferenceSession.SessionOptions = {
        executionProviders: [
          {
            name: 'webgpu',
            deviceType: 'gpu',
          },
          {
            name: 'webgl',
            deviceType: 'gpu',
          },
          'wasm'
        ],
        graphOptimizationLevel: 'all',
      };

      // Load the model
      session = await ort.InferenceSession.create(
        MODEL_CONFIG.MODEL_PATH,
        options
      );

      console.log('[ONNX] Session initialized successfully');
      console.log('[ONNX] Input names:', session.inputNames);
      console.log('[ONNX] Output names:', session.outputNames);
    } catch (error) {
      console.error('[ONNX] Failed to initialize session:', error);
      session = null;
      throw error;
    }
  })();

  try {
    await initPromise;
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Run inference on a stacked frame input
 * @param frameStack - Float32Array of shape [1, 4, 84, 84] with values in [0, 1]
 * @returns Action index (0-4) with highest Q-value
 */
export async function infer(frameStack: Float32Array): Promise<number> {
  if (!session) {
    throw new Error('Session not initialized. Call initSession() first.');
  }

  try {
    // Create input tensor
    const inputTensor = new ort.Tensor(
      'float32',
      frameStack,
      MODEL_CONFIG.INPUT_SHAPE as [number, number, number, number]
    );

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;
    
    const results = await session.run(feeds);
    const outputTensor = results[session.outputNames[0]];
    
    // Get Q-values and find argmax
    const qValues = outputTensor.data as Float32Array;
    let maxIdx = 0;
    let maxValue = qValues[0];
    
    for (let i = 1; i < qValues.length; i++) {
      if (qValues[i] > maxValue) {
        maxValue = qValues[i];
        maxIdx = i;
      }
    }

    return maxIdx;
  } catch (error) {
    console.error('[ONNX] Inference error:', error);
    throw error;
  }
}

/**
 * Get current session status
 */
export function getSessionStatus(): {
  loaded: boolean;
  metadata: ModelMetadata | null;
} {
  return {
    loaded: session !== null,
    metadata,
  };
}

/**
 * Cleanup session
 */
export async function destroySession(): Promise<void> {
  if (session) {
    await session.release();
    session = null;
  }
  initPromise = null;
  metadata = null;
}

