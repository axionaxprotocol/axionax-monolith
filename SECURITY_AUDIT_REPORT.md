# Axionax Core Universe — Security Audit Report

**Date:** 2026-03-05  
**Scope:** Deployment, infrastructure, and configuration security  
**Auditor:** Automated security review  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 3 |
| **High** | 9 |
| **Medium** | 12 |
| **Low** | 8 |
| **Informational** | 6 |
| **Total** | **38** |

---

## Critical Findings

### C-1: Hardcoded Private Key in deploy_token.js

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/deployer/deploy_token.js`, line 14
- **Severity:** Critical
- **Category:** Secret Management
- **Description:** A well-known Hardhat/Anvil default private key (`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`) is hardcoded as a fallback. This is Hardhat Account #0's key. While intended for local dev, it is committed to the repository and could be mistakenly used in production deployments or leak other private keys via copy-paste patterns.
- **Impact:** If this key is used in any context beyond a local ephemeral chain, funds are immediately stealable by anyone who recognizes this default key. The pattern encourages developers to treat hardcoded keys as acceptable.
- **Recommendation:** Remove the hardcoded fallback entirely. Require the private key to be set via environment variable only, and fail explicitly if absent (like the v1.5 `deploy_token.js` already does correctly).

### C-2: Hardcoded SECRET_KEY_BASE for Blockscout

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/docker-compose.yml`, line 100
- **Severity:** Critical
- **Category:** Secret Management
- **Description:** The Blockscout `SECRET_KEY_BASE` is hardcoded directly in the docker-compose file: `pd1+T03FiW54uPGlkL+xx5U3alkXpgky+kP1/55JyElDiOM1LMnAl7s2ueF4/rQ4m6xkwmjtnIoC2VMYb0+kJg==`. This key is used to sign session cookies and protect against CSRF.
- **Impact:** Anyone with access to this repo can forge Blockscout session tokens and CSRF tokens, enabling complete takeover of explorer admin sessions.
- **Recommendation:** Generate this key dynamically at deploy time (e.g., `openssl rand -base64 64`) or move to an environment variable sourced from a secret store. Note: `ops/deploy/setup_explorer.sh` line 198 already shows the correct pattern.

### C-3: Hardcoded Database Password in Blockscout docker-compose

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/docker-compose.yml`, lines 64, 86
- **Severity:** Critical
- **Category:** Secret Management
- **Description:** The PostgreSQL credentials for Blockscout are hardcoded as `blockscout:blockscout` — both the username and password are the same string, committed in plaintext in a docker-compose file.
- **Impact:** In any deployment where the database port is reachable (including docker network-adjacent services), the database is fully accessible. Combined with the `DATABASE_URL` on line 86, this grants full read/write to the Blockscout explorer database.
- **Recommendation:** Use environment variable substitution (`${BLOCKSCOUT_DB_PASSWORD}`) and source from a `.env` file that is gitignored.

---

## High Findings

### H-1: Hardcoded PostgreSQL Credentials in Dev Compose

- **File:** `docker-compose.dev.yml`, lines 75–77
- **Severity:** High
- **Category:** Secret Management
- **Description:** Database credentials are hardcoded: `POSTGRES_USER: axionax`, `POSTGRES_PASSWORD: axionax_dev_2026`, `POSTGRES_DB: axionax_testnet`. While labeled for dev, this file is committed and the pattern normalizes using plaintext credentials.
- **Impact:** Credentials are publicly visible in the repo. If this compose file is used on any reachable host, the database is open to anyone who reads the repo.
- **Recommendation:** Use `${POSTGRES_PASSWORD}` variable substitution with a `.env` file or Docker secrets.

### H-2: Hardcoded Grafana Admin Password in Dev Compose

- **File:** `docker-compose.dev.yml`, line 203
- **Severity:** High
- **Category:** Secret Management
- **Description:** `GF_SECURITY_ADMIN_PASSWORD=axionax` is hardcoded. This gives admin access to all Grafana dashboards and data sources.
- **Impact:** Unauthorized access to monitoring infrastructure; can be used to understand system internals and pivot attacks.
- **Recommendation:** Use environment variable substitution as done in `docker-compose.vps.yml`.

### H-3: Default "admin/admin" Grafana Credentials in Public Testnet

- **File:** `ops/deploy/environments/testnet/public/docker-compose.yaml`, line 118; `ops/deploy/environments/testnet/public/.env.monitoring`, line 4
- **Severity:** High
- **Category:** Default Credentials
- **Description:** Grafana default admin password is `admin` (fallback) and the `.env.monitoring` file ships with `GRAFANA_ADMIN_PASSWORD=changeme`. Both are committed to the repo. Port 3000 is exposed publicly (not bound to 127.0.0.1).
- **Impact:** Public-facing Grafana instance with default credentials allows full dashboard and datasource management, including the ability to execute queries against Prometheus to extract operational data.
- **Recommendation:** Never commit actual passwords. Use a placeholder that fails if not changed. Bind Grafana to `127.0.0.1:3000` and access via SSH tunnel.

### H-4: Default "admin:password" Basic Auth in .env.example

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/.env.example`, line 11
- **Severity:** High
- **Category:** Default Credentials
- **Description:** `BASIC_AUTH=admin:password` is provided as the example value. Users copying the example file may not change this.
- **Impact:** Faucet API accessible with trivially guessable credentials.
- **Recommendation:** Use a non-functional placeholder like `BASIC_AUTH=CHANGE_ME_user:CHANGE_ME_pass` that clearly won't work.

