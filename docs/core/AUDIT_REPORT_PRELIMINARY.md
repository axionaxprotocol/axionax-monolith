# รายงาน Audit เบื้องต้น (Preliminary Security Audit)

**วันที่:** มีนาคม 2026  
**ขอบเขต:** Core (Rust), DeAI (Python), configs, scripts  
**วิธี:** Static analysis ในโค้ด (ไม่ได้รัน `cargo audit` / `bandit` ในเครื่อง — ให้รันเองตามด้านล่าง)

---

## 1. สรุปผล

| หมวด | สถานะ | หมายเหตุ |
|------|--------|----------|
| **Rust unsafe** | ✅ ผ่าน | ไม่พบ `unsafe { }` ใน core |
| **Secrets / credentials** | ✅ ผ่าน | ไม่พบ password/API key/private key แบบ hardcode; DeAI ใช้ `os.environ.get()` |
| **Python dangerous** | ✅ ผ่าน | ไม่พบ `eval`, `exec`, `subprocess` shell=True, `pickle.loads` จาก input |
| **unwrap/expect (Rust)** | 🟡 ควรปรับ | พบใน production path; ส่วนใหญ่ใน test ใช้ได้ |
| **Dependency (CVE)** | ⚠️ ต้องรัน | ต้องรัน `cargo audit` และ `bandit` เอง (ดูหัวข้อ 4) |

---

## 2. รายการที่ตรวจแล้ว

### 2.1 Rust (core/core, core/bridge, core/tools)

- **`unsafe`:** ค้นทั้ง repo → ไม่มี `unsafe { }`
- **unwrap / expect:**  
  - จำนวนมากอยู่ใน `#[cfg(test)]` หรือใน test modules → ยอมรับได้  
  - **Production path ที่พบ:**
    - `core/core/rpc/src/server.rs`: `"127.0.0.1:8545".parse().unwrap()` (default addr)
    - `core/core/rpc/src/http_health.rs`:  
      - Default config: `"0.0.0.0:8080".parse().unwrap()`  
      - `SystemTime::now().duration_since(UNIX_EPOCH).unwrap()` (เวลา system)  
      - `serde_json::to_string(...).unwrap()` ใน handler
    - `core/core/blockchain/src/lib.rs`:  
      - `parse_hex_hash(...).expect("genesis crate must produce valid ...")` ตอนโหลด genesis  
  - **คำแนะนำ:** ใน production ควรแทนที่ด้วย `?` หรือจัดการ error ชัดเจน โดยเฉพาะจุดที่รับ input จาก config/network

### 2.2 Python DeAI (core/deai)

- **eval / exec / subprocess (อันตราย):** ไม่พบ
- **Secrets:** ไม่พบ `password = "..."`, `api_key = "..."`, private key แบบ 64-char hex ในโค้ด
- **Config / secrets:** ใช้ `os.environ.get("AXIONAX_*", "WORKER_*")` อย่างสม่ำเสมอ
- **Sandbox (sandbox.py):** ใช้ Docker API (`docker.from_env()`), มี ResourceLimits, timeout — ไม่พบการรัน raw shell command

### 2.3 Config / Repo

- ไม่พบไฟล์ `.env` หรือ `*_key.json` ที่มี secret ถูก commit (ควรอยู่ใน `.gitignore` แล้ว)
- ค้นหา pattern  private key / password ใน `.rs`, `.py`, `.toml` → ไม่พบค่าที่น่าสงสัย

---

## 3. แนะนำการแก้ (เรียงตามความสำคัญ)

1. **Rust — ลด unwrap/expect ใน production**
   - `rpc/src/server.rs`, `rpc/src/http_health.rs`: แทน default addr parse ด้วย `.parse().unwrap_or_else(|_| ...)` หรืออ่านจาก config แล้วใช้ `?`
   - `blockchain/src/lib.rs`: genesis hash parse — เก็บ `expect` ไว้ได้ถ้า genesis มาจาก trusted source; ถ้ารับจากภายนอกควร return `Result` และจัดการ error
   - `http_health.rs`: `serde_json::to_string` ใน handler — ควรส่ง error กลับเป็น 500 แทน panic

2. **รันเครื่องมือ audit อัตโนมัติ**
   - รัน `scripts/security/run_audit_tools.sh` (หรือ `.ps1` บน Windows) เป็นประจำ หรือใส่ใน CI
   - แก้ CVE ที่ `cargo audit` รายงาน (อย่างน้อยระดับ critical/high)
   - แก้/ยอมรับการแจ้งเตือนจาก `bandit` ใน core/deai

3. **ก่อนเปิด testnet**
   - ทำ external audit ตาม [SECURITY_AUDIT_SCOPE.md](SECURITY_AUDIT_SCOPE.md)
   - แก้ข้อ finding จากรายงาน audit อย่างน้อยระดับ critical/high

---

## 4. ผลจาก cargo audit (มีนาคม 2026)

รัน `cargo audit` ใน `core/` แล้วพบ **3 vulnerabilities** และหลาย warnings — รายละเอียดและวิธีแก้อยู่ใน **[AUDIT_REMEDIATION.md](AUDIT_REMEDIATION.md)**  
- **pyo3 0.20** (buffer overflow): แก้แล้วโดยอัปเกรด bridge เป็น pyo3 **0.24**  
- **protobuf 2.28** (recursion crash): ใช้โดย prometheus ใน metrics — ต้องอัปเกรด/เปลี่ยน crate  
- **ring 0.16** (AES panic): transitive ผ่าน libp2p — ต้องอัปเกรด libp2p  

**Bandit:** รันจาก **repo root** ด้วย path `core/deai` (ถ้ารันจาก `core/` ใช้ path แค่ `deai`). บน Windows ใช้ `.\scripts\security\run_audit_tools.ps1` จาก repo root.

---

## 5. คำสั่งที่ต้องรันเอง (Audit เต็ม)

ในเครื่องที่ติดตั้ง Rust + Python แล้ว ให้รันจาก **root ของ repo**:

```bash
# 1. Cargo audit (Rust dependencies – CVE)
cd core
cargo install cargo-audit   # ครั้งแรกเท่านั้น
cargo audit

# 2. Bandit (Python DeAI – security lint)
pip install bandit
bandit -r core/deai -ll

# 3. Security script (รวมทั้งสอง + ตรวจคร่าวๆ secrets) — ต้องอยู่ที่ repo root
./scripts/security/run_audit_tools.sh       # Linux/macOS
.\scripts\security\run_audit_tools.ps1     # Windows (PowerShell)
```

ผลที่ได้จากคำสั่งข้างต้นให้เก็บเป็นหลักฐานและแก้ตามระดับความรุนแรง (critical → high → medium).

---

## 6. สรุปท้ายรายงาน

- **จุดแข็ง:** ไม่มี unsafe, ไม่มี dangerous Python patterns, ไม่มี hardcoded secrets, DeAI ใช้ env สำหรับความลับ และมี sandbox ผ่าน Docker
- **จุดที่ควรปรับ:** ลด unwrap/expect ใน production path ของ Rust และรัน `cargo audit` / `bandit` เป็นประจำ
- **ขั้นตอนถัดไป:** รันคำสั่งในหัวข้อ 4, แก้ CVE/findings, แล้วดำเนินการ external audit ตาม scope ที่กำหนด
