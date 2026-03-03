# Self-Sufficiency — โปรโตคอลทำงานได้ด้วยตัวเอง

**หลักการ:** โปรโตคอล Axionax ต้องสามารถทำงานบน chain ของตัวเองได้ แม้วันหนึ่ง server แม่ของภาษาหรือ ecosystem (เช่น PyPI, npm, crates.io) หรือ service ภายนอก (API, telemetry, CDN) จะถูกโจมตีหรือใช้ไม่ได้ ก็ไม่ทำให้ **การทำงานของ chain และ node** หยุดลง

---

## 1. สิ่งที่โปรโตคอลไม่พึ่งพาตอนรัน (Runtime)

| ประเภท | หลักการ | การปฏิบัติในโค้ด |
|--------|----------|-------------------|
| **Language/package registry** | ไม่เรียก PyPI / npm / crates.io ตอนรัน | Rust → binary compiled ล่วงหน้า; Python → ติดตั้ง dependencies ล่วงหน้าหรือ bundle ใน image; ไม่มี mandatory `pip install` / `npm install` ใน runtime path |
| **Third-party API** | ไม่บังคับเรียก Google, OpenAI, CDN ฯลฯ เพื่อให้ chain ทำงาน | DeAI worker โหลด model จาก local/cache ได้; ไม่บังคับเรียก cloud API สำหรับ consensus หรือ RPC |
| **Telemetry / phone-home** | ถ้ามี telemetry ต้องเป็น optional และไม่บล็อกการทำงาน | ปิด telemetry ได้หรือไม่ส่งเมื่อ endpoint ล่ม; node ยัง sync และ produce block ได้ |
| **NTP / time** | ถ้าใช้เวลาจากภายนอก ต้องมี fallback | ใช้ system time หรือ config; ไม่บังคับ NTP server ภายนอกเพื่อให้ chain ทำงาน |
| **Chain discovery** | Bootstrap / bootnodes เป็นของ **เครือข่ายเรา** หรือที่ operator กำหนด | bootnodes ใน config เป็น URL ของ validator/RPC ของ chain นี้; operator เปลี่ยนเป็นของตัวเองได้ (รวมถึงเครือข่ายในองค์กร) |

---

## 2. สิ่งที่อนุญาต (และควรออกแบบให้เลือกได้)

- **Build time:** ดึง dependencies จาก crates.io / PyPI / npm ตอน build ได้ (หลัง build แล้ว ไม่ต้องพึ่ง registry ตอนรัน)
- **Telemetry (optional):** ส่ง metrics ไป telemetry.axionax.org ได้ ถ้าปิดหรือ endpoint ล่ม ต้องไม่กระทบการทำงานของ node
- **DeAI:** โหลด model จากอินเทอร์เน็ต (เช่น Hugging Face) ได้ แต่ต้องมีทางเลือกใช้ model ที่โหลดไว้แล้วใน local/cache เพื่อให้ worker ทำงานได้เมื่อไม่มี WAN
- **RPC / bootnodes:** การเชื่อมต่อเป็นไปกับ **node บน chain เดียวกัน** (หรือที่ operator ตั้งค่า) ไม่ใช่ third-party SaaS บังคับ

---

## 3. จุดที่ต้องตรวจในโค้ดและ config

- **docker-compose / node command:** ถ้ามี `--telemetry https://...` ให้เป็น optional — โหมด air-gapped / self-sufficient ให้ **ลบสองบรรทัด** (--telemetry และ URL) ออกจาก command ของ validator (ดู comment ใน `ops/deploy/environments/testnet/public/docker-compose.yaml`)
- **Worker / DeAI:** ไม่มี mandatory call ไป external API สำหรับการยืนยันผลหรือ consensus; model inference ใช้ local/cache ได้
- **Genesis / config:** bootnodes และ RPC เป็นค่าที่ operator กำหนดได้ (รวมถึง localhost / เครือข่ายในองค์กร) ไม่ hardcode ให้ต้องพึ่ง host ภายนอกเพียงชุดเดียว

---

## 4. การป้องกันภัยคุกคามทางไซเบอร์ด้วย DeAI

โปรโตคอลสามารถ **ป้องกันตัวเองจากภัยคุกคามทางไซเบอร์ได้ด้วยตัวเอง** ผ่านชั้น DeAI (7 Sentinels, PoPC, ASR) — ไม่พึ่งระบบความปลอดภัยจากศูนย์กลางหรือ vendor ภายนอก รายละเอียด: [CYBER_DEFENSE.md](CYBER_DEFENSE.md)

---

## 5. สรุปหนึ่งบรรทัด

**ตอนรัน (runtime) โปรโตคอลไม่บังคับพึ่ง server แม่ของภาษา หรือ API/service ภายนอก เพื่อให้ chain และ node ทำงานได้ — ใช้แค่ binary ที่ build แล้ว, config และการเชื่อมต่อกับ node อื่นบน chain (ที่กำหนดใน config) ก็เพียงพอ และสามารถป้องกันภัยคุกคามทางไซเบอร์ได้ด้วยตัวเองผ่าน DeAI**