### H-5: Wildcard CORS Origins in Production Config

- **File:** `ops/deploy/configs/rpc-config.toml`, line 14; `ops/deploy/docker-compose.vps.yml`, line 19; `ops/deploy/nginx/conf.d/rpc.conf`, line 57
- **Severity:** High
- **Category:** Network Security
- **Description:** `cors_origins = ["*"]` and `Access-Control-Allow-Origin *` are configured across RPC config, VPS compose, and the production Nginx proxy. This allows any website to make authenticated RPC calls from users' browsers.
- **Impact:** Enables cross-origin attacks where malicious websites can interact with the blockchain RPC on behalf of users who have wallets connected.
- **Recommendation:** Restrict CORS to specific trusted domains (e.g., `https://explorer.axionax.org`, `https://faucet.axionax.org`).

### H-6: --unsafe-rpc Flag Enabled in Testnet Compose

- **File:** `ops/deploy/environments/testnet/public/docker-compose.yaml`, line 48
- **Severity:** High
- **Category:** Configuration Security
- **Description:** The RPC node runs with `--unsafe-rpc` flag, which typically disables safety restrictions on RPC methods and allows potentially dangerous operations.
- **Impact:** May expose administrative or debug RPC methods that allow state manipulation, memory dumps, or denial of service.
- **Recommendation:** Remove `--unsafe-rpc` for any publicly accessible RPC node. Use it only for local development.

### H-7: Redis Without Authentication in Dev Compose

- **File:** `docker-compose.dev.yml`, lines 93–102
- **Severity:** High
- **Category:** Missing Authentication
- **Description:** Redis is deployed without `--requirepass` and exposed on port 6379. No authentication is configured.
- **Impact:** Unauthenticated Redis access can lead to data manipulation, cache poisoning, and in some configurations, arbitrary command execution via Redis SLAVEOF or MODULE LOAD attacks.
- **Recommendation:** Always configure `--requirepass` for Redis, even in development.

### H-8: Prometheus and Node Exporter Publicly Exposed

- **File:** `ops/deploy/environments/testnet/public/docker-compose.yaml`, lines 106–108, 133–134; `docker-compose.dev.yml`, lines 180–181
- **Severity:** High
- **Category:** Unauthenticated Service Exposure
- **Description:** Prometheus (port 9090) and Node Exporter (port 9100) are exposed on all interfaces without authentication. Prometheus exposes the entire metric namespace, and Node Exporter provides detailed system metrics.
- **Impact:** Attackers gain detailed knowledge of system resources, performance, connected services, and operational patterns. Node Exporter exposes filesystem paths, network interfaces, CPU/memory usage — all useful for targeting further attacks.
- **Recommendation:** Bind to `127.0.0.1` only, access via SSH tunnel or VPN. Or place behind an authenticated reverse proxy.

