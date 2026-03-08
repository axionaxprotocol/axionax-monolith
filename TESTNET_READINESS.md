# Testnet Readiness

**Main documentation is in [README.md](README.md)** — see "Current Network (Testnet)".

- **Genesis:** ครบ (chain_id 86137, Rust + Python genesis, validators, allocations). Node รันครั้งแรกจะ seed balance จาก genesis อัตโนมัติ.
- **Balance & Faucet:** `eth_getBalance` / `eth_getTransactionCount` ทำงานกับ state จริง; `send_raw_transaction` apply tx ทันที → หน้าเว็บ UI พร้อมแสดง balance และรับ airdrop จาก faucet ได้. รายละเอียด: [docs/WALLET_AND_KEYS_READINESS.md](docs/WALLET_AND_KEYS_READINESS.md) § Balance & Faucet.

## Launch & Operations

| Doc | คำอธิบาย |
|-----|----------|
| [docs/GENESIS_PUBLIC_TESTNET_PLAN.md](docs/GENESIS_PUBLIC_TESTNET_PLAN.md) | แผน launch testnet + จัดสรร VPS 3 ตัว |
| [docs/ADD_NETWORK_AND_TOKEN.md](docs/ADD_NETWORK_AND_TOKEN.md) | เพิ่มเครือข่าย Axionax และเหรียญ AXX ใน MetaMask / รับจาก Faucet |
| [docs/CONNECTIVITY_OVERVIEW.md](docs/CONNECTIVITY_OVERVIEW.md) | การเชื่อมต่อ Local node, Validator, Frontend |
| [docs/GITHUB_READINESS.md](docs/GITHUB_READINESS.md) | ความพร้อม repository บน GitHub |
| [ops/deploy/scripts/verify-launch-ready.sh](ops/deploy/scripts/verify-launch-ready.sh) | สคริปต์ตรวจสอบก่อน launch (Genesis, DNS, RPC, Faucet, docs) |
