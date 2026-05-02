# Axionax Protocol — Security Remediation Plan

**Date:** 2026-03-05
**Based on:** SECURITY_AUDIT_REPORT.md (97 findings)
**Classification:** CONFIDENTIAL

**Remediation tracking:** [reports/SECURITY_AUDIT_REMEDIATION_STATUS.md](reports/SECURITY_AUDIT_REMEDIATION_STATUS.md) — per-finding status vs current codebase (update when closing items).

---

## Overview

แผนนี้แบ่งงานเป็น **4 เฟส** ตามระดับความเร่งด่วน โดยแต่ละ task ระบุไฟล์ที่ต้องแก้ไข, โค้ดที่ต้องเปลี่ยน, และ effort estimate

| Phase | Scope | Timeline | Findings |
|-------|-------|----------|----------|
| **P0** | Critical — ต้องทำก่อน deploy | **สัปดาห์ที่ 1** | 11 Critical |
| **P1** | High Priority — ต้องทำภายใน sprint แรก | **สัปดาห์ที่ 2–3** | 22 High |
| **P2** | Medium — ต้องทำภายใน 1 เดือน | **สัปดาห์ที่ 4–6** | 30 Medium |
| **P3** | Low/Info — Ongoing improvements | **สัปดาห์ที่ 7+** | 34 Low+Info |

---

## Phase 0: CRITICAL — ก่อน Deploy (สัปดาห์ที่ 1)

### P0-T1: สร้าง Transaction Signing & Verification Module
**Findings:** SC-1, SH-1, SC-2, SC-3, SC-4
**Effort:** 3–4 วัน
**Dependencies:** ไม่มี

ปัญหาหลัก: RPC endpoints ทั้งหมดยอมรับ `address` เป็น plain text โดยไม่มีการ verify signature ทำให้ใครก็ได้ปลอมตัวเป็นใครก็ได้

#### ไฟล์ที่ต้องสร้างใหม่:
- `core/core/rpc/src/auth.rs` — Signed Transaction Authentication Module

```rust
// core/core/rpc/src/auth.rs

use crypto::signature;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SignedRequest {
    pub message: Vec<u8>,
    pub signature: Vec<u8>,
    pub public_key: Vec<u8>,
}

impl SignedRequest {
    pub fn verify_and_recover_address(&self) -> Result<String, AuthError> {
        if !signature::verify(
            &signature::public_key_from_bytes(&self.public_key)
                .ok_or(AuthError::InvalidPublicKey)?,
            &self.message,
            &self.signature,
        ) {
            return Err(AuthError::InvalidSignature);
        }
        let vk = signature::public_key_from_bytes(&self.public_key)
            .ok_or(AuthError::InvalidPublicKey)?;
        Ok(signature::address_from_public_key(&vk))
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Invalid signature")]
    InvalidSignature,
    #[error("Invalid public key")]
    InvalidPublicKey,
    #[error("Address mismatch: expected {expected}, got {actual}")]
    AddressMismatch { expected: String, actual: String },
}
```

#### ไฟล์ที่ต้องแก้ไข:

**1. `core/core/rpc/src/staking_rpc.rs`** — เปลี่ยน trait ให้รับ signed transaction

```rust
// BEFORE (ทุก write method):
async fn stake(&self, address: String, amount: String) -> RpcResult<bool>;
async fn unstake(&self, address: String, amount: String) -> RpcResult<bool>;
async fn delegate(&self, delegator: String, validator: String, amount: String) -> RpcResult<bool>;
async fn claim_rewards(&self, address: String) -> RpcResult<String>;

// AFTER — ต้องส่ง signed_tx ที่มี signature + public_key:
async fn stake(&self, signed_tx: String) -> RpcResult<bool>;
//   signed_tx = hex(json({ message: {action: "stake", address, amount}, signature, public_key }))
//   Server จะ verify signature แล้ว derive address จาก public_key
//   ถ้า derived address ≠ claimed address → reject
```

แต่ละ implementation method ต้องเพิ่ม:
```rust
async fn stake(&self, signed_tx: String) -> RpcResult<bool> {
    let req: SignedRequest = decode_signed_request(&signed_tx)
        .map_err(|e| StakingRpcError::InvalidParams(e.to_string()))?;
    let verified_address = req.verify_and_recover_address()
        .map_err(|e| StakingRpcError::InvalidParams(e.to_string()))?;
    let params: StakeParams = serde_json::from_slice(&req.message)
        .map_err(|e| StakingRpcError::InvalidParams(e.to_string()))?;
    if verified_address != params.address {
        return Err(StakingRpcError::InvalidParams("Address mismatch".into()).into());
    }
    // ... proceed with verified address
}
```

**2. `core/core/rpc/src/governance_rpc.rs`** — เดียวกัน + เพิ่มดึง stake จาก staking module

