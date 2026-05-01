# syntax=docker/dockerfile:1.7
#
# Axionax Core — multi-stage production image
# ============================================
#
# Layout:
#   1. chef        — install cargo-chef for reproducible dep caching
#   2. planner     — produce a recipe.json describing all Rust deps
#   3. rust-builder — cook deps once (cached), then build axionax-node
#   4. py-bridge   — build the PyO3 bridge wheel via maturin
#   5. py-app      — install Python deps + DeAI worker code
#   6. runtime     — distroless-style minimal Debian slim with non-root user
#
# Build context is `services/core/core/` from `docker-compose.dev.yml`.
# Override the binary at runtime via CMD; sane testnet defaults included.
#
# Ports exposed (informational — actual publishing is done by compose):
#   8545  JSON-RPC HTTP
#   8546  JSON-RPC WebSocket
#   8080  health probe
#   9100  Prometheus metrics
#   30303 P2P (libp2p, TCP+QUIC)
# ----------------------------------------------------------------------------

ARG RUST_VERSION=1.81
ARG PYTHON_VERSION=3.11
ARG DEBIAN_VERSION=bookworm

# ----------------------------------------------------------------------------
# Stage 1 — chef: cargo-chef for dep-graph caching
# ----------------------------------------------------------------------------
FROM rust:${RUST_VERSION}-${DEBIAN_VERSION} AS chef

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential pkg-config libssl-dev clang cmake protobuf-compiler \
    && rm -rf /var/lib/apt/lists/* \
    && cargo install cargo-chef --locked --version ^0.1

# ----------------------------------------------------------------------------
# Stage 2 — planner: produce recipe.json from Cargo manifests only
# ----------------------------------------------------------------------------
FROM chef AS planner

COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ----------------------------------------------------------------------------
# Stage 3 — rust-builder: cook deps (cached), then build axionax-node
# ----------------------------------------------------------------------------
FROM chef AS rust-builder

# 3a. Cook dependencies — this layer is cached as long as recipe.json is unchanged.
COPY --from=planner /build/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    cargo chef cook --release --recipe-path recipe.json -p node

# 3b. Build the actual binary now that deps are warm.
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/target \
    cargo build --release -p node \
 && cp /build/target/release/axionax-node /usr/local/bin/axionax-node \
 && strip /usr/local/bin/axionax-node || true

# ----------------------------------------------------------------------------
# Stage 4 — py-bridge: build the PyO3 wheel via maturin
# ----------------------------------------------------------------------------
FROM rust:${RUST_VERSION}-${DEBIAN_VERSION} AS py-bridge

WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv build-essential pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --break-system-packages --no-cache-dir 'maturin>=1.7,<2'

COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    maturin build --release \
        --manifest-path bridge/rust-python/Cargo.toml \
        --out dist

# ----------------------------------------------------------------------------
# Stage 5 — py-app: install DeAI runtime deps + the bridge wheel
# ----------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim-${DEBIAN_VERSION} AS py-app

WORKDIR /app
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY deai/requirements.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

COPY --from=py-bridge /build/dist/*.whl /tmp/
RUN pip install /tmp/*.whl && rm -f /tmp/*.whl

COPY deai/ ./deai/

# ----------------------------------------------------------------------------
# Stage 6 — runtime: minimal final image (~120 MB)
# ----------------------------------------------------------------------------
FROM debian:${DEBIAN_VERSION}-slim AS runtime

ARG PYTHON_VERSION=3.11
ARG AXIONAX_HOME=/home/axionax

ENV DEBIAN_FRONTEND=noninteractive \
    AXIONAX_HOME=${AXIONAX_HOME} \
    PYTHONPATH=/usr/local/lib/python${PYTHON_VERSION}/site-packages:/app \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RUST_LOG=info,p2p=info,p2p::health=info,p2p::conn=info,p2p::identify=info

# Runtime deps only — no compilers, no -dev packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        libssl3 \
        python3 \
        curl \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (uid 1000) for least-privilege execution.
RUN groupadd --system --gid 1000 axionax \
 && useradd  --system --uid 1000 --gid axionax --home-dir ${AXIONAX_HOME} --create-home axionax

# Binary + Python runtime + DeAI app
COPY --from=rust-builder /usr/local/bin/axionax-node /usr/local/bin/axionax-node
COPY --from=py-app /usr/local/lib/python${PYTHON_VERSION}/site-packages \
                   /usr/local/lib/python${PYTHON_VERSION}/site-packages
COPY --from=py-app /app/deai /app/deai

# Symlink for legacy callers expecting axionax_node (underscore variant).
RUN ln -sf /usr/local/bin/axionax-node /usr/local/bin/axionax_node \
 && mkdir -p ${AXIONAX_HOME}/.axionax /app \
 && chown -R axionax:axionax ${AXIONAX_HOME} /app

USER axionax
WORKDIR ${AXIONAX_HOME}

# Persist chain state and node identity across container restarts.
VOLUME ["${AXIONAX_HOME}/.axionax"]

# Ports — see header comment for usage.
EXPOSE 8545 8546 8080 9100 30303

# Container-level liveness check via JSON-RPC.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
    CMD curl -fsS -X POST -H 'Content-Type: application/json' \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545/ >/dev/null || exit 1

# Use tini as PID 1 for proper signal forwarding to axionax-node.
ENTRYPOINT ["/usr/bin/tini", "--", "axionax-node"]
CMD ["--role", "full", \
     "--rpc", "0.0.0.0:8545", \
     "--state_path", "/home/axionax/.axionax/state", \
     "--chain_id", "86137"]
