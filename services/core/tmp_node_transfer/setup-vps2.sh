#!/usr/bin/env bash
set -euo pipefail

# Setup VPS2 (217.216.109.5) as a full node bootstrapping to VPS3 (46.250.244.4)

VPS3_PEER_ID="12D3KooWQY4NaM13vP6Vrx5Q4MWFQHGKj5qigtg81WC2J1Cca7ZK"
VPS3_IP="46.250.244.4"
BOOTSTRAP_MULTIADDR="/ip4/${VPS3_IP}/tcp/30303/p2p/${VPS3_PEER_ID}"

echo "[1/6] Making binary executable..."
chmod +x /usr/local/bin/axionax-node

echo "[2/6] Generating libp2p identity key (32 random bytes)..."
if [[ ! -f /var/lib/axionax-node/identity.key ]]; then
  openssl rand -out /var/lib/axionax-node/identity.key 32
  chmod 600 /var/lib/axionax-node/identity.key
fi

echo "[3/6] Writing /var/lib/axionax-node/node.env..."
cat > /var/lib/axionax-node/node.env <<EOF
# Axionax full node config (bootstrap → VPS3)
AXIONAX_ROLE=full
AXIONAX_STATE_PATH=/var/lib/axionax-node
AXIONAX_GENESIS=/var/lib/axionax-node/genesis.json
AXIONAX_RPC=0.0.0.0:8545
AXIONAX_P2P=0.0.0.0:30303
AXIONAX_BOOTSTRAP_NODES=${BOOTSTRAP_MULTIADDR}
AXIONAX_VALIDATOR_ADDRESS=
AXIONAX_IDENTITY_KEY=/var/lib/axionax-node/identity.key
AXIONAX_NODE_BIN=/usr/local/bin/axionax-node
EOF

echo "[4/6] Writing /var/lib/axionax-node/run.sh..."
cat > /var/lib/axionax-node/run.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
# shellcheck disable=SC1090
source "$HERE/node.env"
set +a
if [[ -z "${AXIONAX_BOOTSTRAP_NODES:-}" ]]; then
  echo "warning: AXIONAX_BOOTSTRAP_NODES is empty — public testnet peers may not connect" >&2
fi
export AXIONAX_BOOTSTRAP_NODES
ARGS=(
  --role "$AXIONAX_ROLE"
  --chain "$AXIONAX_GENESIS"
  --rpc "$AXIONAX_RPC"
  --state-path "$AXIONAX_STATE_PATH"
  --identity-key "$AXIONAX_IDENTITY_KEY"
)
if [[ -n "${AXIONAX_P2P:-}" ]]; then
  ARGS+=(--p2p "$AXIONAX_P2P")
fi
if [[ -n "${AXIONAX_VALIDATOR_ADDRESS:-}" ]]; then
  ARGS+=(--validator-address "$AXIONAX_VALIDATOR_ADDRESS")
fi
exec "$AXIONAX_NODE_BIN" "${ARGS[@]}"
EOF
chmod +x /var/lib/axionax-node/run.sh

echo "[5/6] Writing /etc/systemd/system/axionax-node.service..."
cat > /etc/systemd/system/axionax-node.service <<'EOF'
[Unit]
Description=Axionax axionax-node (/var/lib/axionax-node)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/var/lib/axionax-node/run.sh
Restart=always
RestartSec=10
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "[6/6] Reloading systemd + enabling/starting service..."
systemctl daemon-reload
systemctl enable axionax-node
systemctl restart axionax-node
sleep 5
systemctl status axionax-node --no-pager | head -20
echo
echo "=== Recent logs ==="
journalctl -u axionax-node --no-pager -n 30
