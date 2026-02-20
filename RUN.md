# Run Node

**เอกสารหลักอยู่ที่ [README.md](README.md)** — ดูหัวข้อ "Quick Start", "Configuration", "Security"

```bash
# Worker
python3 core/deai/worker_node.py

# Monolith Scout
python3 core/deai/worker_node.py --config configs/monolith_scout_single.toml

# HYDRA (Sentinel + Worker)
python3 hydra_manager.py

# อัพเดท
python3 scripts/update-node.py
```
