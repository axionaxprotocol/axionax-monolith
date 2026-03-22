# axionax Environments

Environment-specific configurations and deployment files for axionax Core.

## Directory structure

```
environments/
├── mainnet/              # Reserved (not launched)
├── testnet/
│   └── public/           # Canonical public testnet (Docker Compose, genesis, scripts)
├── config.example.yaml   # Example configuration template
└── docker-compose.yaml   # Generic compose (optional local stack)
```

## Testnet

- **Chain ID:** 86137 (`0x15079`)
- **Purpose:** Development, integration, and VPS-style deployment
- **Entry point:** [testnet/public/README.md](./testnet/public/README.md)

## Mainnet

- **Chain ID:** 86150 (reserved, not launched)
- Verify official network info at https://axionax.org/networks

## Configuration

```bash
cp config.example.yaml config.yaml
# Edit config.yaml
```

## Docker (generic)

From this directory:

```bash
docker compose up -d
```

For the **public testnet** stack, use `testnet/public/docker-compose.yaml` (see that folder’s README).

## Documentation

- [Public testnet](./testnet/public/README.md)
- [Main docs](../../docs/)

## Security

See project `SECURITY.md` / `docs/SECURITY.md` and report issues to security@axionax.org.
