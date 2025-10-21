#!/usr/bin/env python3
"""
SB3 Model to ONNX Converter
Converts Stable-Baselines3 DQN/QRDQN models to ONNX format for browser inference
"""

import argparse
import json
import hashlib
import os
import sys
from pathlib import Path
from datetime import datetime

# Numpy compatibility fix for models saved with older numpy versions
import sys
import numpy as np

# Monkey-patch numpy to handle old pickle references
import numpy.core
if not hasattr(np, '_core'):
    np._core = np.core
    
# Map old numpy modules to new ones
sys.modules['numpy._core'] = np.core
sys.modules['numpy._core.numeric'] = np.core.numeric
sys.modules['numpy._core.multiarray'] = np.core.multiarray

try:
    import torch
    import onnx
    from stable_baselines3 import DQN
    from sb3_contrib import QRDQN
except ImportError as e:
    print(f"Error: Required package not found: {e}")
    print("\nPlease install required packages:")
    print("  pip install torch stable-baselines3 sb3-contrib onnx onnxruntime")
    sys.exit(1)


class DQNWrapper(torch.nn.Module):
    """Wrapper to export DQN Q-network"""
    
    def __init__(self, model, model_type='dqn'):
        super().__init__()
        self.q_net = model.q_net
        self.model_type = model_type
    
    def forward(self, x):
        """Forward pass returning Q-values"""
        q_values = self.q_net(x)
        
        # For QRDQN, take mean over quantiles
        if self.model_type == 'qrdqn' and len(q_values.shape) > 2:
            # Shape: [batch, n_quantiles, n_actions] -> [batch, n_actions]
            q_values = q_values.mean(dim=1)
        
        return q_values


def load_model(checkpoint_path: str):
    """Load SB3 model, trying DQN first, then QRDQN"""
    print(f"Loading model from: {checkpoint_path}")
    
    # Try DQN first
    try:
        model = DQN.load(checkpoint_path, print_system_info=False)
        print("Loaded as DQN model")
        return model, 'dqn'
    except Exception as e:
        print(f"  Not a DQN model: {e}")
    
    # Try QRDQN
    try:
        model = QRDQN.load(checkpoint_path, print_system_info=False)
        print("Loaded as QRDQN model")
        return model, 'qrdqn'
    except Exception as e:
        print(f"  Not a QRDQN model: {e}")
    
    raise ValueError("Could not load model as DQN or QRDQN")


def extract_steps_from_filename(filename: str) -> int | None:
    """Try to extract training steps from filename"""
    import re
    match = re.search(r'(\d+)_steps', filename)
    if match:
        return int(match.group(1))
    return None


def export_to_onnx(
    checkpoint_path: str,
    output_path: str = "public/models/latest.onnx",
    metadata_path: str = "public/models/metadata.json"
):
    """Convert SB3 model to ONNX format"""
    
    # Load model
    model, model_type = load_model(checkpoint_path)
    
    # Get model info
    n_actions = model.action_space.n
    print(f"Model type: {model_type.upper()}")
    print(f"Number of actions: {n_actions}")
    
    # Wrap model
    wrapper = DQNWrapper(model, model_type)
    wrapper.eval()
    
    # Create dummy input: [batch=1, channels=4, height=84, width=84]
    dummy_input = torch.randn(1, 4, 84, 84, dtype=torch.float32)
    
    # Test forward pass
    print("\nTesting forward pass...")
    with torch.no_grad():
        output = wrapper(dummy_input)
        print(f"  Input shape: {list(dummy_input.shape)}")
        print(f"  Output shape: {list(output.shape)}")
        print(f"  Output (Q-values): {output.numpy()}")
    
    # Export to ONNX
    print(f"\nExporting to ONNX: {output_path}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    torch.onnx.export(
        wrapper,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch'},
            'output': {0: 'batch'}
        }
    )
    
    # Verify ONNX model
    print("Verifying ONNX model...")
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model is valid")
    
    # Calculate SHA256
    sha256_hash = hashlib.sha256()
    with open(output_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    sha256 = sha256_hash.hexdigest()
    
    # Get file size
    file_size = os.path.getsize(output_path)
    print(f"Model size: {file_size / 1024 / 1024:.2f} MB")
    print(f"SHA256: {sha256[:16]}...")
    
    # Extract steps if possible
    steps = extract_steps_from_filename(os.path.basename(checkpoint_path))
    
    # Create metadata
    metadata = {
        "sourceFile": os.path.basename(checkpoint_path),
        "modelType": model_type,
        "steps": steps,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "sha256": sha256,
        "n_actions": n_actions,
        "input": {
            "stack": 4,
            "h": 84,
            "w": 84
        },
        "fileSize": file_size
    }
    
    # Save metadata
    print(f"\nSaving metadata: {metadata_path}")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("\n" + "="*60)
    print("Export completed successfully!")
    print("="*60)
    print(f"ONNX model: {output_path}")
    print(f"Metadata:   {metadata_path}")
    if steps:
        print(f"Steps:      {steps:,}")
    print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Convert SB3 DQN/QRDQN model to ONNX format"
    )
    parser.add_argument(
        "--ckpt",
        type=str,
        required=True,
        help="Path to SB3 checkpoint (.zip file)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="public/models/latest.onnx",
        help="Output ONNX file path"
    )
    parser.add_argument(
        "--metadata",
        type=str,
        default="public/models/metadata.json",
        help="Output metadata JSON path"
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.ckpt):
        print(f"Error: Checkpoint file not found: {args.ckpt}")
        sys.exit(1)
    
    try:
        export_to_onnx(args.ckpt, args.output, args.metadata)
    except Exception as e:
        print(f"\nError during export: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

