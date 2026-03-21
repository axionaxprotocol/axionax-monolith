# เตรียม Deploy Web บน VPS (axionax-web-universe)

ใช้กับ flow **clone/pull บนเซิร์ฟเวอร์ → pnpm build → Next standalone + PM2 → Nginx proxy ไปพอร์ต 3000**

## 1. สิ่งที่ต้องมีบน VPS

| รายการ | หมายเหตุ |
|--------|----------|
| **Node.js** | แนะนำ v20+ (`node -v`) |
| **pnpm** | `npm i -g pnpm` |
| **PM2** | `npm i -g pm2` (หรือใช้ `nohup` ตามสคริปต์) |
| **Git** | clone/pull ได้; แนะนำ remote เป็น **SSH** (`git@github.com:...`) |
| **Nginx** | `proxy_pass` ไป `http://127.0.0.1:3000` — **อย่า** serve แค่ static จากโฟลเดอร์ถ้าใช้ Node standalone |

## 2. โฟลเดอร์บนเซิร์ฟเวอร์ (ค่าเริ่มต้นในสคริปต์)

- `APP_DIR` = `/opt/axionax-web-universe`
- Standalone รัน: `apps/web/.next/standalone/apps/web/server.js`
- พอร์ต: `PORT=3000`

## 3. Environment (สำคัญก่อน build)

สร้างไฟล์ **`apps/web/.env.production`** บน VPS (หรือ export ก่อน `pnpm build`) อย่างน้อย:

```env
NODE_ENV=production
NEXT_PUBLIC_CHAIN_ID=86137
NEXT_PUBLIC_RPC_URL=https://rpc.axionax.org
NEXT_PUBLIC_FAUCET_URL=https://faucet.axionax.org
FAUCET_API_URL=https://faucet-api.axionax.org
```

ถ้าใช้ reverse proxy ภายในโดเมนเดียวกัน ให้ตั้ง `NEXT_PUBLIC_RPC_EU` / `NEXT_PUBLIC_RPC_AU` เป็น path เช่น `/rpc/eu` ตามที่ Nginx ตั้งไว้

ดูตัวอย่างเต็ม: `apps/web/.env.example`

**ตัวนับผู้เข้าชม (footer):** ค่าเก็บใน `apps/web/data/site-visitors.json` (สร้างอัตโนมัติ) ถ้า standalone รันแล้ว `cwd` เขียนไฟล์ไม่ได้หรืออยากให้เลขไม่หายทุกครั้งที่ deploy ให้ตั้ง:

```env
VISITOR_DATA_DIR=/var/lib/axionax-web
```

แล้วบน VPS: `sudo mkdir -p /var/lib/axionax-web && sudo chown $(whoami) /var/lib/axionax-web` (หรือ user ที่รัน PM2)

## 4. ครั้งแรก (ติดตั้งจากศูนย์)

จากเครื่อง local (มี repo แล้ว):

```bash
ssh root@YOUR_VPS_IP 'bash -s' < scripts/vps-setup-from-git.sh
```

หรือบน VPS โดยตรง:

```bash
export REPO_URL=git@github.com:axionaxprotocol/axionax-web-universe.git
export APP_DIR=/opt/axionax-web-universe
# แล้วรันสคริปต์ vps-setup-from-git.sh
```

## 5. อัปเดตหลัง push ไป `main` แล้ว

บน VPS:

```bash
ssh root@YOUR_VPS_IP 'bash -s' < scripts/vps-update-and-restart.sh
```

หรือคัดลอกคำสั่งจาก `scripts/vps-update-and-restart.sh` ไปรันทีละบล็อก:

1. `cd /opt/axionax-web-universe && git pull origin main`
2. `pnpm install --frozen-lockfile`
3. `pnpm --filter @axionax/blockchain-utils build`
4. `pnpm --filter @axionax/sdk build`
5. `pnpm --filter @axionax/web build`
6. คัดลอก `.next/static` และ `public` เข้า standalone (ตามในสคริปต์)
7. `pm2 restart axionax-web` (หรือ start ครั้งแรก)

## 6. ตรวจสอบหลัง deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
pm2 logs axionax-web --lines 30
```

Nginx: ดูตัวอย่าง `apps/web/nginx/conf.d/axionax-standalone.conf.example` และ `apps/web/nginx/conf.d/axionax.conf`

## 7. Docker (ถ้าใช้ root `docker-compose.yml` อย่างเดียว)

Compose หลักใน repo เน้น **API + Postgres + Redis** — ไม่รวม container Next.js web  
ถ้า deploy web แยก ให้ใช้ flow **standalone + PM2** ด้านบน หรือปรับ compose เองให้ build/run `apps/web`

## อ้างอิง

- `scripts/vps-setup-from-git.sh` — ติดตั้งครั้งแรก  
- `scripts/vps-update-and-restart.sh` — pull + build + restart  
- `scripts/vps-standalone-check.sh` — ตรวจ process / พอร์ต  
- `docs/DEPLOY.md` — ตัวเลือก CI, GitHub Pages, SCP  
