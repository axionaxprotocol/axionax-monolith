# Axionax Testnet Faucet API 💧

Distributes testnet AXX tokens to users for testing purposes.

## Features

- 🔒 Rate limiting (10 requests/15 min per IP)
- ⏰ Cooldown tracking (24 hours per address)
- 📦 Redis support (with in-memory fallback)
- 🔗 Ethers v6 integration
- 🐳 Docker ready

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and configure
cp .env.example .env
# Edit .env and add FAUCET_PRIVATE_KEY

# Run dev server
npm run dev
```

## API Endpoints

### GET /health

Check faucet status and balance.

```bash
curl https://axionax.org/faucet/health
```

Response:

```json
{
  "ok": true,
  "blockNumber": 407300,
  "chainId": 86137,
  "faucetAddress": "0x...",
  "faucetBalance": "10000.0",
  "cooldownHours": 24,
  "faucetAmount": "10"
}
```

### GET /request?address=0x...

Request testnet AXX tokens.

```bash
curl "https://axionax.org/faucet/request?address=0xYourAddress"
```

Success:

```json
{
  "ok": true,
  "hash": "0x...",
  "blockNumber": 407301,
  "amount": "10",
  "symbol": "AXX",
  "to": "0x...",
  "message": "Successfully sent 10 AXX!"
}
```

Cooldown:

```json
{
  "ok": false,
  "error": "Please wait 23 hours before requesting again",
  "cooldownHours": 23
}
```

### GET /stats

Get faucet statistics.

```bash
curl https://axionax.org/faucet/stats
```

## Environment Variables

| Variable           | Default                  | Description                  |
| ------------------ | ------------------------ | ---------------------------- |
| PORT               | 3002                     | Server port                  |
| RPC_URL            | https://axionax.org/rpc/ | Blockchain RPC endpoint      |
| CHAIN_ID           | 86137                    | Chain ID                     |
| FAUCET_PRIVATE_KEY | (required)               | Private key of faucet wallet |
| FAUCET_AMOUNT      | 10                       | Amount to send per request   |
| COOLDOWN_HOURS     | 24                       | Hours between requests       |
| REDIS_URL          | redis://localhost:6379   | Redis connection URL         |
| CORS_ORIGINS       | https://axionax.org      | Allowed CORS origins         |

## Docker

```bash
# Build
docker build -t axionax-faucet .

# Run
docker run -d \
  --name axionax-faucet \
  -p 3002:3002 \
  -e FAUCET_PRIVATE_KEY=0x... \
  -e RPC_URL=https://axionax.org/rpc/ \
  axionax-faucet
```

## Production Deployment

See deployment guide in `/ops/deploy/` for production setup with Nginx and SSL.

## Security Notes

- Keep `FAUCET_PRIVATE_KEY` secure
- Use Redis for distributed rate limiting in production
- Configure CORS to only allow your domains
- Monitor faucet balance

---

Part of the [Axionax Protocol](https://axionax.org) ecosystem.
