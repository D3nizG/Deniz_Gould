'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ModelMetadata {
  sourceFile: string;
  modelType?: string;
  steps?: number;
  updatedAt: string;
  sha256: string;
  n_actions: number;
  input: {
    stack: number;
    h: number;
    w: number;
  };
  fileSize?: number;
}

interface ModelStatus {
  exists: boolean;
  metadata: ModelMetadata | null;
  error?: string;
}

interface InferenceResult {
  success: boolean;
  action?: number;
  actionName?: string;
  latency?: number;
  error?: string;
}

export default function DiagnosticsPage() {
  const isProd = process.env.NODE_ENV === 'production';
  const enabled = process.env.NEXT_PUBLIC_ENABLE_AI_DIAGNOSTICS === 'true';
  if (isProd && !enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-fg/60">Diagnostics are disabled in production.</p>
          <Link href="/" className="inline-block mt-4 text-accent-primary hover:text-accent-secondary">Return Home</Link>
        </div>
      </div>
    );
  }
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    exists: false,
    metadata: null,
  });
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [isTestingInference, setIsTestingInference] = useState(false);
  const [worker, setWorker] = useState<Worker | null>(null);

  // Load model status
  useEffect(() => {
    async function checkModel() {
      try {
        // Try to load metadata
        const response = await fetch('/models/metadata.json');
        if (response.ok) {
          const metadata = await response.json();
          setModelStatus({ exists: true, metadata });
        } else {
          setModelStatus({ exists: false, metadata: null });
        }
      } catch (error) {
        setModelStatus({
          exists: false,
          metadata: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    checkModel();
  }, []);

  // Initialize worker
  useEffect(() => {
    const w = new Worker(new URL('../../../src/ai/worker.ts', import.meta.url));
    setWorker(w);

    w.onmessage = (e) => {
      const { type, action, actionName, error } = e.data;

      if (type === 'infer') {
        setInferenceResult({
          success: true,
          action,
          actionName,
          latency: performance.now() - (window as any).inferenceStartTime,
        });
        setIsTestingInference(false);
      } else if (type === 'error') {
        setInferenceResult({
          success: false,
          error,
        });
        setIsTestingInference(false);
      }
    };

    // Initialize model in worker
    w.postMessage({ type: 'init' });

    return () => w.terminate();
  }, []);

  const runInferenceTest = async () => {
    if (!worker || isTestingInference) return;

    setIsTestingInference(true);
    setInferenceResult(null);

    try {
      // Create dummy 84x84 RGBA canvas
      const canvas = document.createElement('canvas');
      canvas.width = 84;
      canvas.height = 84;
      const ctx = canvas.getContext('2d')!;

      // Fill with random game-like data
      const imageData = ctx.createImageData(84, 84);
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Random grayscale
        const val = Math.random() * 255;
        imageData.data[i] = val;
        imageData.data[i + 1] = val;
        imageData.data[i + 2] = val;
        imageData.data[i + 3] = 255;
      }

      (window as any).inferenceStartTime = performance.now();
      worker.postMessage({ type: 'infer', imageData });
    } catch (error) {
      setInferenceResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsTestingInference(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-bg text-fg p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent-primary hover:text-accent-secondary mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">AI Diagnostics</h1>
          <p className="text-fg/60">
            Model status and inference testing for Ms. Pac-Man AI
          </p>
        </div>

        {/* Model Status */}
        <div className="bg-bg-secondary rounded-lg p-6 mb-6 border border-fg/10">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            {modelStatus.exists ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <XCircle className="text-red-500" />
            )}
            Model Status
          </h2>

          {modelStatus.exists && modelStatus.metadata ? (
            <div className="space-y-3 font-mono text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-fg/60">Status:</div>
                <div className="text-green-500">✓ Loaded</div>

                <div className="text-fg/60">Source File:</div>
                <div>{modelStatus.metadata.sourceFile}</div>

                {modelStatus.metadata.modelType && (
                  <>
                    <div className="text-fg/60">Model Type:</div>
                    <div className="uppercase">{modelStatus.metadata.modelType}</div>
                  </>
                )}

                {modelStatus.metadata.steps && (
                  <>
                    <div className="text-fg/60">Training Steps:</div>
                    <div>{modelStatus.metadata.steps.toLocaleString()}</div>
                  </>
                )}

                <div className="text-fg/60">Actions:</div>
                <div>{modelStatus.metadata.n_actions}</div>

                <div className="text-fg/60">Input Shape:</div>
                <div>
                  [{modelStatus.metadata.input.stack}, {modelStatus.metadata.input.h},{' '}
                  {modelStatus.metadata.input.w}]
                </div>

                {modelStatus.metadata.fileSize && (
                  <>
                    <div className="text-fg/60">File Size:</div>
                    <div>{formatBytes(modelStatus.metadata.fileSize)}</div>
                  </>
                )}

                <div className="text-fg/60">SHA256:</div>
                <div className="break-all text-xs">
                  {modelStatus.metadata.sha256.slice(0, 32)}...
                </div>

                <div className="text-fg/60">Updated:</div>
                <div>{new Date(modelStatus.metadata.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={20} />
                <span>Model not found or failed to load</span>
              </div>
              {modelStatus.error && (
                <div className="text-sm text-fg/60">Error: {modelStatus.error}</div>
              )}
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-500 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-yellow-500 mb-2">
                      Model Not Available
                    </p>
                    <p className="text-sm text-fg/80 mb-2">
                      To use the AI features, you need to convert your trained model to
                      ONNX format:
                    </p>
                    <pre className="text-xs bg-black/30 p-3 rounded overflow-x-auto">
                      <code>{`# Install Python dependencies
python -m pip install -r mspacman-ai/web-integration/requirements.txt

# Convert model
npm run ai:setup`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inference Test */}
        <div className="bg-bg-secondary rounded-lg p-6 mb-6 border border-fg/10">
          <h2 className="text-2xl font-bold mb-4">Browser Inference Test</h2>
          <p className="text-fg/60 mb-4">
            Test the model with dummy input to verify it works in the browser.
          </p>

          <button
            onClick={runInferenceTest}
            disabled={isTestingInference || !modelStatus.exists}
            className="px-6 py-3 bg-accent-primary hover:bg-accent-secondary disabled:bg-fg/20 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center gap-2"
          >
            {isTestingInference ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Running Test...
              </>
            ) : (
              'Run Inference Test'
            )}
          </button>

          {inferenceResult && (
            <div className="mt-4 p-4 bg-bg rounded border border-fg/10">
              {inferenceResult.success ? (
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex items-center gap-2 text-green-500 font-bold">
                    <CheckCircle size={20} />
                    Test Passed
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-fg/60">Action:</div>
                    <div>{inferenceResult.action}</div>

                    <div className="text-fg/60">Action Name:</div>
                    <div>{inferenceResult.actionName}</div>

                    <div className="text-fg/60">Latency:</div>
                    <div>{inferenceResult.latency?.toFixed(2)}ms</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-500 font-bold">
                    <XCircle size={20} />
                    Test Failed
                  </div>
                  <div className="text-sm text-fg/60">
                    Error: {inferenceResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-bg-secondary rounded-lg p-6 border border-fg/10">
          <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 rounded transition-colors"
            >
              → Play Ms. Pac-Man (Home Page)
            </Link>
            <a
              href="/models/latest.onnx"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 rounded transition-colors"
            >
              → Download ONNX Model
            </a>
            <a
              href="/models/metadata.json"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 rounded transition-colors"
            >
              → View Metadata JSON
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