```rust
// BEFORE:
async fn create_proposal(&self, proposer: String, proposer_stake: String, ...) -> RpcResult<u64>;
async fn vote(&self, voter: String, proposal_id: u64, vote: String, vote_weight: String) -> RpcResult<bool>;
async fn finalize_proposal(&self, proposal_id: u64, total_staked: String) -> RpcResult<String>;

// AFTER:
// 1. create_proposal: ลบ proposer_stake ออก → ดึงจาก staking module
// 2. vote: ลบ vote_weight ออก → ดึงจาก staking module
// 3. finalize_proposal: ลบ total_staked ออก → ดึงจาก staking module
```

Governance RPC server ต้องถือ `Arc<RwLock<Staking>>` ด้วย:
```rust
pub struct GovernanceRpcServerImpl {
    governance: Arc<RwLock<Governance>>,
    staking: Arc<RwLock<Staking>>,     // เพิ่มใหม่
    config: GovernanceConfig,
}

async fn vote(&self, signed_tx: String) -> RpcResult<bool> {
    let req = decode_and_verify(&signed_tx)?;
    let voter = req.verified_address;
    // ดึง actual stake weight
    let staking = self.staking.read().await;
    let validator = staking.get_validator(&voter).await
        .ok_or(GovernanceRpcError::InvalidParams("Not a staker".into()))?;
    let actual_weight = validator.voting_power();
    // ใช้ actual_weight แทน caller-supplied weight
}

async fn finalize_proposal(&self, proposal_id: u64) -> RpcResult<String> {
    // ดึง total_staked จาก staking module
    let staking = self.staking.read().await;
    let total_staked = staking.get_total_staked().await;
    // ใช้ค่าจริง
}
```

**3. `core/core/rpc/src/lib.rs`** — เพิ่ม signature verification ใน `send_raw_transaction`

```rust
// BEFORE:
async fn send_raw_transaction(&self, tx_hex: String) -> RpcResult<String> {
    // ... deserialize → add to mempool (no sig check)
}

// AFTER:
async fn send_raw_transaction(&self, tx_hex: String) -> RpcResult<String> {
    let bytes = hex::decode(...)?;
    let tx: Transaction = serde_json::from_slice(&bytes)?;
    
    // ✅ Verify signature
    if tx.signature.is_empty() || tx.signer_public_key.is_empty() {
        return Err(RpcError::InvalidParams("Missing signature".into()).into());
    }
    let pubkey = signature::public_key_from_bytes(&tx.signer_public_key)
        .ok_or(RpcError::InvalidParams("Invalid public key".into()))?;
    let msg = tx.signing_message(); // hash of tx fields minus signature
    if !signature::verify(&pubkey, &msg, &tx.signature) {
        return Err(RpcError::InvalidParams("Invalid signature".into()).into());
    }
    // Verify from == derived address
    let derived = signature::address_from_public_key(&pubkey);
    if derived != tx.from {
        return Err(RpcError::InvalidParams("Signer mismatch".into()).into());
    }
    // ... proceed
}
```

---

### P0-T2: แก้ Network Identity — ใช้ Keypair จริงของ Node
**Findings:** RC-3
**Effort:** 0.5 วัน
**Dependencies:** ไม่มี

#### ไฟล์ที่ต้องแก้ไข:

**1. `core/core/network/src/behaviour.rs`** — รับ keypair จาก parameter

```rust
// BEFORE (line 40):
pub fn new(peer_id: PeerId, config: &NetworkConfig) -> Result<Self, ...> {

// AFTER:
pub fn new(keypair: &libp2p::identity::Keypair, config: &NetworkConfig) -> Result<Self, ...> {
    let peer_id = PeerId::from(keypair.public());
    // ...
    
    // BEFORE (lines 55-58):
    let gossipsub = gossipsub::Behaviour::new(
        MessageAuthenticity::Signed(libp2p::identity::Keypair::generate_ed25519()),  // ❌ random
        gossipsub_config,
    )?;
    
    // AFTER:
    let gossipsub = gossipsub::Behaviour::new(
        MessageAuthenticity::Signed(keypair.clone()),  // ✅ node's actual keypair
        gossipsub_config,
    )?;
    
    // BEFORE (lines 72-78):
    let identify = identify::Behaviour::new(
        identify::Config::new(
            format!("/axionax/{}", config.protocol_version),
            libp2p::identity::Keypair::generate_ed25519().public(),  // ❌ random
        )
    );
    
    // AFTER:
    let identify = identify::Behaviour::new(
        identify::Config::new(
            format!("/axionax/{}", config.protocol_version),
            keypair.public(),  // ✅ node's actual public key
        )
    );
}
```

**2. `core/core/network/src/manager.rs`** — ส่ง keypair ไป behaviour