### H-9: Hardcoded IP Addresses of Production Validators

- **File:** Multiple files: `configs/monolith_sentinel.toml` lines 8–9, `configs/monolith_worker.toml` lines 8–9, `configs/monolith_scout_single.toml` lines 12–13, `ops/deploy/scripts/update-validator-vps.sh` line 2, and many more
- **Severity:** High
- **Category:** Information Disclosure
- **Description:** Production validator VPS IP addresses (`217.76.61.116`, `46.250.244.4`, `217.216.109.5`) are hardcoded throughout the codebase — in TOML configs, deployment scripts, documentation, and markdown files.
- **Impact:** Exposes the exact network location of critical infrastructure (validators, RPC nodes) to anyone reading the public repository, facilitating targeted DDoS attacks, port scanning, and exploitation attempts.
- **Recommendation:** Use DNS names instead of IP addresses in configs. Move IPs to environment variables or private configuration management. Remove IPs from public documentation.

---

## Medium Findings

### M-1: Testnet-in-a-Box Dockerfile Runs as Root

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/Dockerfile`, line 64
- **Severity:** Medium
- **Category:** Docker Security
- **Description:** The final production image does not include a `USER` directive. The process runs as root by default.
- **Impact:** Container escape vulnerabilities become more dangerous when running as root; compromise of the container means root on the host in certain kernel exploit scenarios.
- **Recommendation:** Add `RUN adduser --system --uid 1000 axionax` and `USER axionax` as done in `ops/deploy/Dockerfile` (which does this correctly).

### M-2: Explorer Stub Dockerfile Runs as Root

- **File:** `tools/devtools/Dockerfile.explorer`, line 11
- **Severity:** Medium
- **Category:** Docker Security
- **Description:** No `USER` directive; runs as root by default (node image default is root unless `USER node` is specified).
- **Impact:** Same as M-1.
- **Recommendation:** Add `USER node` before the `CMD` directive.

### M-3: Faucet Rate Limiting Zone Defined After Use

- **File:** `ops/deploy/nginx/conf.d/faucet.conf`, lines 45, 50
- **Severity:** Medium
- **Category:** Configuration Error
- **Description:** The `limit_req zone=faucet_limit` is used on line 45, but the `limit_req_zone` directive that defines it appears on line 50. Nginx may fail to load or the rate limiting may not work as expected.
- **Impact:** Faucet endpoint may operate without rate limiting, allowing draining of testnet funds.
- **Recommendation:** Move the `limit_req_zone` directive before the `server` block.

### M-4: Nginx Missing server_tokens off

- **File:** `ops/deploy/nginx/nginx.conf`
- **Severity:** Medium
- **Category:** Information Leakage
- **Description:** The `server_tokens off;` directive is not present. By default, Nginx reveals its version in response headers and error pages.
- **Impact:** Version information aids attackers in identifying known vulnerabilities for the specific Nginx version.
- **Recommendation:** Add `server_tokens off;` in the `http` block.

### M-5: Database Credential in .env.explorer Committed to Repo

- **File:** `ops/deploy/environments/testnet/public/.env.explorer`, line 17
- **Severity:** Medium
- **Category:** Secret Management
- **Description:** `DATABASE_URL=postgresql://explorer:password@postgres:5432/explorer` contains a plaintext password "password" committed to the repository.
- **Impact:** Database access with known credentials if any explorer deployment uses this file directly.
- **Recommendation:** Use a placeholder like `DATABASE_URL=postgresql://explorer:CHANGE_ME@postgres:5432/explorer`.

### M-6: Multiple Services Bound to 0.0.0.0 in Dev Compose

- **File:** `docker-compose.dev.yml`, lines 17–20, 78–79, 98, 116, 137, 157, 181, 200
- **Severity:** Medium
- **Category:** Network Exposure
- **Description:** All services (RPC, WebSocket, P2P, PostgreSQL, Redis, Web, Marketplace, Faucet, Prometheus, Grafana) are exposed on all interfaces via `0.0.0.0` binding.
- **Impact:** In cloud/VPS environments, all services become publicly accessible. PostgreSQL (5432) and Redis (6379) being publicly accessible is particularly dangerous.
- **Recommendation:** Bind dev services to `127.0.0.1` except P2P ports. Use `127.0.0.1:5432:5432` for database and `127.0.0.1:6379:6379` for Redis.

