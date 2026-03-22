# รายงาน Docker และ CI (Docker & CI Report)

**วันที่ตรวจ:** มีนาคม 2025  
**ขอบเขต:** Dockerfiles, docker-compose, GitHub Actions

---

## สรุปผลการตรวจและสิ่งที่แก้แล้ว

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| Root CI (`.github/workflows/ci.yml`) | ✅ ใช้ได้ | working-directory: core, paths ตรงกับโครง repo |
| `docker-compose.dev.yml` (root) | ✅ แก้แล้ว | dockerfile path เป็น `ops/deploy/Dockerfile`, ลบ volume `./core/src` ที่ไม่ตรง |
| `ops/deploy/Dockerfile` | ✅ ตรงโครง | context = `core/`, build `-p node` → `axionax-node` |
| `ops/deploy/Dockerfile.faucet` | ✅ ตรงโครง | context = `core/`, build `-p axionax-faucet` |
| `ops/deploy/docker-compose.yaml` | ✅ แก้แล้ว | context = `../../core`, ports 8545/8546/30303, ไม่อ้างอิง repo ภายนอก |
| `ops/deploy/docker-compose.vps.yml` | ✅ ใช้ image | ใช้ `ghcr.io/axionaxprotocol/axionax-core:latest` ไม่ build ในไฟล์ |
| `ops/deploy/mock-rpc/Dockerfile` | ✅ ใช้ได้ | build จาก context ของ mock-rpc |
| ~~Testnet_in_a_Box~~ | — | ลบออกจาก repo แล้ว — ใช้ `ops/deploy/Dockerfile` + `testnet/public/` แทน |
| `core/.github/workflows/*` | ℹ️ ไม่รันบน GitHub | เฉพาะ `.github/workflows` ที่ **root** ถึงจะรัน — ไฟล์ใน core/ เป็น legacy |
| Services ฝั่ง web/marketplace ใน dev | ℹ️ ต้องมี web-universe | context `./web-universe/...` ต้องมีโฟลเดอร์หรือ submodule นั้น |

---

## 1. CI (GitHub Actions)

### 1.1 ที่ root — ใช้ชุดนี้

- **ไฟล์:** `.github/workflows/ci.yml`
- **Trigger:** push/PR ไป `main`, `develop`
- **Jobs:**
  - **Rust:** `working-directory: core` → `cargo fmt`, `cargo build --workspace`, `cargo clippy`, `cargo test`, `cargo audit`
  - **Python:** ไม่มี working-directory → `cd core/deai`, `pip install -r requirements.txt`, `pytest`, `bandit`

Cache ใช้ `core/target` และ `core/Cargo.lock` — ถูกต้องเมื่อรันจาก repo root.

### 1.2 ใน `core/.github/workflows/` (ไม่ถูกรันโดย GitHub)

- `rust-ci.yml`, `build.yml`, `python-ci.yml` อยู่ใต้ `core/`  
- GitHub ใช้เฉพาะ `.github/workflows` ที่ **root**  
- ถ้าต้องการใช้ logic เดียวกัน ให้ย้าย/รวมเข้า root หรือเรียกจาก workflow ที่ root

หมายเหตุใน `core/.github/workflows/build.yml`:

- อัปโหลด artifact เป็น `target/release/axionaxd` — ใน repo นี้ binary ชื่อ `axionax-node` (จาก crate `node`)
- Docker build ใช้ `context: .` (repo root) ในขณะที่ `ops/deploy/Dockerfile` ออกแบบให้ context = `core/`

---

## 2. Docker

### 2.1 Build context ที่ถูกต้อง

- **`ops/deploy/Dockerfile`** และ **`ops/deploy/Dockerfile.faucet`** ออกแบบให้ **context = โฟลเดอร์ `core/`** (ที่เดียวกับ `core/Cargo.toml`, `core/core/`, `core/deai/`, `core/bridge/`).
- จาก **repo root**:  
  `docker build -f ops/deploy/Dockerfile ./core`
- จาก **ops/deploy**:  
  `docker build -f Dockerfile ../../core`

### 2.2 สิ่งที่แก้ใน `docker-compose.dev.yml`

- **dockerfile:** จาก `../ops/deploy/Dockerfile` เป็น `ops/deploy/Dockerfile` (อ้างอิงจาก repo root)
- **volume:** ลบ `./core/src:/app/src:ro` เพราะใน image ไม่มี `/app/src` แบบที่ map
- **faucet:** dockerfile เป็น `ops/deploy/Dockerfile.faucet`

### 2.3 สิ่งที่แก้ใน `ops/deploy/docker-compose.yaml`

- **node build:** จาก `context: ../axionax-core` เป็น `context: ../../core` (ชี้ไปที่ `core/` ใน repo นี้)
- **dockerfile:** ใช้ `Dockerfile` (ไฟล์ใน `ops/deploy/`)
- **ports:** ใช้ 8545 (RPC), 8546 (WS), 30303 (P2P) ให้ตรงกับ node จริง
- **explorer:** comment ไว้ ใช้ image จาก GHCR หรือ build จาก repo axionax-web-universe แยก

### 2.4 ไฟล์อื่น

- **ops/deploy/docker-compose.vps.yml:** ใช้ image `ghcr.io/axionaxprotocol/axionax-core:latest` ไม่ build ในไฟล์ — ใช้ได้
- **ops/deploy/mock-rpc/Dockerfile:** build จาก context ของ mock-rpc — ใช้ได้
- **Public testnet:** `ops/deploy/environments/testnet/public/docker-compose.yaml` + `ops/deploy/Dockerfile` (context `core/`)

### 2.5 Services ที่ต้องมีโฟลเดอร์นอก core

ใน `docker-compose.dev.yml`:

- **web:** `context: ./web-universe/apps/web`
- **marketplace:** `context: ./web-universe/apps/marketplace`

ถ้าไม่มีโฟลเดอร์ `web-universe` (หรือ submodule) การ build จะล้มเหลว — เป็นไปตาม design ว่าใช้เมื่อมี web-universe ใน monorepo หรือลิงก์ไว้แล้ว

---

## 3. สรุปคำสั่งที่ใช้บ่อย

```bash
# จาก repo root
docker compose -f docker-compose.dev.yml up -d axionax-node
docker compose -f docker-compose.dev.yml build axionax-node faucet

# จาก ops/deploy (context ../../core)
docker compose -f docker-compose.yaml build node
docker compose -f docker-compose.yaml up -d node

# Build image สำหรับ push (จาก root)
docker build -f ops/deploy/Dockerfile -t ghcr.io/axionaxprotocol/axionax-core:latest ./core
```

---

*สร้างจากผลการตรวจ Docker และ CI ใน axionax-core-universe*
