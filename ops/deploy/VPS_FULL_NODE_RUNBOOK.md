# รัน Full Node บน VPS 2 ตัว

ใช้เมื่อมี VPS 2 IP พร้อมรัน full node (chain_id=86137, RPC 8545, P2P 30303)

---

## สิ่งที่ต้องมีบนแต่ละ VPS

- **OS:** Ubuntu 22.04 / 24.04 (หรือ Debian)
- **RAM:** ขั้นต่ำ 2GB (แนะนำ 4GB+)
- **Disk:** 20GB+ สำหรับ state
- **Port เปิด:** 22 (SSH), **8545** (RPC), **30303** (P2P)

---

## วิธีที่ 1: Build จาก source (แนะนำ)

### บน VPS แต่ละตัว

```bash
# 1. ติดตั้ง Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# 2. Clone และ build
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe/core
cargo build --release -p node

# 3. สร้างโฟลเดอร์ state
mkdir -p /var/lib/axionax-node
# หรือใช้ path ใน home: mkdir -p ~/axionax-state
```

### รัน Node

**VPS ตัวที่ 1 (รันก่อน — ใช้เป็น bootstrap ของตัวที่ 2):**

ใช้ `--identity-key` เพื่อให้ PeerId คงที่หลัง restart (เหมาะ validator):

```bash
cd /path/to/axionax-core-universe/core

./target/release/axionax-node \
  --role full \
  --chain-id 86137 \
  --rpc 0.0.0.0:8545 \
  --state-path /var/lib/axionax-node \
  --identity-key /var/lib/axionax-node/identity.key
```

ใน log จะมีบรรทัดประมาณนี้ → **คัดลอก Peer ID ไว้:**

```
Local peer ID: 12D3KooWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**VPS ตัวที่ 2 (ชี้ bootstrap ไปที่ตัวที่ 1):**

แทนที่ `VPS1_IP` และ `PEER_ID_FROM_VPS1` ด้วยค่าจริงจากตัวที่ 1

```bash
export AXIONAX_BOOTSTRAP_NODES="/ip4/VPS1_IP/tcp/30303/p2p/PEER_ID_FROM_VPS1"

./target/release/axionax-node \
  --role full \
  --chain-id 86137 \
  --rpc 0.0.0.0:8545 \
  --state-path /var/lib/axionax-node
```

ถ้ามีมากกว่า 2 node ให้ใส่หลาย multiaddr คั่นด้วย comma ใน `AXIONAX_BOOTSTRAP_NODES`

### รันเป็น systemd (ทั้ง 2 ตัว)

สร้างไฟล์ `/etc/systemd/system/axionax-node.service`:

```ini
[Unit]
Description=Axionax Full Node
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/axionax-core-universe/core
# ตัวที่ 2 ใส่ env ด้านล่าง (แก้ VPS1_IP และ PEER_ID)
# Environment="AXIONAX_BOOTSTRAP_NODES=/ip4/VPS1_IP/tcp/30303/p2p/PEER_ID"
ExecStart=/path/to/axionax-core-universe/core/target/release/axionax-node \
  --role full --chain-id 86137 \
  --rpc 0.0.0.0:8545 \
  --state-path /var/lib/axionax-node \
  --identity-key /var/lib/axionax-node/identity.key
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

จากนั้น:

```bash
sudo systemctl daemon-reload
sudo systemctl enable axionax-node
sudo systemctl start axionax-node
sudo systemctl status axionax-node
```

---

## วิธีที่ 2: Docker

ถ้ามี image `ghcr.io/axionaxprotocol/axionax-core:latest`:

```bash
# โคลนเพื่อเอา config / script
git clone https://github.com/axionaxprotocol/axionax-core-universe.git
cd axionax-core-universe/ops/deploy

# รันแค่ RPC node (จาก docker-compose.vps.yml)
docker compose -f docker-compose.vps.yml up -d rpc-node
```

หมายเหตุ: image ต้องรองรับการ bind RPC 0.0.0.0:8545 และ state volume; ถ้า image ยังไม่ push ให้ใช้วิธีที่ 1

---

## Firewall

```bash
# UFW
sudo ufw allow 22/tcp
sudo ufw allow 8545/tcp
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw enable
```

---

## ตรวจว่า RPC ใช้ได้

จากเครื่องอื่นหรือ local:

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://VPS_IP:8545
```

ควรได้ `"result":"0x0"` หรือเลข block

---

## สรุป 2 VPS

| ขั้นตอน | VPS 1 | VPS 2 |
|--------|--------|--------|
| Build | clone + cargo build -p node | เหมือนกัน |
| รัน | รัน node ปกติ | ตั้ง `AXIONAX_BOOTSTRAP_NODES` ชี้ไป VPS1 (ด้วย Peer ID ของ VPS1) |
| Port | 8545, 30303 | 8545, 30303 |

Peer ID ของแต่ละ node ดูจาก log บรรทัด `Local peer ID:` ตอน start