```rust
// BEFORE (line 60):
let behaviour = AxionaxBehaviour::new(local_peer_id, &config)?;

// AFTER:
let behaviour = AxionaxBehaviour::new(&keypair, &config)?;
```

---

### P0-T3: ลบ Legacy VRF ที่เสีย
**Findings:** RC-1, RC-2
**Effort:** 0.5 วัน
**Dependencies:** ไม่มี

#### ไฟล์ที่ต้องแก้ไข:

**`core/core/crypto/src/lib.rs`** — ลบ `VRF` struct ทั้งหมด หรือกั้นด้วย `#[cfg(test)]`

```rust
// BEFORE (lines 27-78):
#[deprecated(note = "Use ECVRF from vrf module instead")]
pub struct VRF { ... }
impl VRF { prove(), verify() }

// AFTER — ลบทิ้งทั้ง struct:
// [DELETED] - Legacy VRF removed (cryptographically broken)
// All production code MUST use ECVRF from vrf.rs module
```

ตรวจสอบว่าไม่มีโค้ดอื่นใช้ `VRF` (deprecated) อยู่:
```bash
rg "crypto::VRF\b" --type rust
rg "use.*VRF[^a-z]" --type rust  # ไม่รวม ECVRF
```

---

### P0-T4: ลบ Hardcoded Credentials ทั้งหมด
**Findings:** DC-1, DC-2, DC-3, DH-1, DH-2, DH-3
**Effort:** 1 วัน
**Dependencies:** ไม่มี

#### ไฟล์ที่ต้องแก้ไข:

**1. `ops/deploy/environments/testnet/.../deployer/deploy_token.js` (line 14)**
```javascript
// BEFORE:
const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.FAUCET_PRIVATE_KEY
         || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// AFTER:
const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.FAUCET_PRIVATE_KEY;
if (!PK) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY or FAUCET_PRIVATE_KEY must be set");
    process.exit(1);
}
```

**2. `ops/deploy/setup_validator.sh` (line 44)**
```bash
# BEFORE:
echo "$AXIONAX_USER:axionax2025" | chpasswd

# AFTER:
GENERATED_PASS=$(openssl rand -base64 24)
echo "$AXIONAX_USER:$GENERATED_PASS" | chpasswd
echo "⚠️  Generated password for $AXIONAX_USER: $GENERATED_PASS"
echo "   Change this immediately or switch to SSH key-only auth"
passwd -e "$AXIONAX_USER"  # force password change on first login
```

**3. `ops/deploy/environments/testnet/.../docker-compose.yml` (lines 64, 86, 100)**
```yaml
# BEFORE:
    environment:
      POSTGRES_USER: blockscout
      POSTGRES_PASSWORD: blockscout
      # ...
      SECRET_KEY_BASE: pd1+T03FiW54uPGlkL+...

# AFTER:
    environment:
      POSTGRES_USER: ${BLOCKSCOUT_DB_USER:-blockscout}
      POSTGRES_PASSWORD: ${BLOCKSCOUT_DB_PASSWORD:?BLOCKSCOUT_DB_PASSWORD must be set}
      # ...
      SECRET_KEY_BASE: ${SECRET_KEY_BASE:?SECRET_KEY_BASE must be set - generate with: openssl rand -base64 64}
    # ...
      DATABASE_URL: postgresql://${BLOCKSCOUT_DB_USER:-blockscout}:${BLOCKSCOUT_DB_PASSWORD}@postgres:5432/blockscout
```

**4. `docker-compose.dev.yml` (lines 75-77, 163, 203)**
```yaml
# BEFORE:
    POSTGRES_PASSWORD: axionax_dev_2026
    # ...
    FAUCET_PRIVATE_KEY: ${FAUCET_PRIVATE_KEY:-0x00...01}
    # ...
    GF_SECURITY_ADMIN_PASSWORD: axionax

# AFTER:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    # ...
    FAUCET_PRIVATE_KEY: ${FAUCET_PRIVATE_KEY:?Set FAUCET_PRIVATE_KEY in .env}
    # ...
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:?Set GRAFANA_PASSWORD in .env}
```

สร้าง `.env.example`:
```bash
# .env.example — Copy to .env and fill in real values
POSTGRES_PASSWORD=
FAUCET_PRIVATE_KEY=
GRAFANA_PASSWORD=
BLOCKSCOUT_DB_PASSWORD=
SECRET_KEY_BASE=
```

เพิ่มใน `.gitignore`:
```
.env
.env.local
.env.production
```

**5. `ops/deploy/environments/testnet/.../. env.example` (line 11)**
```bash
# BEFORE:
BASIC_AUTH=admin:password

# AFTER:
BASIC_AUTH=CHANGE_ME_user:CHANGE_ME_pass
```

