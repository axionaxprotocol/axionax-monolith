# Cargo Audit — สถานะ CVE และ Warnings

ผลรัน `cargo update && cargo audit` (มีนาคม 2026)

---

## ผลลัพธ์: 0 vulnerabilities ✅

ทุก CVE ที่แก้ได้ถูกแก้แล้ว:

| Advisory | Crate | การแก้ | สถานะ |
|----------|-------|--------|-------|
| RUSTSEC-2024-0437 | protobuf 2.28.0 | ลบ prometheus crate; metrics self-contained | ✅ หายจาก dependency tree |
| RUSTSEC-2025-0020 | pyo3 0.20.3 | อัปเกรดเป็น pyo3 0.24 | ✅ |
| RUSTSEC-2025-0009 | ring 0.16.20 | อัปเกรด libp2p 0.55 → rcgen 0.13 → ring 0.17 | ✅ หายจาก dependency tree |
| RUSTSEC-2026-0012 | keccak 0.1.5 | cargo update → keccak 0.1.6 | ✅ |

---

## Warnings ที่เหลือ (5 รายการ — ทั้งหมดเป็น transitive deps)

| Crate | Advisory | ต้นทาง | แนวทาง |
|-------|----------|--------|--------|
| **bincode 2.0.1** | RUSTSEC-2025-0141 (unmaintained) | `blockchain` → `storage.rs` | พิจารณาย้ายไป `bitcode` หรือ `postcard` |
| **fxhash 0.2.1** | RUSTSEC-2025-0057 (unmaintained) | `sled` → `blockchain` | จะหายเมื่อย้ายจาก sled ไป `redb` |
| **instant 0.1.13** | RUSTSEC-2024-0384 (unmaintained) | `sled` → `parking_lot` | เหมือนข้างบน (ย้าย sled) |
| **paste 1.0.15** | RUSTSEC-2024-0436 (unmaintained) | `libp2p` → `if-watch` → `netlink` | รอ libp2p อัปเดต |
| **lru 0.12.5** | RUSTSEC-2026-0002 (unsound) | `libp2p-swarm` | รอ libp2p 0.56+ |

---

## สรุปการเปลี่ยนแปลงที่ทำ

| รายการ | จาก | เป็น |
|--------|-----|------|
| rust-version (workspace) | 1.70 | **1.83** |
| Dockerfile Rust image | 1.75 | **1.83** |
| libp2p | 0.54 | **0.55** |
| bincode | 1.3 | **2.0** (serde) |
| reqwest (cli, faucet) | 0.11 | **0.12** |
| prometheus | 0.13 | **ลบ** (self-contained metrics) |
| pyo3 (bridge) | 0.20 | **0.24** |
| dotenv (faucet) | 0.15 | **dotenvy 0.15** |
| keccak (transitive) | 0.1.5 | **0.1.6** |

---

## แผนระยะถัดไป (ลด warnings)

1. **ย้ายจาก sled ไป redb** — แก้ fxhash + instant warnings (sled เอง unmaintained)
2. **ย้ายจาก bincode ไป bitcode/postcard** — แก้ bincode warning
3. **รอ libp2p 0.56+** — แก้ paste + lru warnings

---

## วิธีรัน audit

```powershell
# จาก core/
cargo update && cargo audit
```

```bash
# Bandit (จาก repo root)
bandit -r core/deai -ll --skip B101
```
