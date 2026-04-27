"""
Project HYDRA — Monolith MK-I Dual-Core (Split-Brain) Controller.

Launches Sentinel (Brain A) and Worker (Brain B) nodes with separate configs,
monitors health, and restarts on failure. Run from repo root.
"""

import logging
import signal
import subprocess
import sys
import time
from pathlib import Path
from threading import Thread

# Paths relative to repo root (where this script lives)
REPO_ROOT = Path(__file__).resolve().parent
SENTINEL_CONFIG = REPO_ROOT / "configs" / "monolith_sentinel.toml"
WORKER_CONFIG = REPO_ROOT / "configs" / "monolith_worker.toml"
WORKER_SCRIPT = REPO_ROOT / "core" / "deai" / "worker_node.py"

logging.basicConfig(
    level=logging.INFO,
    format="[HYDRA] %(asctime)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("HYDRA")

# Track live processes for clean shutdown
processes: list[subprocess.Popen] = []


def start_node(config_path: Path, role: str) -> subprocess.Popen | None:
    """Start a worker node subprocess."""
    logger.info("Launching %s Core...", role)
    try:
        p = subprocess.Popen(
            [sys.executable, str(WORKER_SCRIPT), "--config", str(config_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(REPO_ROOT),
        )
        return p
    except Exception as e:
        logger.error("Failed to start %s: %s", role, e)
        return None


def monitor_output(process: subprocess.Popen, role: str) -> None:
    """Print stdout from subprocess (optional, for attached logs)."""
    if process.stdout is None:
        return
    while True:
        line = process.stdout.readline()
        if line:
            print(f"[{role}] {line.rstrip()}")
        if process.poll() is not None:
            break


def hardware_control_loop() -> None:
    """Simulate LED/OLED control based on status (TODO: real hardware)."""
    while True:
        # TODO: Read CPU load or Hailo temp and adjust LED
        time.sleep(5)


def main() -> None:
    logger.info("Initializing Monolith MK-I: Project HYDRA")

    if not WORKER_SCRIPT.exists():
        logger.error("Worker script not found: %s", WORKER_SCRIPT)
        sys.exit(1)
    if not SENTINEL_CONFIG.exists():
        logger.error("Sentinel config not found: %s", SENTINEL_CONFIG)
        sys.exit(1)
    if not WORKER_CONFIG.exists():
        logger.error("Worker config not found: %s", WORKER_CONFIG)
        sys.exit(1)

    sentinel = start_node(SENTINEL_CONFIG, "SENTINEL")
    if sentinel:
        processes.append(sentinel)

    worker = start_node(WORKER_CONFIG, "WORKER")
    if worker:
        processes.append(worker)

    hw_thread = Thread(target=hardware_control_loop, daemon=True)
    hw_thread.start()

    logger.info("All Systems Operational. Split-Brain Architecture Active.")

    try:
        while True:
            time.sleep(1)
            if sentinel is not None and sentinel.poll() is not None:
                logger.warning("Sentinel Core died! Restarting...")
                processes.remove(sentinel)
                sentinel = start_node(SENTINEL_CONFIG, "SENTINEL")
                if sentinel:
                    processes.append(sentinel)
            if worker is not None and worker.poll() is not None:
                logger.warning("Worker Core died! Restarting...")
                processes.remove(worker)
                worker = start_node(WORKER_CONFIG, "WORKER")
                if worker:
                    processes.append(worker)
    except KeyboardInterrupt:
        logger.info("Shutting down HYDRA...")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
            except Exception as e:
                logger.debug("Terminate: %s", e)
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    main()