**6. ลบ `ops/deploy/VPS_CONNECTION.txt`** — มี SSH root access
```bash
git rm ops/deploy/VPS_CONNECTION.txt
echo "ops/deploy/VPS_CONNECTION.txt" >> .gitignore
```

---

### P0-T5: บังคับ TLS สำหรับ RPC Communication
**Findings:** PC-2
**Effort:** 0.5 วัน
**Dependencies:** ไม่มี

#### ไฟล์ที่ต้องแก้ไข:

**1. `core/deai/rpc_client.py` (line 10)**
```python
# BEFORE:
def __init__(self, rpc_url: str = "http://217.216.109.5:8545"):

# AFTER:
def __init__(self, rpc_url: str = "https://rpc.axionax.org"):
    if rpc_url.startswith("http://") and "localhost" not in rpc_url and "127.0.0.1" not in rpc_url:
        import warnings
        warnings.warn(
            f"RPC URL uses unencrypted HTTP: {rpc_url}. "
            "Use HTTPS for non-local connections.",
            SecurityWarning
        )
```

**2. `core/deai/worker_config.toml` (lines 17-19)**
```toml
# BEFORE:
bootnodes = [
    "http://217.216.109.5:8545",
    "http://46.250.244.4:8545"
]

# AFTER:
bootnodes = [
    "https://rpc.axionax.org",
    "https://rpc-au.axionax.org"
]
```

**3. `configs/monolith_sentinel.toml`, `configs/monolith_worker.toml`, `configs/monolith_scout_single.toml`**
```toml
# BEFORE:
bootnodes = ["http://217.216.109.5:8545", "http://46.250.244.4:8545"]

# AFTER:
bootnodes = ["https://rpc.axionax.org", "https://rpc-au.axionax.org"]
```

---

## Phase 1: HIGH PRIORITY (สัปดาห์ที่ 2–3)

### P1-T1: Persist Node Identity Keypair
**Finding:** RH-3
**Effort:** 1 วัน

**ไฟล์:** `core/core/network/src/manager.rs`

```rust
// BEFORE (lines 48-50):
let keypair = Keypair::generate_ed25519();

// AFTER:
fn load_or_generate_keypair(key_path: &Path) -> Result<Keypair> {
    if key_path.exists() {
        let bytes = std::fs::read(key_path)?;
        // Decrypt if needed
        Ok(Keypair::from_protobuf_encoding(&bytes)?)
    } else {
        let kp = Keypair::generate_ed25519();
        std::fs::write(key_path, kp.to_protobuf_encoding()?)?;
        // Set permissions to 0o600
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(key_path, std::fs::Permissions::from_mode(0o600))?;
        }
        Ok(kp)
    }
}
```

เพิ่ม `key_file: PathBuf` ใน `NetworkConfig`

---

### P1-T2: บังคับ Parent Hash Validation ใน add_block
**Finding:** RH-5
**Effort:** 0.5 วัน

**ไฟล์:** `core/core/blockchain/src/lib.rs`

```rust
// BEFORE (lines 252-267):
pub async fn add_block(&self, block: Block) -> Result<()> {
    let mut blocks = self.blocks.write().await;
    let mut latest = self.latest_block.write().await;
    let expected = *latest + 1;
    if block.number != expected {
        return Err(BlockchainError::InvalidBlockNumber { expected, actual: block.number });
    }
    blocks.insert(block.number, block);
    *latest += 1;
    Ok(())
}

// AFTER:
pub async fn add_block(&self, block: Block) -> Result<()> {
    let mut blocks = self.blocks.write().await;
    let mut latest = self.latest_block.write().await;
    let expected = *latest + 1;
    if block.number != expected {
        return Err(BlockchainError::InvalidBlockNumber { expected, actual: block.number });
    }
    // Verify parent hash linkage
    if block.number > 0 {
        if let Some(prev_block) = blocks.get(&(*latest)) {
            if block.parent_hash != prev_block.hash {
                return Err(BlockchainError::InvalidParentHash { block_number: block.number });
            }
        }
    }
    blocks.insert(block.number, block);
    *latest += 1;
    Ok(())
}
```

ทำเหมือนกันใน `PersistentBlockchain::add_block()`

---

### P1-T3: ป้องกัน OOM จาก Proof Deserialization
**Finding:** RH-2
**Effort:** 0.5 วัน

**ไฟล์:** `core/core/consensus/src/merkle.rs`

```rust
// BEFORE (lines 190-193):
let num_proofs = u32::from_le_bytes(...) as usize;
let mut proofs = Vec::with_capacity(num_proofs);

// AFTER:
const MAX_PROOFS: usize = 10_000;
const MAX_SIBLINGS: usize = 64;

let num_proofs = u32::from_le_bytes(...) as usize;
if num_proofs > MAX_PROOFS {
    return None;
}
let mut proofs = Vec::with_capacity(num_proofs);

// ... similarly for num_siblings:
let num_siblings = u32::from_le_bytes(...) as usize;
if num_siblings > MAX_SIBLINGS {
    return None;
}
```

