# Run for real — production-ready usage

**การใช้งานหลัก:** มี **Website** ให้ใช้งาน ([axionax.org](https://axionax.org)); คู่มือนี้สำหรับผู้ที่ต้องการรันโหนดเอง  

**Monolith MK-I Scout / Production:** ดู **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)** — checklist สำหรับ production และ Scout

This guide gets you running the **Worker Node** and **Project HYDRA** (Monolith MK-I) for real use.

---

## Prerequisites

- **Python 3.10+** with `core/deai/requirements.txt` installed
- **RPC access** to an Axionax node (testnet or your own)
- **Wallet** (created automatically on first run if missing)

```bash
cd core/deai
pip install -r requirements.txt
```

---

## 1. Configure

### Option A: Use default worker config

From repo root, the worker expects a config file. Default is `core/deai/worker_config.toml` (already present with testnet bootnodes).

### Option B: Use Monolith HYDRA configs

Two configs for dual-core (Sentinel + Worker):

- `configs/monolith_sentinel.toml` — Hailo device 0, Sentinel role  
- `configs/monolith_worker.toml` — Hailo device 1, Worker role  

### Option C: Override with environment

Copy and edit env file:

```bash
cd core/deai
cp .env.example .env
# Edit .env: set AXIONAX_RPC_URL or AXIONAX_BOOTNODES
```

| Variable | Description |
|----------|-------------|
| `AXIONAX_RPC_URL` | Single RPC URL (overrides config bootnodes) |
| `AXIONAX_BOOTNODES` | Comma-separated RPC URLs |
| `AXIONAX_CHAIN_ID` | Chain ID (optional) |

---

## 2. Run a single worker

From **repo root**:

```bash
# Default config (core/deai/worker_config.toml)
python core/deai/worker_node.py

# Monolith worker config
python core/deai/worker_node.py --config configs/monolith_worker.toml

# Custom config path
python core/deai/worker_node.py --config /path/to/worker_config.toml
```

From **core/deai**:

```bash
cd core/deai
python worker_node.py
# or
python worker_node.py --config ../../configs/monolith_worker.toml
```

If the config file is not found, the process exits with a clear error and hints.

---

## 3. Run Project HYDRA (Dual-Core)

Starts **Sentinel** and **Worker** nodes in parallel with auto-restart:

```bash
# From repo root
python hydra_manager.py
```

Stop with **Ctrl+C** (clean shutdown of both processes).

---

## 4. Run scripts (optional)

From repo root:

**Windows (PowerShell):**
```powershell
.\scripts\run-worker.ps1
# or with config
.\scripts\run-worker.ps1 -Config configs\monolith_worker.toml
```

**Linux / macOS:**
```bash
chmod +x scripts/run-worker.sh
./scripts/run-worker.sh
# or
./scripts/run-worker.sh configs/monolith_worker.toml
```

---

## 5. Security (ความปลอดภัย)

- **ห้าม commit** ไฟล์ `.env` หรือ `worker_key.json` (มีใน `.gitignore` แล้ว)
- **Backup:** หลังรัน worker ครั้งแรก ให้ copy `worker_key.json` และเก็บรหัสผ่านไว้ในที่ปลอดภัย
- **Production:** พิจารณาใช้ `WORKER_PRIVATE_KEY` จาก environment แทนไฟล์
- คู่มือเข้าร่วมเครือข่ายแบบย่อ (ง่าย + ปลอดภัย): **[JOIN.md](JOIN.md)**

---

## 6. Verify

- **ตรวจความเหมาะสม + เลือกประเภทโหนด + รัน** (แนะนำสำหรับคนที่เพิ่งเข้าร่วม):
  ```bash
  python scripts/join-axionax.py
  ```
- **อัปเดตทุกเครื่องที่เข้าร่วมเครือข่าย (ไม่ต้องบอก IP):** รันบนเครื่องที่รันโหนด:
  ```bash
  python scripts/update-node.py
  ```
- **One-step join check** (ตรวจ config + RPC อย่างเดียว):
  ```bash
  python scripts/join-network.py
  ```
- **Production / Monolith Scout** (ตรวจ config + RPC + checklist):
  ```bash
  python scripts/verify-production-ready.py --config configs/monolith_scout_single.toml
  ```
- **Health check script** (from repo root):
  ```bash
  python scripts/health-check.py
  python scripts/health-check.py --config configs/monolith_worker.toml --skip-wallet
  ```
- **RPC:** `curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://YOUR_RPC:8545`
- **Worker:** After start you should see "Worker registered successfully" and "Starting Axionax Worker Node".
- **Wallet:** First run creates `core/deai/worker_key.json` (back it up; do not commit).

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Config file not found | Use absolute path or run from repo root with `--config configs/...` |
| No bootnodes | Set `[network] bootnodes` in TOML or `AXIONAX_RPC_URL` / `AXIONAX_BOOTNODES` in `.env` |
| Connection refused | Check RPC URL and firewall; ensure chain is up |
| Wallet password | On first run you may be prompted; use a strong password and store it safely |
