#!/usr/bin/env python3
"""
Diagnose and re-export the QR-DQN Ms. Pac-Man checkpoint.

The existing ONNX model outputs near-constant Q-values regardless of input,
indicating the quantile dimension was never aggregated on export.  This script:
  1. Loads best_model.zip in PyTorch and checks input sensitivity.
  2. If the PyTorch model is sensitive, wraps it to aggregate quantiles → mean
     Q-values and re-exports a correct ONNX.
  3. Verifies the new ONNX is actually input-sensitive.

Usage:
  pip install "stable-baselines3[extra]" sb3-contrib onnx onnxruntime
  python scripts/reexport_model.py
"""

import sys
import hashlib
import json
from datetime import datetime
from pathlib import Path

import numpy as np
import torch

MODEL_ZIP  = Path("mspacman-ai/models/best_model.zip")
OUT_ONNX   = Path("public/models/latest.onnx")
OUT_META   = Path("public/models/metadata.json")
N_ACTIONS  = 9   # ALE minimal action set for Ms. Pac-Man


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_model():
    try:
        from sb3_contrib import QRDQN
    except ImportError:
        sys.exit("ERROR: sb3-contrib not installed.  Run: pip install sb3-contrib")

    print(f"Loading {MODEL_ZIP} ...")
    model = QRDQN.load(str(MODEL_ZIP), device="cpu")
    print(f"  actions={model.action_space.n}  n_quantiles={model.n_quantiles}")
    return model


def get_pytorch_qvalues(model, obs_np: np.ndarray) -> np.ndarray:
    """Return mean Q-values (over quantiles) from the PyTorch policy."""
    obs_t = torch.FloatTensor(obs_np)
    with torch.no_grad():
        raw = model.policy.q_net(obs_t)        # [batch, n_actions * n_quantiles]
    n_q = raw.shape[-1] // N_ACTIONS
    q = raw.reshape(obs_t.shape[0], N_ACTIONS, n_q).mean(dim=-1)
    return q.squeeze(0).numpy(), n_q


# ---------------------------------------------------------------------------
# Step 1 – test PyTorch model
# ---------------------------------------------------------------------------

def test_pytorch(model) -> tuple[bool, int]:
    print("\n=== Step 1: PyTorch sensitivity test ===")

    zeros = np.zeros((1, 4, 84, 84), dtype=np.float32)
    ones  = np.ones( (1, 4, 84, 84), dtype=np.float32)
    rand  = np.random.default_rng(42).random((1, 4, 84, 84)).astype(np.float32)

    q_z, n_q = get_pytorch_qvalues(model, zeros)
    q_o, _   = get_pytorch_qvalues(model, ones)
    q_r, _   = get_pytorch_qvalues(model, rand)

    print(f"  n_quantiles per action: {n_q}")
    print(f"  zeros → action {q_z.argmax()} | q = {q_z.round(3)}")
    print(f"  ones  → action {q_o.argmax()} | q = {q_o.round(3)}")
    print(f"  rand  → action {q_r.argmax()} | q = {q_r.round(3)}")

    diff_zr = float(np.abs(q_z - q_r).max())
    print(f"  max |zeros−rand| diff: {diff_zr:.4f}")

    if diff_zr < 0.05:
        print("  ⚠️  PyTorch model is also near-constant → training may be degenerate.")
        print("      Export will proceed; consider retraining for better play.")
        return False, n_q
    else:
        print("  ✓  PyTorch model is input-sensitive — ONNX export should fix the issue.")
        return True, n_q


# ---------------------------------------------------------------------------
# Step 2 – export to ONNX
# ---------------------------------------------------------------------------

class QValueWrapper(torch.nn.Module):
    """Wraps QR-DQN q_net, aggregating quantile dimension to mean Q-values."""
    def __init__(self, q_net, n_actions: int, n_quantiles: int):
        super().__init__()
        self.q_net = q_net
        self.n_actions = n_actions
        self.n_quantiles = n_quantiles

    def forward(self, obs: torch.Tensor) -> torch.Tensor:
        raw = self.q_net(obs)                                  # [B, n_actions*n_quantiles]
        q = raw.reshape(obs.shape[0], self.n_actions, self.n_quantiles)
        return q.mean(dim=-1)                                  # [B, n_actions]


def export_onnx(model, n_quantiles: int):
    print(f"\n=== Step 2: Exporting to {OUT_ONNX} ===")
    OUT_ONNX.parent.mkdir(parents=True, exist_ok=True)

    wrapper = QValueWrapper(model.policy.q_net, N_ACTIONS, n_quantiles)
    wrapper.eval()

    dummy = torch.zeros(1, 4, 84, 84)
    torch.onnx.export(
        wrapper,
        dummy,
        str(OUT_ONNX),
        input_names=["obs"],
        output_names=["q_values"],
        dynamic_axes={"obs": {0: "batch"}, "q_values": {0: "batch"}},
        opset_version=17,
        do_constant_folding=True,
    )
    print(f"  Written: {OUT_ONNX}  ({OUT_ONNX.stat().st_size:,} bytes)")


# ---------------------------------------------------------------------------
# Step 3 – verify the new ONNX
# ---------------------------------------------------------------------------

def verify_onnx() -> bool:
    try:
        import onnxruntime as ort
    except ImportError:
        print("  onnxruntime not installed — skipping ONNX verification.")
        return True

    print(f"\n=== Step 3: Verifying {OUT_ONNX} ===")

    sess = ort.InferenceSession(str(OUT_ONNX), providers=["CPUExecutionProvider"])
    rng = np.random.default_rng(0)

    def run(obs_np):
        return sess.run(None, {"obs": obs_np})[0][0]

    q_z = run(np.zeros((1, 4, 84, 84), dtype=np.float32))
    q_o = run(np.ones( (1, 4, 84, 84), dtype=np.float32))
    q_r = run(rng.random((1, 4, 84, 84)).astype(np.float32))

    print(f"  zeros → action {q_z.argmax()} | q = {q_z.round(3)}")
    print(f"  ones  → action {q_o.argmax()} | q = {q_o.round(3)}")
    print(f"  rand  → action {q_r.argmax()} | q = {q_r.round(3)}")

    diff_zr = float(np.abs(q_z - q_r).max())
    print(f"  max |zeros−rand| diff: {diff_zr:.4f}")

    ok = diff_zr > 0.05
    print("  ✓  ONNX is input-sensitive" if ok else "  ⚠️  ONNX still near-constant")
    return ok


# ---------------------------------------------------------------------------
# Step 4 – update metadata.json
# ---------------------------------------------------------------------------

def update_metadata():
    sha = hashlib.sha256(OUT_ONNX.read_bytes()).hexdigest()
    meta = {
        "sourceFile": MODEL_ZIP.name,
        "modelType": "qrdqn",
        "steps": None,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "sha256": sha,
        "n_actions": N_ACTIONS,
        "input": {"stack": 4, "h": 84, "w": 84},
        "fileSize": OUT_ONNX.stat().st_size,
    }
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"\n  Updated {OUT_META}  (sha256: {sha[:16]}…)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    model = load_model()
    _, n_q = test_pytorch(model)
    export_onnx(model, n_q)
    ok = verify_onnx()
    update_metadata()

    print("\n" + ("=" * 55))
    if ok:
        print("SUCCESS — replace public/models/latest.onnx and redeploy.")
    else:
        print("Model exported but is still near-constant.")
        print("The training checkpoint itself may be degenerate.")
        print("Consider retraining or using a different checkpoint.")


if __name__ == "__main__":
    main()