---

### P1-T4: Wire Middleware เข้า RPC Server
**Finding:** SH-3
**Effort:** 1 วัน

**ไฟล์:** `core/core/rpc/src/lib.rs`

```rust
// BEFORE (line 288):
let server = Server::builder().build(addr).await?;

// AFTER:
use tower_http::cors::{CorsLayer, AllowOrigin};
use jsonrpsee::server::middleware::rpc::RpcServiceBuilder;

let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::list([
        "https://explorer.axionax.org".parse().unwrap(),
        "https://app.axionax.org".parse().unwrap(),
    ]))
    .allow_methods([Method::POST])
    .allow_headers([header::CONTENT_TYPE]);

let rpc_middleware = RpcServiceBuilder::new()
    .layer_fn(|service| RateLimitMiddleware::new(service, rate_limiter.clone()));

let server = Server::builder()
    .set_http_middleware(tower::ServiceBuilder::new().layer(cors))
    .set_rpc_middleware(rpc_middleware)
    .max_request_body_size(1_048_576)  // 1 MB
    .max_response_body_size(10_485_760) // 10 MB
    .max_connections(1000)
    .build(addr)
    .await?;
```

---

### P1-T5: แก้ Unstake Logic
**Finding:** SH-4
**Effort:** 0.5 วัน

**ไฟล์:** `core/core/staking/src/lib.rs`

```rust
// BEFORE (lines 210-239) — unstake ไม่ลด stake:
pub async fn unstake(&self, address: String, amount: u128) -> Result<()> {
    // ... validates amount <= stake ...
    validator.unlock_block = current_block + self.config.unstaking_lock_blocks;
    validator.is_active = false;
    // ❌ ไม่ได้ลด validator.stake
}

// AFTER:
pub async fn unstake(&self, address: String, amount: u128) -> Result<()> {
    // ... validates amount <= stake ...
    validator.stake = validator.stake.saturating_sub(amount);
    validator.pending_unstake = amount;
    validator.unlock_block = current_block + self.config.unstaking_lock_blocks;
    if validator.stake < self.config.min_validator_stake {
        validator.is_active = false;
    }
}
```

เพิ่ม `pending_unstake: u128` ใน `ValidatorInfo`

แก้ `withdraw()` ให้คืนเฉพาะ `pending_unstake`:
```rust
pub async fn withdraw(&self, address: String) -> Result<u128> {
    // ...
    let amount = validator.pending_unstake;
    validator.pending_unstake = 0;
    *total = total.saturating_sub(amount);
    Ok(amount)
}
```

---

### P1-T6: แก้ u128-to-u64 Truncation
**Finding:** SH-5, RM-9
**Effort:** 0.5 วัน

**ไฟล์:** `core/core/network/src/protocol.rs`
```rust
// BEFORE:
pub value: u64,

// AFTER:
pub value: u128,
```

**ไฟล์:** `core/core/node/src/lib.rs`
```rust
// BEFORE (line 386):
value: tx.value as u64,

// AFTER:
value: tx.value,
```

**ไฟล์:** `core/bridge/rust-python/src/lib.rs`
```rust
// BEFORE:
fn stake(&self) -> PyResult<u64> { Ok(self.stake as u64) }
fn value(&self) -> PyResult<u64> { Ok(self.value as u64) }

// AFTER — return as string for Python BigInt:
fn stake(&self) -> PyResult<String> { Ok(self.stake.to_string()) }
fn value(&self) -> PyResult<String> { Ok(self.value.to_string()) }
```

---

### P1-T7: Bind RPC to 127.0.0.1 by Default
**Finding:** SH-2
**Effort:** 0.25 วัน

**ไฟล์:** `core/core/node/src/lib.rs`
```rust
// BEFORE:
pub fn testnet() -> Self {
    Self { rpc_addr: "0.0.0.0:8545".parse().unwrap(), ... }
}
pub fn mainnet() -> Self {
    Self { rpc_addr: "0.0.0.0:8545".parse().unwrap(), ... }
}

// AFTER:
pub fn testnet() -> Self {
    Self { rpc_addr: "127.0.0.1:8545".parse().unwrap(), ... }
}
pub fn mainnet() -> Self {
    Self { rpc_addr: "127.0.0.1:8545".parse().unwrap(), ... }
}
```

เพิ่ม CLI flag `--rpc-addr` ให้ override ได้

---

### P1-T8: CORS Restrict + Remove --unsafe-rpc
**Findings:** DH-4, DH-5
**Effort:** 0.5 วัน