### M-7: Faucet Private Key Fallback to Key 0x...01

- **File:** `docker-compose.dev.yml`, line 163
- **Severity:** Medium
- **Category:** Secret Management
- **Description:** Faucet uses `${FAUCET_PRIVATE_KEY:-0x0000...0001}` as a fallback. Private key `0x01` is a known, deterministic key.
- **Impact:** While intended for dev, if this compose file runs anywhere with real funds, the faucet wallet is immediately compromised.
- **Recommendation:** Remove the default fallback; require explicit key configuration.

### M-8: Deploy Script Sources .env (Shell Injection Risk)

- **File:** `ops/deploy/scripts/deploy-all-services.sh`, line 168; `ops/deploy/scripts/check-vps-status.sh`, line 189; `ops/deploy/scripts/verify-launch-ready.sh`, line 177
- **Severity:** Medium
- **Category:** Command Injection
- **Description:** Multiple scripts use `source "${DEPLOY_DIR}/.env"` to load environment variables. If the `.env` file contains shell metacharacters or is maliciously modified, arbitrary commands execute.
- **Impact:** Code execution in the context of the deployment user (often root, per the `check_root` function).
- **Recommendation:** Parse `.env` files safely (e.g., using `set -a; . .env; set +a` with validated input, or use a dedicated env parser). Avoid sourcing untrusted files as root.

### M-9: Grafana Password Printed in Deployment Output

- **File:** `ops/deploy/scripts/deploy-all-services.sh`, line 411
- **Severity:** Medium
- **Category:** Information Disclosure
- **Description:** `echo -e "Password: ${GRAFANA_PASSWORD}"` prints the Grafana admin password to stdout and to the deployment log file.
- **Impact:** Password is visible in terminal history, log files, and CI/CD output.
- **Recommendation:** Never print secrets to stdout. Display only a reminder to check the .env file.

### M-10: Blockscout Explorer Port 4000 Exposed on All Interfaces

- **File:** `ops/deploy/environments/testnet/public/docker-compose.yaml`, lines 87–88
- **Severity:** Medium
- **Category:** Network Exposure
- **Description:** Explorer exposes port 4000 publicly (`"4000:4000"` without 127.0.0.1 binding), potentially bypassing any reverse proxy protections.
- **Impact:** Direct access to the Blockscout backend bypasses any security headers, rate limiting, or authentication configured in Nginx.
- **Recommendation:** Change to `"127.0.0.1:4000:4000"` or remove direct port mapping and access only through the reverse proxy.

### M-11: Host Root Filesystem Mounted Read-Only in Node Exporter

- **File:** `ops/deploy/environments/testnet/public/docker-compose.yaml`, line 132
- **Severity:** Medium
- **Category:** Docker Security
- **Description:** `"/:/host:ro,rslave"` mounts the entire host filesystem into the node-exporter container.
- **Impact:** While read-only, this exposes the entire host filesystem including `/etc/shadow`, SSH keys, and potentially secrets to the container process. A container escape could leverage this.
- **Recommendation:** Mount only specific paths needed for metrics (e.g., `/proc`, `/sys`).

### M-12: Deterministic Faucet Key Generation

- **File:** `scripts/generate-faucet-key.py`, lines 27, 41
- **Severity:** Medium
- **Category:** Cryptographic Weakness
- **Description:** Testnet mode derives the faucet private key deterministically from `sha256(b"axionax_faucet_mainnet_q2_2026")`. The seed is hardcoded and publicly visible.
- **Impact:** Anyone can compute the testnet faucet private key and drain the faucet.
- **Recommendation:** This is acceptable for testnet only if documented. Ensure the `--testnet` flag cannot accidentally be used in mainnet workflows.

---

## Low Findings

