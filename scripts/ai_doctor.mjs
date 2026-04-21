#!/usr/bin/env node
/**
 * AI Doctor - Validates ONNX model and metadata
 * Runs quick smoke tests to ensure model is ready for browser inference
 */

import { readFile, access, stat } from 'fs/promises';
import { constants } from 'fs';
import { execFile } from 'node:child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Configuration
const MODEL_PATH = 'public/models/latest.onnx';
const METADATA_PATH = 'public/models/metadata.json';
const MAX_SIZE_MB = 50;

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

async function checkFileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function checkFileSize(path, maxSizeMB) {
  const stats = await stat(path);
  const sizeMB = stats.size / (1024 * 1024);
  return { sizeMB, ok: sizeMB <= maxSizeMB };
}

async function loadMetadata(path) {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load metadata: ${error.message}`);
  }
}

async function testOnnxInference() {
  try {
    // Try to load onnxruntime-node
    const ort = require('onnxruntime-node');
    
    log('  Loading ONNX session...', 'blue');
    const session = await ort.InferenceSession.create(MODEL_PATH);
    
    log(`  ✓ Model loaded successfully`, 'green');
    log(`    Input names: ${session.inputNames.join(', ')}`, 'blue');
    log(`    Output names: ${session.outputNames.join(', ')}`, 'blue');
    
    // Create dummy input [1, 4, 84, 84]
    const dummyInput = new Float32Array(1 * 4 * 84 * 84);
    for (let i = 0; i < dummyInput.length; i++) {
      dummyInput[i] = Math.random();
    }
    
    log('  Running inference test...', 'blue');
    const inputTensor = new ort.Tensor('float32', dummyInput, [1, 4, 84, 84]);
    const feeds = {};
    feeds[session.inputNames[0]] = inputTensor;
    
    const startTime = Date.now();
    const results = await session.run(feeds);
    const inferenceTime = Date.now() - startTime;
    
    const outputTensor = results[session.outputNames[0]];
    const outputData = outputTensor.data;
    
    log(`  ✓ Inference completed in ${inferenceTime}ms`, 'green');
    log(`    Output shape: [${outputTensor.dims.join(', ')}]`, 'blue');
    log(`    Q-values: [${Array.from(outputData.slice(0, 5)).map(v => v.toFixed(3)).join(', ')}]`, 'blue');
    
    // Verify output shape
    if (outputTensor.dims[0] !== 1) {
      throw new Error(`Expected batch size 1, got ${outputTensor.dims[0]}`);
    }
    
    const nActions = outputTensor.dims[1];
    log(`  ✓ Detected ${nActions} actions`, 'green');
    
    return { success: true, nActions, inferenceTime };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log('  ⚠ onnxruntime-node not installed, falling back to Python check', 'yellow');
      return await testPythonOnnxInference();
    }
    // If some other error occurred, try Python fallback too
    log(`  ⚠ Node inference failed (${error.message}). Trying Python fallback...`, 'yellow');
    return await testPythonOnnxInference();
  }
}

async function testPythonOnnxInference() {
  const pyCmds = ['python', 'python3'];
  const script = [
    "import json, sys, time",
    "import numpy as np",
    "import onnxruntime as ort",
    "model_path = sys.argv[1]",
    "sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])",
    "inp = sess.get_inputs()[0].name",
    "out = sess.get_outputs()[0].name",
    "x = np.random.rand(1,4,84,84).astype('float32')",
    "t0 = time.time()",
    "y = sess.run([out], {inp: x})[0]",
    "latency = int((time.time() - t0) * 1000)",
    "print(json.dumps({'shape': list(y.shape), 'latency': latency}))",
  ].join(';');

  for (const cmd of pyCmds) {
    try {
      const result = await new Promise((resolve, reject) => {
        execFile(cmd, ['-c', script, MODEL_PATH], { windowsHide: true }, (err, stdout, stderr) => {
          if (err) return reject(err);
          resolve({ stdout, stderr });
        });
      });

      const { stdout } = result;
      const parsed = JSON.parse(String(stdout || '{}'));
      if (!parsed.shape || parsed.shape[0] !== 1) {
        throw new Error('Unexpected output from Python onnxruntime test');
      }

      const nActions = parsed.shape[1];
      log(`  ✓ Python onnxruntime loaded model`, 'green');
      log(`    Output shape: [${parsed.shape.join(', ')}]`, 'blue');
      log(`    Inference time: ${parsed.latency}ms`, 'blue');
      return { success: true, nActions, inferenceTime: parsed.latency, via: 'python' };
    } catch (e) {
      // Try next interpreter
    }
  }

  throw new Error('Neither onnxruntime-node nor Python onnxruntime test could be executed');
}

async function main() {
  logSection('🔍 AI Doctor - Model Validation');
  
  let errors = 0;
  let warnings = 0;
  
  // Check if model exists
  log('\n1. Checking model file...', 'bold');
  const modelExists = await checkFileExists(MODEL_PATH);
  if (!modelExists) {
    log(`  ✗ Model not found: ${MODEL_PATH}`, 'red');
    log('    Run: npm run ai:convert', 'yellow');
    errors++;
  } else {
    log(`  ✓ Model found: ${MODEL_PATH}`, 'green');
    
    // Check size
    const { sizeMB, ok } = await checkFileSize(MODEL_PATH, MAX_SIZE_MB);
    if (ok) {
      log(`  ✓ Model size: ${sizeMB.toFixed(2)} MB (under ${MAX_SIZE_MB} MB limit)`, 'green');
    } else {
      log(`  ⚠ Model size: ${sizeMB.toFixed(2)} MB (exceeds ${MAX_SIZE_MB} MB limit)`, 'yellow');
      warnings++;
    }
  }
  
  // Check metadata
  log('\n2. Checking metadata...', 'bold');
  const metadataExists = await checkFileExists(METADATA_PATH);
  if (!metadataExists) {
    log(`  ✗ Metadata not found: ${METADATA_PATH}`, 'red');
    errors++;
  } else {
    log(`  ✓ Metadata found: ${METADATA_PATH}`, 'green');
    
    try {
      const metadata = await loadMetadata(METADATA_PATH);
      log(`    Source: ${metadata.sourceFile}`, 'blue');
      log(`    Model Type: ${metadata.modelType || 'unknown'}`, 'blue');
      if (metadata.steps) {
        log(`    Training Steps: ${metadata.steps.toLocaleString()}`, 'blue');
      }
      log(`    Actions: ${metadata.n_actions}`, 'blue');
      log(`    Input Shape: [${metadata.input.stack}, ${metadata.input.h}, ${metadata.input.w}]`, 'blue');
      log(`    SHA256: ${metadata.sha256.slice(0, 16)}...`, 'blue');
      log(`    Updated: ${metadata.updatedAt}`, 'blue');
    } catch (error) {
      log(`  ✗ Failed to parse metadata: ${error.message}`, 'red');
      errors++;
    }
  }
  
  // Test inference
  if (modelExists) {
    log('\n3. Testing inference...', 'bold');
    try {
      const result = await testOnnxInference();
      if (result.skipped) {
        warnings++;
      } else if (result.success) {
        log(`  ✓ Inference test passed`, 'green');
      }
    } catch (error) {
      log(`  ✗ Inference test failed: ${error.message}`, 'red');
      errors++;
    }
  }
  
  // Summary
  logSection('📊 Summary');
  if (errors === 0 && warnings === 0) {
    log('✓ Model OK — ready for use.', 'green');
    try {
      const md = await loadMetadata(METADATA_PATH);
      const stepsText = md.steps ? `${md.steps.toLocaleString()} steps` : 'steps: n/a';
      log(`  Source: ${md.sourceFile}`, 'blue');
      log(`  Actions: ${md.n_actions}`, 'blue');
      log(`  SHA256: ${md.sha256.slice(0, 16)}...`, 'blue');
      log(`  ${stepsText}`, 'blue');
    } catch {}
    console.log('\nYou can now:');
    console.log('  • Run: npm run dev');
    console.log('  • Visit: http://localhost:3000/ai/diagnostics');
    console.log('  • Play: http://localhost:3000 (toggle AI mode)');
    process.exit(0);
  } else if (errors === 0) {
    log(`⚠ Checks completed with ${warnings} warning(s)`, 'yellow');
    process.exit(0);
  } else {
    log(`✗ Checks failed with ${errors} error(s) and ${warnings} warning(s)`, 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n' + colors.red + '✗ Fatal error:' + colors.reset, error.message);
  process.exit(1);
});

