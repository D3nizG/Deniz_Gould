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

import numpy as np
import gymnasium as gym

# Delayed NumPy aliasing for old pickles.
# Some older SB3 checkpoints reference modules under `numpy._core.*`.
# Creating these aliases too early can interfere with binary wheels like pandas on macOS.
# We therefore prepare aliases only immediately before unpickling the model.
def _prepare_numpy_pickle_aliases() -> None:
    try:
        import numpy as _np
        import numpy.core as _np_core
        import numpy.random as _np_random
        import types as _types
        # Provide attribute for older pickles that expect `numpy._core`
        if not hasattr(_np, '_core'):
            _np._core = _np_core  # type: ignore[attr-defined]

        # Register alias modules if they are not already present
        sys.modules.setdefault('numpy._core', _np_core)
        sys.modules.setdefault('numpy._core.numeric', _np_core.numeric)
        sys.modules.setdefault('numpy._core.multiarray', _np_core.multiarray)

        # Numpy random compatibility (older pickles reference private modules)
        try:
            import numpy.random.bit_generator as _bitgen
            sys.modules.setdefault('numpy.random._bit_generator', _bitgen)
        except Exception:
            pass
        try:
            import numpy.random._pcg64 as _pcg64
            sys.modules.setdefault('numpy.random.pcg64', _pcg64)
        except Exception:
            pass

        # Extend BitGenerators mapping used by numpy.random._pickle to accept
        # strings that some older environments embedded (module-qualified names)
        try:
            import numpy.random._pickle as _np_pickle
            # Ensure required classes exist
            from numpy.random._pcg64 import PCG64, PCG64DXSM  # noqa: F401
            from numpy.random._mt19937 import MT19937  # noqa: F401
            from numpy.random._philox import Philox  # noqa: F401
            from numpy.random._sfc64 import SFC64  # noqa: F401

            if isinstance(getattr(_np_pickle, 'BitGenerators', None), dict):
                # Already initialized by numpy; we can add alternate keys
                bg = _np_pickle.BitGenerators
                # Add fully-qualified names sometimes seen in pickles
                for name in list(bg.keys()):
                    qual = f"numpy.random._{name.lower()}.{name}"
                    bg.setdefault(qual, bg[name])
                    qual2 = f"numpy.random.{name.lower()}.{name}"
                    bg.setdefault(qual2, bg[name])

            # Monkey-patch constructors to tolerate class objects or qualified names
            _orig_ctor = getattr(_np_pickle, '__bit_generator_ctor', None)

            def _patched_bitgen_ctor(bit_generator_name='MT19937'):
                # Accept class objects
                if isinstance(bit_generator_name, type):
                    try:
                        return bit_generator_name()
                    except Exception:
                        pass
                # Accept qualified strings like 'numpy.random._pcg64.PCG64'
                if isinstance(bit_generator_name, str):
                    base = bit_generator_name.rsplit('.', 1)[-1]
                    if hasattr(_np_pickle, 'BitGenerators') and base in _np_pickle.BitGenerators:
                        return _np_pickle.BitGenerators[base]()
                # Fallback to original behavior
                if callable(_orig_ctor):
                    return _orig_ctor(bit_generator_name)
                # Last resort: default to PCG64
                from numpy.random._pcg64 import PCG64 as _PCG64
                return _PCG64()

            def _patched_generator_ctor(bit_generator_name='MT19937', bit_generator_ctor=_patched_bitgen_ctor):
                from numpy.random import Generator as _Generator
                return _Generator(bit_generator_ctor(bit_generator_name))

            def _patched_randomstate_ctor(bit_generator_name='MT19937', bit_generator_ctor=_patched_bitgen_ctor):
                from numpy.random.mtrand import RandomState as _RandomState
                return _RandomState(bit_generator_ctor(bit_generator_name))

            _np_pickle.__bit_generator_ctor = _patched_bitgen_ctor  # type: ignore[attr-defined]
            _np_pickle.__generator_ctor = _patched_generator_ctor  # type: ignore[attr-defined]
            _np_pickle.__randomstate_ctor = _patched_randomstate_ctor  # type: ignore[attr-defined]
        except Exception:
            pass
    except Exception:
        # Best-effort compatibility; if aliasing fails we continue and let load() try.
        pass