**ไฟล์:** `ops/deploy/configs/rpc-config.toml`
```toml
# BEFORE:
cors_origins = ["*"]

# AFTER:
cors_origins = ["https://explorer.axionax.org", "https://app.axionax.org", "https://faucet.axionax.org"]
```

**ไฟล์:** `ops/deploy/nginx/conf.d/rpc.conf`
```nginx
# BEFORE:
add_header Access-Control-Allow-Origin * always;

# AFTER:
set $cors_origin "";
if ($http_origin ~* "^https://(explorer|app|faucet)\.axionax\.org$") {
    set $cors_origin $http_origin;
}
add_header Access-Control-Allow-Origin $cors_origin always;
```

**ไฟล์:** `ops/deploy/environments/testnet/public/docker-compose.yaml`
```yaml
# ลบ --unsafe-rpc ออก (line 48)
```

---

### P1-T9: เพิ่ม Redis Authentication
**Finding:** DH-6
**Effort:** 0.25 วัน

**ไฟล์:** `docker-compose.dev.yml`
```yaml
# BEFORE:
  redis:
    image: redis:7-alpine

# AFTER:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:?Set REDIS_PASSWORD in .env}
```

---

### P1-T10: ลบ Hardcoded IPs → ใช้ DNS
**Finding:** DH-8, SL-1
**Effort:** 0.5 วัน

ไฟล์ที่ต้องแก้ (ทุกที่ที่มี `217.216.109.5`, `46.250.244.4`, `217.216.109.5`):
- `configs/monolith_sentinel.toml`
- `configs/monolith_worker.toml`
- `configs/monolith_scout_single.toml`
- `core/core/genesis/src/lib.rs`
- `core/deai/worker_config.toml`

แทนที่ด้วย DNS:
```
http://217.216.109.5:8545  → https://rpc-eu.axionax.org
http://46.250.244.4:8545   → https://rpc-au.axionax.org
```

---

### P1-T11: แก้ Faucet Vulnerabilities
**Findings:** PH-1, PH-2
**Effort:** 0.5 วัน

**ไฟล์:** `faucet/index.js` (line 86)
```javascript
// BEFORE:
const rawAmt = req.query.amount ?? FAUCET_AMOUNT_ERC20;

// AFTER:
const rawAmt = FAUCET_AMOUNT_ERC20; // Always use server-configured amount
```

**ไฟล์:** `faucet/server.js` — เพิ่ม rate limiting
```javascript
// เพิ่มที่ต้นไฟล์:
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
app.use('/request', limiter);
```

---

### P1-T12: Refactor ContractManager — ไม่ส่ง Private Key เป็น String
**Finding:** PC-1
**Effort:** 0.5 วัน

**ไฟล์:** `core/deai/worker_node.py` (line 364-368)
```python
# BEFORE:
self.contract = ContractManager(
    rpc_url=self.network.active_node_url,
    private_key=self.wallet.account.key.hex(),
    contract_address=contract_address,
)

# AFTER:
self.contract = ContractManager(
    rpc_url=self.network.active_node_url,
    account=self.wallet.account,
    contract_address=contract_address,
)
```

---

## Phase 2: MEDIUM PRIORITY (สัปดาห์ที่ 4–6)

### P2-T1: ลบ `.unwrap()` / `.expect()` ทั้งหมดใน Production Code
**Findings:** RM-1, SM-1, SM-2, RH-4
**Effort:** 2 วัน

ไฟล์ทั้งหมดที่ต้องแก้:

| File | Line(s) | Fix |
|------|---------|-----|
| `network/src/reputation.rs` | 292-296 | `.unwrap()` → `.unwrap_or_default()` |
| `rpc/src/health.rs` | 87 | `.unwrap()` → `.unwrap_or_default()` |
| `events/src/lib.rs` | 178, 209 | `.unwrap()` → `.unwrap_or_default()` |
| `da/src/lib.rs` | 443-445 | `.unwrap()` → `.unwrap_or_default()` |
| `genesis/src/lib.rs` | 391 | `.unwrap()` → `?` (return Result) |
| `blockchain/src/lib.rs` | 297-306 | `.expect()` → `?` (return Result) |
| `rpc/src/lib.rs` | 315-317 | `.unwrap_or(0)` → return error in health |
| `blockchain/src/storage.rs` | 131 | `.unwrap_or([0;8])` → return error |

---

### P2-T2: Checked Arithmetic ทั้ง Codebase
**Findings:** RM-2, RM-3, RM-5, RM-10
**Effort:** 1.5 วัน

| File | Line | Fix |
|------|------|-----|
| `mempool.rs` | 182 | `+` → `.checked_add()` |
| `consensus/lib.rs` | 136 | `.powi(as i32)` → `.powf(as f64)` |
| `validation.rs` | 263 | เพิ่ม total cost check: `value + gas_price * gas_limit` |
| `reputation.rs` | 231-235 | `.saturating_mul()` + cap hours |

