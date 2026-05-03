# Monolith Hardware Roadmap — MK-I to MK-IV

Hardware blueprint for Project Monolith from Edge AI to Planetary Intelligence.

*Linked: [PROJECT_ASCENSION.md](./PROJECT_ASCENSION.md) (Executive Summary)*

---

## Generations and Codename

| Gen | Codename | Meaning |
|-----|----------|---------|
| **MK-I** | **Vanguard** / **Origin** | Origin — ready to build (2026) |
| **MK-II** | **Prism** | Light refraction — mid-term (2027–2028) |
| **MK-III** | **Ethereal** | Ethereal — long-term (2029–2032) |
| **MK-IV** | **Gaia** (The Living Node) | Singularity — living node (2035+) |

---

## Specification Matrix

| Attribute | MK-I (current) | MK-II (mid-term) | MK-III (long-term) | MK-IV (singularity) |
|-----------|----------------|------------------|--------------------|---------------------|
| **Codename** | **Vanguard** / **Origin** | **Prism** | **Ethereal** | **Gaia** (The Living Node) |
| **Timeline** | 2026 (Ready to Build) | 2027 – 2028 | 2029 – 2032 | 2035+ |
| **Core tech** | Silicon (ARM + NPU)<br/>RPi 5 + Hailo / Jetson | Custom ASIC / FPGA<br/>Axionax-specific chip | Photonic Computing<br/>Light-based compute | Bio-Synthetic / Quantum<br/>Biological + quantum chip |
| **Compute** | 80 – 100 TOPS<br/>Edge AI | 1,000+ TOPS<br/>Enterprise AI | ExaFLOPS<br/>Speed of Light | Infinite / Unknown<br/>Planetary Intelligence |
| **Design** | **Obsidian Tower** — matte black, heat fins, bold | **Crystalline** — transparent, visible circuits, light in chassis | **The Void Cube** — Vantablack, seamless, levitating | **Organic Morph** — liquid metal or synthetic tissue, shape-shifting |
| **Cooling** | Active Air (fan + heatsink) | Liquid Cooling (closed loop / oil immersion) | Zero Heat (light does not heat like electricity) | Homeostasis (fluid circulation like blood) |
| **Primary role** | Worker / Sentinel — general jobs + sentinel | Trainer / Heavy Compute — mid-size training + 3D render | Global Oracle — global weather, genome decoding | Neural Interface — human brain link + ecosystem control |
| **Power** | 15 – 25 W (lightbulb range) | 50 – 100 W (desk fan range) | &lt; 5 W (light/laser powered) | Self-Sustaining (photosynthesis or ambient energy) |

---

## Mapping to Current Codebase

| Gen | Status in Repo | Notes |
|-----|----------------|-------|
| **MK-I** | ✅ Usable | `compute_backend.py` → `TYPE_NPU` (Hailo), `hydra_manager.py`, configs `monolith_sentinel.toml` / `monolith_worker.toml` |
| **MK-II** | 🔶 Simulation | `deai/optical/` (OTPU), `compute_backend.py` → `TYPE_PHOTONIC` |
| **MK-III** | 📐 Planned | Proof-of-Light, Vantablack / Levitating — in ASCENSION scope |
| **MK-IV** | 🌐 Vision | Gaia, Bio-Synthetic — reference only |

---

*This document is the single source of truth for Monolith hardware generations in Axionax Core Universe.*
