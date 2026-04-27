<div align="center">

# 🌐 axionax Web Universe

### Frontend Applications, SDK, Documentation & Marketplace Monorepo

[![Protocol](https://img.shields.io/badge/Protocol-v2.1--Seed-purple?style=flat-square)](https://axionax.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0-orange?style=flat-square&logo=pnpm)](https://pnpm.io/)
[![Status](https://img.shields.io/badge/Status-100%25%20Operational-green?style=flat-square)](https://axionax.org)

**Modern Web Stack** • **Monorepo Architecture** • **Type-Safe** • **Series Seed Preparation**

[Website](https://axionax.org) • [Documentation](https://axionaxprotocol.github.io/axionax-docs/) • [Core Universe](https://github.com/axionaxprotocol/axionax-core-universe)

</div>

---

## 📖 ภาพรวม (Overview)

**axionax Web Universe** เป็น Monorepo ที่รวบรวมส่วนประกอบสำคัญทั้งหมดของ **Axionax Protocol** ไว้ในที่เดียว ไม่ว่าจะเป็น Frontend Application, เอกสารคู่มือ (Documentation), SDK และ Marketplace โดยมีสถาปัตยกรรมที่ทันสมัยและจัดการ dependencies อย่างมีประสิทธิภาพด้วย pnpm workspaces

📄 **เอกสารสรุปโครงการฉบับสมบูรณ์** (วิสัยทัศน์, สถาปัตยกรรม, ฮาร์ดแวร์, DeAI/Sentinels, Roadmap, การระดมทุน): **[MASTER_SUMMARY.md](MASTER_SUMMARY.md)** (v2.1, ก.พ. 2026)

### 🎯 โครงสร้างภายใน (What's Inside?)

```
axionax-web-universe/
├── 📱 apps/
│   ├── web/              # เว็บไซต์หลัก (Next.js 14)
│   │   ├── src/          # Source code
│   │   ├── public/       # Static assets
│   │   └── package.json  # @axionax/web
│   │
│   ├── marketplace/      # ตลาดซื้อขายทรัพยากร (Vite + React)
│   │   ├── src/          # Source code
│   │   └── package.json  # @axionax/marketplace
│   │
│   └── docs/             # เว็บไซต์เอกสารคู่มือ (Documentation)
│       ├── guides/       # บทเรียนและคู่มือการใช้งาน
│       └── api/          # ข้อมูลอ้างอิง API
│
├── 📦 packages/
│   └── sdk/              # TypeScript SDK
│       ├── src/          # SDK source code
│       ├── types/        # Type definitions
│       └── package.json  # @axionax/sdk
│
├── pnpm-workspace.yaml   # การตั้งค่า Workspace
├── package.json          # Root package
└── pnpm-lock.yaml        # Lock file
```

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 📱 เว็บไซต์หลัก (`apps/web`)

เว็บไซต์อย่างเป็นทางการของ axionax Protocol

- **Next.js 14**: ใช้ App Router ล่าสุดและ Server Components
- **Tailwind CSS**: ตกแต่งสวยงามและปรับแต่งง่าย
- **TypeScript**: รองรับ Type-safety เต็มรูปแบบ
- **Responsive**: รองรับการแสดงผลบนมือถือ
- **SEO Optimized**: ปรับแต่งเพื่อการติดอันดับการค้นหา

### 🛒 Marketplace (`apps/marketplace`)

ตลาดซื้อขายทรัพยากรประมวลผลแบบ Decentralized

- **Vite + React**: พัฒนาและทำงานได้อย่างรวดเร็ว
- **Web3 Integration**: เชื่อมต่อกับ MetaMask/WalletConnect
- **Real-time Updates**: อัปเดตรายการสินค้าแบบเรียลไทม์

### 📚 เอกสารคู่มือ (`apps/docs`)

คู่มือสำหรับนักพัฒนาที่ครอบคลุม

- **เนื้อหาครบถ้วน**: มีมากกว่า 50 หน้า
- **ค้นหาง่าย**: ระบบค้นหาแบบ Full-text search
- **เข้าใจง่าย**: มีตัวอย่างโค้ดและบทเรียนสอนการใช้งาน

### 📦 TypeScript SDK (`packages/sdk`)

ชุดเครื่องมือสำหรับนักพัฒนา

- **Type-safe API**: รองรับ IntelliSense ช่วยให้เขียนโค้ดง่ายขึ้น
- **Modern**: ใช้ async/await และ Promise-based
- **Tree-shakeable**: Import เฉพาะส่วนที่ใช้งานได้ ช่วยลดขนาดไฟล์

---

## 🚀 การเริ่มต้นใช้งาน (Quick Start)

### สิ่งที่ต้องเตรียม (Prerequisites)

- **Node.js**: เวอร์ชัน 18 ขึ้นไป
- **pnpm**: เวอร์ชัน 8 ขึ้นไป

### 1. ติดตั้ง (Install)

```bash
# Clone repository
git clone https://github.com/axionaxprotocol/axionax-web-universe.git
cd axionax-web-universe

# ติดตั้ง dependencies (ใช้ pnpm workspaces)
pnpm install
```

### 2. รันโปรเจกต์ (Development Mode)

```bash
# รันทุกแอปพร้อมกัน
pnpm dev

# รันเฉพาะแอปที่ต้องการ
pnpm --filter @axionax/web dev
pnpm --filter @axionax/marketplace dev

# Build โปรเจกต์ทั้งหมด
pnpm build
```

---

## 🎯 แผนงาน (Roadmap)

### ✅ ดำเนินการแล้ว (Completed)

- [x] เว็บไซต์เวอร์ชัน 2.0 (Next.js 14)
- [x] TypeScript SDK v1.0
- [x] เว็บไซต์เอกสารคู่มือ
- [x] Marketplace (Beta)
- [x] โครงสร้างแบบ Monorepo

### 🔄 กำลังดำเนินการ (In Progress)

- [ ] Marketplace v1.0 (ระบบ Escrow)
- [ ] เพิ่มฟีเจอร์ Advanced SDK
- [ ] Oracle AI integration

---

<div align="center">

**Built with ❤️ by the axionax Protocol Team**

</div>