---

### P2-T3: แก้ Input Validation ทั้งหมด
**Findings:** RM-6, RM-7, SM-5, SM-7, SL-6, SL-7
**Effort:** 2 วัน

| Fix | File | Detail |
|-----|------|--------|
| Block size — ใช้ actual size | `validation.rs:174-187` | Calculate real tx size |
| Tx data size limit | `validation.rs` | Add `max_tx_data_size: 131072` (128KB) |
| Nonce validation | `rpc/src/lib.rs:253` | Check nonce against account state |
| Subscription limit | `events/src/lib.rs:231` | Max 100 subs per IP |
| Proposal title/desc length | `governance/src/lib.rs:227` | Max 256 / 10000 chars |
| Gas price/limit validation | `rpc/src/lib.rs:253` | Min gas price, max gas limit |

---

### P2-T4: แก้ Concurrency Issues
**Findings:** SM-3, SM-4, RM-8
**Effort:** 1 วัน

| Fix | File | Detail |
|-----|------|--------|
| `Vec::remove(0)` → `VecDeque` | `events/src/lib.rs:189` | Use `VecDeque::pop_front()` |
| `block_on` → `register_async_method` | `rpc/src/lib.rs:431` | Refactor to async |
| Unbounded channel → bounded | `network/manager.rs:74` | `mpsc::channel(1000)` |

---

### P2-T5: แก้ Staking Logic
**Finding:** SM-6
**Effort:** 0.5 วัน

**ไฟล์:** `core/core/staking/src/lib.rs`
```rust
// BEFORE: slash based on voting_power() (stake + delegated)
let slash_amount = validator.voting_power()
    .saturating_mul(penalty_bps as u128)
    .saturating_div(10_000);

// AFTER: slash based on self-stake only
let slash_amount = validator.stake
    .saturating_mul(penalty_bps as u128)
    .saturating_div(10_000);
```

---

### P2-T6: Gossipsub Validation Mode → Strict by Default
**Finding:** RM-4
**Effort:** 0.25 วัน

**ไฟล์:** `core/core/network/src/config.rs`
```rust
// BEFORE:
validation_mode: ValidationMode::Permissive,

// AFTER:
validation_mode: ValidationMode::Strict,
```

---

### P2-T7: แก้ Docker Security
**Findings:** DM-1, DM-2, DM-3, DM-5
**Effort:** 1 วัน

| Fix | File | Detail |
|-----|------|--------|
| Add USER directive | Testnet Dockerfile | `RUN adduser --system axionax && USER axionax` |
| Fix nginx rate-limit zone | faucet.conf | Move `limit_req_zone` before `server` |
| Add `server_tokens off` | nginx.conf | Add in http block |
| Bind dev services to 127.0.0.1 | docker-compose.dev.yml | `"127.0.0.1:5432:5432"` etc. |

---

### P2-T8: แก้ Python Security Issues
**Findings:** PM-1, PM-2, PM-3, PM-4, PM-5
**Effort:** 1 วัน

| Fix | File | Detail |
|-----|------|--------|
| MockSandbox → refuse in prod | sandbox.py | `if os.environ.get("ENV") == "production": raise` |
| Mutable default args | rpc_client.py | `params: Optional[List] = None` |
| Private key method → private | wallet_manager.py | `_get_private_key()` |
| Atomic keystore creation | wallet_manager.py | Use `os.open()` with mode |
| Secure delete after migration | wallet_manager.py | Overwrite file before rewrite |

---

### P2-T9: แก้ Secret Key Exposure
**Finding:** SM-8
**Effort:** 0.25 วัน

**ไฟล์:** `core/core/vrf/src/lib.rs`
```rust
// BEFORE:
pub fn secret_key_bytes(&self) -> [u8; 32]

// AFTER:
pub(crate) fn secret_key_bytes(&self) -> [u8; 32]
```

---

## Phase 3: LOW & INFORMATIONAL (สัปดาห์ที่ 7+)

### P3-T1: Implement Real Health Checks
**Finding:** RL-4
**Effort:** 1 วัน

**ไฟล์:** `core/src/health.rs` — implement actual checks for DB, P2P, consensus

---

### P3-T2: Add Rate Limiting to Public Interfaces
**Finding:** RL-5
**Effort:** 1 วัน

Per-peer message rate limiting in network, per-account tx rate limiting in mempool.

---

### P3-T3: Fix Duplicate Transaction Check
**Finding:** RL-1
**Effort:** 0.25 วัน

Add `HashSet<[u8;32]>` deduplication in `validate_transactions()`.

---

### P3-T4: Fix Storage Corruption Handling
**Finding:** RL-2
**Effort:** 0.25 วัน

Return error instead of silent fallback to block 0.

---

### P3-T5: Fix Consensus Sample Deduplication
**Finding:** RH-7
**Effort:** 0.5 วัน