class _NoPandasImport:
    # Context manager to prevent pandas import during SB3 import side-effects
    def __enter__(self):
        self._orig = sys.modules.get('pandas')
        sys.modules['pandas'] = None  # type: ignore[assignment]
    def __exit__(self, exc_type, exc, tb):
        if self._orig is None and 'pandas' in sys.modules and sys.modules['pandas'] is None:
            del sys.modules['pandas']
        elif self._orig is not None:
            sys.modules['pandas'] = self._orig

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
        # For DQN: Q-network lives under policy.q_net in SB3 >=2.7.0
        # For QRDQN: quantile_net returns [n_quantiles, n_actions], we average over quantiles
        if hasattr(model, 'policy') and hasattr(model.policy, 'q_net'):
            self.backend = 'dqn'
            self.q_net = model.policy.q_net
        elif hasattr(model, 'policy') and hasattr(model.policy, 'quantile_net'):
            self.backend = 'qrdqn'
            self.quantile_net = model.policy.quantile_net
        else:
            raise AttributeError('Unsupported model: missing q_net/quantile_net')
        self.model_type = model_type
    
    def forward(self, x):
        """Forward pass returning Q-values"""
        if self.backend == 'dqn':
            return self.q_net(x)
        # QRDQN: output shape [batch, n_quantiles, n_actions] -> mean over quantiles
        q = self.quantile_net(x)
        if q.dim() == 3:
            q = q.mean(dim=1)
        return q


def load_model(checkpoint_path: str):
    """Load SB3 model, trying DQN first, then QRDQN"""
    print(f"Loading model from: {checkpoint_path}")
    
    # Try DQN first
    try:
        _prepare_numpy_pickle_aliases()
        # Provide minimal custom objects/spaces for older checkpoints
        # Use channels-first layout expected by PyTorch conv nets
        obs_space = gym.spaces.Box(low=0, high=255, shape=(4, 84, 84), dtype=np.uint8)
        n_action_guesses = [9, 4, 6, 8]  # try common Atari variants
        last_err: Exception | None = None
        for n_actions in n_action_guesses:
            try:
                act_space = gym.spaces.Discrete(n_actions)
                custom = {
                    'observation_space': obs_space,
                    'action_space': act_space,
                    'lr_schedule': 0.0,
                    'exploration_schedule': 0.0,
                }
                # Temporarily suppress pandas import while loading to avoid macOS+numpy alias issue
                with _NoPandasImport():
                    model = DQN.load(checkpoint_path, print_system_info=False, custom_objects=custom, device='cpu')
                break
            except Exception as e:
                last_err = e
                model = None  # type: ignore[assignment]
        if model is None:
            raise last_err or RuntimeError('Failed to load DQN model with guessed spaces')
        print("Loaded as DQN model")
        return model, 'dqn'
    except Exception as e:
        print(f"  Not a DQN model: {e}")
    
    # Try QRDQN
    try:
        _prepare_numpy_pickle_aliases()
        obs_space = gym.spaces.Box(low=0, high=255, shape=(4, 84, 84), dtype=np.uint8)
        n_action_guesses = [9, 4, 6, 8]
        last_err: Exception | None = None
        for n_actions in n_action_guesses:
            try:
                act_space = gym.spaces.Discrete(n_actions)
                custom = {
                    'observation_space': obs_space,
                    'action_space': act_space,
                    'lr_schedule': 0.0,
                    'exploration_schedule': 0.0,
                }
                with _NoPandasImport():
                    model = QRDQN.load(checkpoint_path, print_system_info=False, custom_objects=custom, device='cpu')
                break
            except Exception as e:
                last_err = e
                model = None  # type: ignore[assignment]
        if model is None:
            raise last_err or RuntimeError('Failed to load QRDQN model with guessed spaces')
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
    
    # Ensure JSON-serializable primitives
    def _to_int(x):
        try:
            return int(x)
        except Exception:
            return x

    # Create metadata
    metadata = {
        "sourceFile": os.path.basename(checkpoint_path),
        "modelType": model_type,
        "steps": _to_int(steps) if steps is not None else None,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "sha256": sha256,
        "n_actions": _to_int(n_actions),
        "input": {
            "stack": _to_int(4),
            "h": _to_int(84),
            "w": _to_int(84)
        },
        "fileSize": _to_int(file_size)
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

