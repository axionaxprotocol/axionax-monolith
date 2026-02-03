"""
[EVOLUTION] Hardware Abstraction Layer (HAL) for Axionax DeAI.

Makes Axionax agnostic to underlying hardware: GPU (SILICON) or Photonic Chip (PHOTONIC).
This is where we "plug in light" when Monolith Mark-II hardware is available.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Union

logger = logging.getLogger(__name__)

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# Optional: optical simulation (Monolith Mark-II mock)
try:
    from optical import OpticalTensor
    OPTICAL_AVAILABLE = True
except ImportError:
    OpticalTensor = None  # type: ignore[misc, assignment]
    OPTICAL_AVAILABLE = False


# -----------------------------------------------------------------------------
# Compute Backend (HAL)
# -----------------------------------------------------------------------------

class ComputeBackend:
    """
    [EVOLUTION] Abstract Compute Backend.
    SILICON = current GPU/CPU; PHOTONIC = future ACCEL/Taichi (mock today).
    """

    TYPE_SILICON = "SILICON"
    TYPE_PHOTONIC = "PHOTONIC"
    TYPE_HYBRID = "HYBRID"

    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.type = str(config.get("compute_type", self.TYPE_SILICON)).upper()
        if self.type not in (self.TYPE_SILICON, self.TYPE_PHOTONIC, self.TYPE_HYBRID):
            self.type = self.TYPE_SILICON

        self._device: Any = None
        self._optical_ops: Optional[Any] = None

        enable_optical = config.get("enable_optical_bridge", False)
        if self.type == self.TYPE_PHOTONIC and enable_optical:
            self._init_optical_link()
        else:
            if self.type == self.TYPE_PHOTONIC and not enable_optical:
                logger.info("PHOTONIC requested but optical_bridge disabled; using SILICON")
            self._init_silicon()

    def _init_silicon(self) -> None:
        """Initialize GPU or CPU (current hardware)."""
        self.type = self.TYPE_SILICON
        if TORCH_AVAILABLE and torch.cuda.is_available() and not self.config.get("force_cpu", False):
            device_id = self.config.get("cuda_device_id", 0)
            self._device = torch.device("cuda", device_id)
            logger.info("ComputeBackend: SILICON (CUDA)")
        else:
            self._device = torch.device("cpu") if TORCH_AVAILABLE else "cpu"
            logger.info("ComputeBackend: SILICON (CPU)")

    def _init_optical_link(self) -> None:
        """Future: connection to ACCEL/Taichi. Today: simulation (OpticalTensor)."""
        if OPTICAL_AVAILABLE and OpticalTensor is not None:
            self._optical_ops = OpticalTensor
            self._device = "photonic"  # Placeholder; no torch device
            logger.info("ComputeBackend: PHOTONIC (simulation / optical bridge)")
        else:
            logger.warning("Optical bridge enabled but optical module unavailable; falling back to SILICON")
            self._init_silicon()

    def get_device(self) -> Any:
        """
        Return the active device for tensor placement.
        SILICON: torch.device("cuda") or torch.device("cpu").
        PHOTONIC: placeholder "photonic" (no torch device).
        """
        if self._device is None:
            self._init_silicon()
        return self._device

    def matrix_multiply(
        self,
        a: Any,
        b: Any,
    ) -> Any:
        """
        Matrix multiply: SILICON uses torch.matmul; PHOTONIC uses optical (simulation).
        a, b: for SILICON expect torch.Tensor; for PHOTONIC expect array-like or OpticalTensor.
        """
        if self.type == self.TYPE_PHOTONIC and self._optical_ops is not None and OpticalTensor is not None:
            # Send to light (simulation)
            if not isinstance(a, OpticalTensor):
                a = self._optical_ops(a)
            if not isinstance(b, OpticalTensor):
                b = self._optical_ops(b)
            result = a.matmul_speed_of_light(b)
            return result.waveguide_matrix  # Return array for compatibility
        # SILICON
        if TORCH_AVAILABLE and isinstance(a, torch.Tensor) and isinstance(b, torch.Tensor):
            return torch.matmul(a, b)
        # Fallback for non-tensor (e.g. numpy in tests)
        try:
            import numpy as np
            return np.dot(a, b) if hasattr(a, "__len__") else (a * b)
        except Exception:
            raise NotImplementedError("matrix_multiply: unsupported types for this backend")

    def is_photonic(self) -> bool:
        """True if backend is PHOTONIC (real or simulated)."""
        return self.type == self.TYPE_PHOTONIC

    def is_silicon(self) -> bool:
        """True if backend is SILICON (GPU/CPU)."""
        return self.type == self.TYPE_SILICON

    def capabilities_dict(self) -> Dict[str, Any]:
        """For node identity / ASR: compute_type, device label, optical capability."""
        device = self.get_device()
        device_str = str(device) if device is not None else "unknown"
        return {
            "compute_type": self.type,
            "device": device_str,
            "optical_bridge_available": self._optical_ops is not None,
        }