### L-1: Outdated Base Image in Testnet-in-a-Box Dockerfile

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/Dockerfile`, line 52
- **Severity:** Low
- **Category:** Supply Chain / Patching
- **Description:** Uses `debian:bullseye-slim` (Debian 11) while other Dockerfiles use `debian:bookworm-slim` (Debian 12). Bullseye is approaching end of life.
- **Impact:** May contain unpatched vulnerabilities in system libraries.
- **Recommendation:** Update to `debian:bookworm-slim` consistently.

### L-2: libssl-dev in Production Image

- **File:** `ops/deploy/Dockerfile`, line 65
- **Severity:** Low
- **Category:** Docker Security
- **Description:** `libssl-dev` (development headers) is installed in the production image. Only `libssl3` (runtime library) is needed.
- **Impact:** Increases attack surface with unnecessary development tools.
- **Recommendation:** Replace `libssl-dev` with `libssl3` in the final stage.

### L-3: Deprecated X-XSS-Protection Header

- **File:** `ops/deploy/nginx/conf.d/rpc.conf`, line 36; `faucet.conf`, line 30; `explorer.conf`, line 30
- **Severity:** Low
- **Category:** Security Headers
- **Description:** `X-XSS-Protection "1; mode=block"` is deprecated and can introduce vulnerabilities in some browsers.
- **Impact:** Minimal — modern browsers ignore it. In older IE, `mode=block` could be exploited for information leakage.
- **Recommendation:** Remove the header entirely and rely on CSP for XSS protection.

### L-4: Grafana Dashboards Editable in Provisioning

- **File:** `ops/deploy/monitoring/grafana/dashboards/dashboard.yml`, line 8
- **Severity:** Low
- **Category:** Configuration Security
- **Description:** `editable: true` allows dashboard modification through the UI, potentially losing provisioned state.
- **Impact:** Unauthorized dashboard changes if Grafana access is compromised.
- **Recommendation:** Set `editable: false` and `disableDeletion: true` for provisioned dashboards.

### L-5: Grafana Datasource Editable

- **File:** `ops/deploy/monitoring/grafana/datasources/prometheus.yml`, line 9
- **Severity:** Low
- **Category:** Configuration Security
- **Description:** `editable: true` allows modifying the Prometheus datasource URL via the UI.
- **Impact:** Could be redirected to a malicious Prometheus instance if Grafana is compromised.
- **Recommendation:** Set `editable: false`.

### L-6: No Resource Limits on Docker Containers

- **File:** `docker-compose.dev.yml`, `ops/deploy/docker-compose.vps.yml`, `ops/deploy/environments/testnet/public/docker-compose.yaml`
- **Severity:** Low
- **Category:** Denial of Service
- **Description:** No `mem_limit`, `cpus`, or `ulimits` are set on any Docker containers.
- **Impact:** A single misbehaving container can consume all host resources, causing denial of service to other containers.
- **Recommendation:** Add resource limits, especially for database and RPC services.

### L-7: Log Files Not Rotated

- **File:** `ops/deploy/scripts/deploy-all-services.sh`, line 24
- **Severity:** Low
- **Category:** Operational Security
- **Description:** `LOG_FILE="${DEPLOY_DIR}/deployment.log"` is appended to without rotation. Most docker-compose files don't configure log rotation either.
- **Impact:** Disk exhaustion over time; log files may contain sensitive information.
- **Recommendation:** Implement log rotation. The public testnet compose file correctly uses `json-file` driver with `max-size` and `max-file` — apply this pattern to all compose files.

### L-8: Faucet GET Requests for State-Changing Operations

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/index.js`, line 67; `faucet/server.js`, line 33
- **Severity:** Low
- **Category:** API Design
- **Description:** Faucet fund requests use `GET /request?address=...` instead of POST. GET requests are susceptible to CSRF via image tags, can be cached, and appear in access logs with the full URL.
- **Impact:** Trivial CSRF attacks; addresses appear in server logs and browser history.
- **Recommendation:** Change to POST method with JSON body.

---

## Informational Findings

### I-1: Bootnodes Use HTTP (Unencrypted) for RPC

