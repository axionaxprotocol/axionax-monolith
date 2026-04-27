# Testnet Public — Infrastructure One-Page

Single place for **RPC (multi-region), Block Explorer, Faucet, Monitoring**.

## Telemetry (optional — self-sufficient mode)

For **air-gapped / self-sufficient** operation (no dependency on external URLs), remove the two `--telemetry` lines from the **validator** service command in `docker-compose.yaml`. The node will run without sending data to telemetry.axionax.org.

## One-command stack

From this directory (`ops/deploy/environments/testnet/public/`):

```bash
docker compose up -d
```

Brings up:

| Service    | Port | Purpose                    |
|------------|------|----------------------------|
| validator  | 8545, 30333 | Chain validator          |
| rpc        | 9545 | RPC (internal 8545)        |
| bootnode   | 30334 | P2P bootnode             |
| explorer   | 4000 | Blockscout block explorer   |
| faucet     | 8080 | Testnet token faucet       |
| prometheus | 9090 | Metrics                    |
| grafana    | 3000 | Dashboards                 |

## Multi-region RPC

To run RPC in multiple regions (e.g. EU + AU + US):

1. **Same compose:** Add more RPC replicas with different `rpc.env` (e.g. `REGION=eu`, `REGION=au`).
2. **Separate VPS per region:** On each VPS run only the `rpc` (and optional `node-exporter`) service; point to same genesis and bootnodes.

Example env for a second region (copy `rpc.env` to `rpc-au.env` and set `REGION=au`), then:

```yaml
# In docker-compose: add
  rpc-au:
    image: ${CONTAINER_REGISTRY:-ghcr.io/axionaxprotocol}/core:${CORE_TAG:-latest}
    restart: unless-stopped
    command: [ "axionax-node", "--role", "rpc", "--chain", "/genesis/testnet.json", "--rpc", "0.0.0.0:8545", "--unsafe-rpc" ]
    env_file: [ rpc-au.env ]
    volumes: [ rpc-au-data:/data, ./bootstrap/genesis:/genesis:ro ]
    ports: [ "9546:8545" ]
```

Users then use: EU `http://eu-rpc.example.com:8545`, AU `http://au-rpc.example.com:8545`.

## Block explorer

- **Image:** `ghcr.io/blockscout/blockscout:6.4.0` (see `docker-compose.yaml`).
- **Config:** `explorer.env` (DB, RPC URL to local `rpc:8545`).
- **Access:** `http://localhost:4000` (or your domain).

If the explorer API does not respond, see [TESTNET_DEPLOYMENT_PLAN](../../../tools/devtools/docs/TESTNET_DEPLOYMENT_PLAN.md): use stub or build from `tools/devtools/Dockerfile.explorer`.

## Faucet

- **Image:** `ghcr.io/axionaxprotocol/faucet:latest` (build from `core/` with `ops/deploy/Dockerfile.faucet` if needed).
- **Config:** `faucet.env` — **must set** `FAUCET_PRIVATE_KEY` (hex) for sending AXX.  
  Template: `cp faucet.env.example faucet.env` then edit (file is gitignored).
- **Endpoints:** Health/info and request endpoints per faucet docs.

## Monitoring

- **Prometheus:** Scrapes validator, rpc, bootnode, explorer, faucet (see `monitoring/prometheus/` or `monitoring/prometheus.yml`). Metrics port 9090.
- **Grafana:** Dashboards from `monitoring/dashboards`; datasource Prometheus. Admin password from `GRAFANA_ADMIN_PASSWORD` (default `admin`).

To add **node-exporter** (host metrics) on the same host, add to `docker-compose.yaml`:

```yaml
  node-exporter:
    image: prom/node-exporter:latest
    restart: unless-stopped
    ports: [ "9100:9100" ]
```

Then add a scrape job in `monitoring/prometheus.yml` for `node-exporter:9100`.

## Checklist

- [ ] `validator.env`, `rpc.env`, `faucet.env`, `explorer.env` filled (no secrets in git).
- [ ] Genesis in `bootstrap/genesis/`.
- [ ] Faucet: `FAUCET_PRIVATE_KEY` set.
- [ ] For production: HTTPS (nginx/traefik) and firewall rules.
