// @ts-nocheck
// ONNX Runtime Session Manager
import { MODEL_CONFIG, type ModelMetadata } from './constants';

let session: any | null = null;
let metadata: ModelMetadata | null = null;
let initPromise: Promise<void> | null = null;
let ortModulePromise: Promise<any> | null = null;
const ORT_MODULE_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/ort.min.mjs';
const ORT_WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';

async function loadOrt() {
  if (!ortModulePromise) {
    ortModulePromise = import(/* webpackIgnore: true */ ORT_MODULE_URL);
  }

  return ortModulePromise;
}

/**
 * Initialize ONNX session with lazy loading
 * Uses the browser WASM runtime loaded at runtime to avoid bundler conflicts.
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

      const ort = await loadOrt();
      ort.env.wasm.wasmPaths = ORT_WASM_BASE_URL;

      // Use the plain WASM execution provider to keep the portfolio build portable.
      const options = {
        executionProviders: ['wasm'],
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

export interface InferResult {
  action: number;
  qValues: Float32Array;   // full output vector (9 values for MsPacman minimal set)
}

/**
 * Run inference on a stacked frame input
 * @param frameStack - Float32Array of shape [1, 4, 84, 84] with values in [0, 1]
 * @returns argmax action and the raw Q-values for downstream diagnostics
 */
export async function infer(frameStack: Float32Array): Promise<InferResult> {
  if (!session) {
    throw new Error('Session not initialized. Call initSession() first.');
  }

  try {
    const ort = await loadOrt();
    const inputTensor = new ort.Tensor(
      'float32',
      frameStack,
      MODEL_CONFIG.INPUT_SHAPE as [number, number, number, number]
    );

    const feeds: Record<string, ort.Tensor> = {};
    feeds[session.inputNames[0]] = inputTensor;

    const results = await session.run(feeds);
    const outputTensor = results[session.outputNames[0]];

    const qValues = outputTensor.data as Float32Array;
    let maxIdx = 0;
    let maxValue = qValues[0];
    for (let i = 1; i < qValues.length; i++) {
      if (qValues[i] > maxValue) {
        maxValue = qValues[i];
        maxIdx = i;
      }
    }

    // Copy out of the ORT-owned buffer so we can hand it across the worker boundary safely.
    return { action: maxIdx, qValues: new Float32Array(qValues) };
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