Use `HashSet` rejection sampling in `generate_samples()`.

---

### P3-T6: Validator Registration Authentication
**Finding:** RL-3
**Effort:** 0.5 วัน

Require signature proof of address ownership.

---

### P3-T7: Docker Improvements
**Findings:** DL-1 thru DL-7, DI-1 thru DI-6
**Effort:** 2 วัน

| Fix | Detail |
|-----|--------|
| Update base image | `bullseye-slim` → `bookworm-slim` |
| Replace `libssl-dev` | Use `libssl3` |
| Remove deprecated headers | `X-XSS-Protection` |
| Set dashboards non-editable | `editable: false` |
| Add resource limits | `mem_limit`, `cpus` |
| Add log rotation | `json-file` driver with `max-size` |
| Pin Docker images | Use SHA digests |
| Network segmentation | `frontend`, `backend`, `monitoring` |
| Add HEALTHCHECK | Testnet Dockerfile |
| Remove `version:` field | All compose files |
| Configure alerting | Prometheus alertmanager |

---

### P3-T8: SDK & UI Improvements
**Findings:** PL-1 thru PL-6
**Effort:** 1 วัน

| Fix | Detail |
|-----|--------|
| CSRF protection | Use POST for state changes |
| RPC request ID validation | Incrementing counter |
| Sanitize error messages | Don't expose internals |
| Address validation | `ethers.utils.isAddress()` |
| Use sessionStorage | Instead of localStorage for auth |
| Zero-address checks | Solidity `require(to != address(0))` |

---

### P3-T9: Python Dependency & Packaging
**Findings:** PI-1, PI-2, PI-3, PI-4
**Effort:** 0.5 วัน

| Fix | Detail |
|-----|--------|
| Pin dependencies | `requests>=2.31.0,<3.0` format |
| Add eth-account | Explicit in requirements.txt |
| Pin Docker image digest | `python:3.11-slim@sha256:...` |
| Fix sys.path | Use proper `pyproject.toml` packaging |

---

### P3-T10: Mock RPC Fixes
**Findings:** PH-3, PM-9, PM-10
**Effort:** 0.5 วัน

| Fix | Detail |
|-----|--------|
| web3_sha3 | Implement real keccak256 |
| Reduce logging | Don't log tx params |
| Bind to localhost | `127.0.0.1` default |

---

### P3-T11: VRF Seed & ASR Fixes
**Findings:** PM-7, SI-2
**Effort:** 0.5 วัน

| Fix | Detail |
|-----|--------|
| Use full VRF seed | `SeedSequence(vrf_seed)` instead of `[:4]` |
| ASR use real VRF module | Replace SHA3 hash with ECVRF |

---

## Summary — Effort Estimate

| Phase | Tasks | Estimated Days | Team Size |
|-------|-------|----------------|-----------|
| **P0** | 5 tasks | 5–6 days | 2 devs |
| **P1** | 12 tasks | 6–7 days | 2 devs |
| **P2** | 9 tasks | 9–10 days | 2 devs |
| **P3** | 11 tasks | 8–9 days | 1 dev |
| **Total** | **37 tasks** | **~28–32 days** | |

---

## Dependency Graph

```
P0-T1 (Auth Module) ──────────┐
                               ├──→ P1-T4 (Wire Middleware)
P0-T2 (Network Identity) ─────┤
                               ├──→ P1-T1 (Persist Keypair)
P0-T3 (Remove Legacy VRF) ────┤
                               ├──→ P3-T11 (ASR use ECVRF)
P0-T4 (Remove Hardcoded) ─────┤
                               ├──→ P1-T10 (DNS instead of IPs)
P0-T5 (TLS) ──────────────────┘
                               
P1-T5 (Unstake Fix) ──────────→ P2-T5 (Slash Fix)
P1-T2 (Parent Hash) ──────────→ P3-T3 (Dedup Tx)
P1-T4 (Middleware) ────────────→ P2-T3 (Input Validation)
```

---

## Testing Strategy

แต่ละ Phase ต้องมี:

1. **Unit Tests** — ทุก function ที่แก้ไขต้องมี test ครอบคลุม edge cases
2. **Integration Tests** — ทดสอบ flow ทั้งหมดตั้งแต่ RPC → Module → State
3. **Security Tests** — ทดสอบ attack vectors ที่ audit พบ:
   - Impersonation test (ส่ง request โดยไม่มี sig → ต้อง reject)
   - Overflow tests (ค่า u128::MAX, u64::MAX)
   - DoS tests (ส่ง payload ใหญ่, connection flood)
   - Replay tests (ส่ง tx ซ้ำ → ต้อง reject)
4. **Regression Tests** — ทดสอบว่า fix ไม่ทำให้ feature เดิมเสีย
