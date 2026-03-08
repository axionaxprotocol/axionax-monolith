# Axionax Bible

**เอกสารรวมหลักของ Axionax Protocol — จุดเดียวสำหรับ Vision, Protocol, Run, Deploy และ Launch**

เอกสารใน repo มีหลายไฟล์ ไฟล์นี้รวบรวมเป็น "คัมภีร์" เดียว: จัดเป็นหมวด (Books) และลิงก์ไปยังเอกสารจริง ไม่ต้องจำ path หลายที่

---

## สารบัญ (Table of Contents)

| Book | ชื่อ | เนื้อหาหลัก |
|------|------|----------------|
| I | [Vision & Principles](#book-i-vision--principles) | วิสัยทัศน์ หลักการ Self-Sufficiency และ Cyber Defense |
| II | [Protocol & Architecture](#book-ii-protocol--architecture) | สถาปัตยกรรม โหนด RPC เครือข่าย |
| III | [Run & Develop](#book-iii-run--develop) | รัน Worker/Node พัฒนา และ Quick Start |
| IV | [Ops & Deploy](#book-iv-ops--deploy) | VPS Validator Genesis Testnet Faucet |
| V | [Launch & Testnet](#book-v-launch--testnet) | ความพร้อม Launch MetaMask Faucet |
| VI | [Security & Audit](#book-vi-security--audit) | ความปลอดภัย รายงาน audit และ Runbook |
| VII | [Reference](#book-vii-reference) | API คู่มืออ้างอิง และเอกสารเสริม |

---

## Book I: Vision & Principles

**Axionax คืออะไร และยืนบนหลักการอะไร**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [MASTER_SUMMARY.md](../MASTER_SUMMARY.md) | สรุปโครงการฉบับเต็ม: Vision, Architecture, Hardware, Tokenomics, Roadmap |
| [SELF_SUFFICIENCY.md](SELF_SUFFICIENCY.md) | หลักการ Self-Sufficiency — โปรโตคอลทำงานได้ด้วยตัวเอง ไม่พึ่ง PyPI/npm/API ภายนอกตอนรัน |
| [CYBER_DEFENSE.md](CYBER_DEFENSE.md) | ป้องกันภัยคุกคามทางไซเบอร์ได้ด้วย DeAI (7 Sentinels) ไม่พึ่งศูนย์กลาง |

---

## Book II: Protocol & Architecture

**Layer 1 สถาปัตยกรรม โหนด และเครือข่าย**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [core/docs/ARCHITECTURE_OVERVIEW.md](../core/docs/ARCHITECTURE_OVERVIEW.md) | ภาพรวมระบบ สแต็ก และ component หลัก |
| [core/docs/NODE_SPECS.md](../core/docs/NODE_SPECS.md) | Spec เครื่อง (CPU, RAM, Storage) สำหรับ Full Node, Validator, RPC, Faucet, Explorer |
| [core/docs/NETWORK_NODES.md](../core/docs/NETWORK_NODES.md) | ประเภทโหนด (Validator, RPC, Bootnode, Explorer, Faucet) และบทบาท |
| [core/docs/RPC_API.md](../core/docs/RPC_API.md) | Ethereum-compatible RPC และ Staking API |
| [core/docs/PROJECT_ASCENSION.md](../core/docs/PROJECT_ASCENSION.md) | Monolith และ 9 Pillars |
| [core/docs/MONOLITH_ROADMAP.md](../core/docs/MONOLITH_ROADMAP.md) | แผนฮาร์ดแวร์ MK-I ถึง MK-IV |
| [core/docs/SENTINELS.md](../core/docs/SENTINELS.md) | 7 Sentinels (AION-VX, SERAPH-VX, …) |

---

## Book III: Run & Develop

**รันโหนด / Worker และพัฒนา**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [README.md](../README.md) | จุดเริ่มต้นหลัก: Quick Start, Network Testnet, Config, โครงสร้าง repo |
| [RUN.md](../RUN.md) | คำสั่งรัน Worker, Monolith Scout, HYDRA และ Update |
| [DEVELOPMENT.md](../DEVELOPMENT.md) | สภาพแวดล้อมพัฒนา Docker scripts tests |
| [GET_STARTED.md](../GET_STARTED.md) | คู่มือเริ่มต้นสำหรับนักพัฒนา |
| [JOIN.md](../JOIN.md) | วิธีเข้าร่วมเครือข่าย |
| [core/README.md](../core/README.md) | โครงสร้าง core (Rust + DeAI) และคำสั่ง build/test |
| [core/deai/README.md](../core/deai/README.md) | DeAI Worker Python config และการรัน |
| [core/examples/contracts/README.md](../core/examples/contracts/README.md) | Smart contracts ตัวอย่าง (Token, NFT, Staking) และการ deploy |

---

## Book IV: Ops & Deploy

**Deploy Validator, RPC, Faucet และ Infra**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [GENESIS_PUBLIC_TESTNET_PLAN.md](GENESIS_PUBLIC_TESTNET_PLAN.md) | แผน Genesis public testnet + จัดสรร VPS 3 ตัว + Timeline รายสัปดาห์ |
| [CONNECTIVITY_OVERVIEW.md](CONNECTIVITY_OVERVIEW.md) | การเชื่อมต่อระหว่าง Local full node, VPS Validator และ Frontend |
| [ADD_NETWORK_AND_TOKEN.md](ADD_NETWORK_AND_TOKEN.md) | เพิ่มเครือข่าย Axionax และเหรียญ AXX ใน MetaMask / รับจาก Faucet |
| [ops/deploy/VPS_VALIDATOR_UPDATE.md](../ops/deploy/VPS_VALIDATOR_UPDATE.md) | อัปเดต Validator VPS (217.76.61.116, 46.250.244.4) และ checklist |
| [ops/deploy/VPS_FULL_NODE_RUNBOOK.md](../ops/deploy/VPS_FULL_NODE_RUNBOOK.md) | รัน full node บน VPS (chain_id 86137, RPC 8545, P2P 30303) |
| [ops/deploy/README.md](../ops/deploy/README.md) | โครงสร้าง ops/deploy, Docker, Nginx, scripts |
| [core/tools/GENESIS_LAUNCH_README.md](../core/tools/GENESIS_LAUNCH_README.md) | เครื่องมือ Genesis (create_genesis, verify, launch) |
| [tools/devtools/tools/faucet/README.md](../tools/devtools/tools/faucet/README.md) | Faucet API (Rust) และการ deploy |

---

## Book V: Launch & Testnet

**ความพร้อมก่อน Launch และการใช้งาน Testnet**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [TESTNET_READINESS.md](../TESTNET_READINESS.md) | สถานะความพร้อม Testnet (Genesis, Balance, Faucet) + ลิงก์ Launch docs |
| [GITHUB_READINESS.md](GITHUB_READINESS.md) | ความพร้อม repo บน GitHub (CI, secrets, docs, verify script) |
| [WALLET_AND_KEYS_READINESS.md](WALLET_AND_KEYS_READINESS.md) | Wallet, Private key, Faucet key, Node identity และ Balance & Faucet flow |
| [ops/deploy/scripts/verify-launch-ready.sh](../ops/deploy/scripts/verify-launch-ready.sh) | สคริปต์ตรวจสอบก่อน launch (Genesis, DNS, RPC, Faucet, docs) |

---

## Book VI: Security & Audit

**ความปลอดภัย รายงาน audit และการตอบเหตุการณ์**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [SECURITY.md](../SECURITY.md) | นโยบายความปลอดภัย และวิธีรายงานช่องโหว่ |
| [core/docs/SECURITY_AUDIT.md](../core/docs/SECURITY_AUDIT.md) | ขอบเขตและแนวทาง audit (genesis, keys, faucet, RPC) |
| [core/docs/RUNBOOK.md](../core/docs/RUNBOOK.md) | Runbook: Deploy Validator/RPC/Faucet และเหตุการณ์ (chain halt, RPC, faucet) |
| [SECURITY_REMEDIATION_PLAN.md](../SECURITY_REMEDIATION_PLAN.md) | แผนแก้ไขตามรายงาน audit |
| [docs/AUDIT_REMEDIATION.md](AUDIT_REMEDIATION.md) | สถานะการแก้ไขตาม audit |

---

## Book VII: Reference

**API คู่มืออ้างอิง และเอกสารเสริม**

| เอกสาร | คำอธิบาย |
|--------|----------|
| [core/docs/API_REFERENCE.md](../core/docs/API_REFERENCE.md) | RPC API reference |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | วิธีร่วมพัฒนาผ่าน Fork, branch, PR |
| [core/docs/README.md](../core/docs/README.md) | ดัชนีเอกสารใน core/docs |
| [docs/COMPATIBILITY_REPORT.md](COMPATIBILITY_REPORT.md) | รายงานความสอดคล้อง config และ chain_id |
| [docs/DOCKER_AND_CI_REPORT.md](DOCKER_AND_CI_REPORT.md) | Docker และ CI ใน repo |
| [docs/PROJECT_SURVEY.md](PROJECT_SURVEY.md) | สรุปโครงสร้างโปรเจกต์ |

---

## Worker / Node Operator เพิ่มเติม

| เอกสาร | คำอธิบาย |
|--------|----------|
| [ops/deploy/WORKER_SETUP_QUICK_GUIDE.md](../ops/deploy/WORKER_SETUP_QUICK_GUIDE.md) | คู่มือตั้งค่า Worker แบบเร็ว |
| [ops/deploy/WORKER_LOCAL_WINDOWS_AMD.md](../ops/deploy/WORKER_LOCAL_WINDOWS_AMD.md) | รัน Worker บน Windows (AMD) |
| [ops/deploy/QUICK_START.md](../ops/deploy/QUICK_START.md) | Quick Start สำหรับ deploy |
| [core/deai/WEB_INTEGRATION.md](../core/deai/WEB_INTEGRATION.md) | การเชื่อมต่อ DeAI กับเว็บและ RPC |

---

## สรุป

- **อยากเข้าใจภาพรวมและหลักการ** → Book I (Vision & Principles) + MASTER_SUMMARY
- **อยากรันโหนด/Worker** → Book III (Run & Develop) + README + RUN
- **อยาก deploy Testnet / Validator** → Book IV (Ops & Deploy) + GENESIS_PUBLIC_TESTNET_PLAN
- **อยากเพิ่มเครือข่าย/รับ AXX ใน MetaMask** → ADD_NETWORK_AND_TOKEN
- **อยากเช็คความพร้อมก่อน launch** → Book V + verify-launch-ready.sh

---

*Axionax Bible — รวบรวมและจัดเรียงเอกสารหลักของ axionax-core-universe ไว้ที่เดียว*