- **File:** `configs/monolith_sentinel.toml`, lines 8–9; `configs/monolith_worker.toml`, lines 8–9; `configs/monolith_scout_single.toml`, lines 12–13
- **Severity:** Informational
- **Category:** Network Security
- **Description:** All bootnode configurations use `http://` for RPC connections to validator nodes.
- **Impact:** RPC traffic (including transaction submissions) is unencrypted in transit.
- **Recommendation:** Use HTTPS endpoints via the Nginx reverse proxy (e.g., `https://rpc.axionax.org`) for production workers.

### I-2: Version Pinning Not Enforced Across All Images

- **File:** Multiple docker-compose files
- **Severity:** Informational
- **Category:** Supply Chain
- **Description:** Some images use `:latest` tag (`ghcr.io/blockscout/blockscout:latest`, `ghcr.io/blockscout/frontend:latest`, `prom/prometheus:latest`), while others use pinned versions. The `:latest` tag is mutable and can change without notice.
- **Impact:** Non-reproducible builds; potential introduction of breaking changes or vulnerabilities.
- **Recommendation:** Pin all images to specific versions or SHA digests.

### I-3: No Docker Network Segmentation

- **File:** `docker-compose.dev.yml`, `ops/deploy/docker-compose.vps.yml`
- **Severity:** Informational
- **Category:** Network Architecture
- **Description:** All services share a single flat Docker bridge network. Database, cache, application, and monitoring services all have direct network connectivity.
- **Impact:** Compromise of any container grants network access to all other services (including database and Redis).
- **Recommendation:** Segment networks (e.g., `frontend`, `backend`, `monitoring`) and only connect services to the networks they need.

### I-4: No HEALTHCHECK in Testnet-in-a-Box Dockerfile

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/Dockerfile`
- **Severity:** Informational
- **Category:** Operational Resilience
- **Description:** Unlike `Dockerfile.faucet` and the mock-rpc Dockerfile, the main testnet Dockerfile has no `HEALTHCHECK` instruction.
- **Impact:** Docker and orchestrators cannot automatically detect and restart unhealthy node containers.
- **Recommendation:** Add a HEALTHCHECK that queries the RPC endpoint.

### I-5: Deprecated docker-compose Version Field

- **File:** `docker-compose.dev.yml`, `ops/deploy/docker-compose.yaml`, `ops/deploy/docker-compose.vps.yml`, `ops/deploy/environments/docker-compose.yaml`
- **Severity:** Informational
- **Category:** Configuration Hygiene
- **Description:** `version: '3.8'` is deprecated in modern Docker Compose (V2+). It is ignored and will eventually produce warnings.
- **Impact:** No functional impact currently.
- **Recommendation:** Remove the `version` field.

### I-6: Alerting Not Configured

- **File:** `ops/deploy/monitoring/prometheus.yml`, lines 9–13
- **Severity:** Informational
- **Category:** Operational Security
- **Description:** Alertmanager configuration is commented out. No alerting rules are active.
- **Impact:** Security incidents (service down, unusual traffic, resource exhaustion) go undetected.
- **Recommendation:** Configure Alertmanager with rules for critical conditions (service down, high error rate, resource thresholds).

---

## Summary of Recommendations (Priority Order)

1. **Immediately remove hardcoded secrets** from docker-compose files and scripts (C-1, C-2, C-3, H-1, H-2)
2. **Move all credentials** to environment variables loaded from gitignored `.env` files (H-4, M-5, M-7)
3. **Restrict CORS** to specific trusted domains instead of wildcard `*` (H-5)
4. **Remove `--unsafe-rpc`** from any publicly accessible node configuration (H-6)
5. **Bind sensitive services** (PostgreSQL, Redis, Prometheus, Grafana) to `127.0.0.1` (H-7, H-8, M-6, M-10)
6. **Remove production IP addresses** from the public repository (H-9)
7. **Add `USER` directives** to all Dockerfiles that lack them (M-1, M-2)
8. **Add `server_tokens off`** to Nginx main config (M-4)
9. **Don't print secrets** in deployment script output (M-9)
10. **Add resource limits** to all Docker containers (L-6)
11. **Pin all Docker image versions** (I-2)
12. **Implement network segmentation** in Docker networks (I-3)
13. **Configure alerting** in Prometheus (I-6)
