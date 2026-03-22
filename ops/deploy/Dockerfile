# Stage 1: Rust Builder
# This stage compiles the Rust core application into a static binary.
# Use stable (or 1.75+) — node crate builds binary axionax-node from src/main.rs.
FROM rust:1.86-slim-bookworm as rust-builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libssl-dev

# Copy the entire project structure (context is usually core/ from compose)
COPY . .

# Build the axionax-node binary (node crate has [[bin]] name = "axionax-node")
WORKDIR /build
RUN cargo build --release -p node

# Stage 2: Python Bridge Builder (Maturin)
# This stage uses a Rust base image because it needs BOTH cargo and python.
FROM rust:1.86-slim-bookworm as python-bridge-builder

WORKDIR /build

# Install pip, then maturin for building Rust-based Python packages
RUN apt-get update && apt-get install -y --no-install-recommends python3-pip && \
    pip install --break-system-packages maturin

# Copy the entire project context
COPY . .

# Build the Python wheel for our Rust bridge
# We explicitly point to the manifest path
RUN maturin build --release --manifest-path bridge/rust-python/Cargo.toml --out dist

# Stage 3: Python App Builder
# This stage prepares the final Python application environment.
FROM python:3.11-slim-bookworm as python-app-builder

WORKDIR /app

# Install Python dependencies from requirements.txt
COPY deai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built Python wheel from the bridge-builder stage
COPY --from=python-bridge-builder /build/dist/*.whl .

# Install our Rust bridge wheel
RUN pip install --no-cache-dir *.whl

# Copy Python source code
COPY deai/ ./deai/

# Stage 4: Final Production Image
# This stage combines the Rust binary and Python app into a small final image.
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN addgroup --system --gid 1000 axionax && \
    adduser --system --uid 1000 --gid 1000 axionax

# Set working directory
WORKDIR /home/axionax

# Node binary: axionax-node from node crate [[bin]]
COPY --from=rust-builder /build/target/release/axionax-node /usr/local/bin/axionax-node
RUN ln -sf /usr/local/bin/axionax-node /usr/local/bin/axionax_node

# Copy the Python application and installed modules from the python-app-builder stage
COPY --from=python-app-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-app-builder /app/deai /app/deai

# Set ownership
RUN chown -R axionax:axionax /home/axionax /app /usr/local/bin/axionax-node /usr/local/bin/axionax_node

# Switch to the non-root user
USER axionax

# Set PYTHONPATH so Python can find our modules
ENV PYTHONPATH=/usr/local/lib/python3.11/site-packages:/app

# Create data directory
RUN mkdir -p /home/axionax/.axionax

# Expose necessary ports
EXPOSE 8545 8000 30303

# Default: full node on testnet; compose overrides with --role, --chain, etc.
ENTRYPOINT ["axionax-node"]
CMD ["--role", "full", "--rpc", "0.0.0.0:8545", "--state_path", "/home/axionax/.axionax/state", "--chain_id", "86137"]
