---
description: Setup Local Development Environment
---

# Local Development Setup Workflow

This workflow guides you through setting up a local development environment for the Axionax Protocol.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager installed
- Python 3.10+ installed (for DeAI Worker)
- Docker installed (optional, for containerized development)

## Steps

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Setup Environment Variables**
   - Copy `.env.example` to `.env`
   - Configure required variables for blockchain, database, and AI services

3. **Start Blockchain Node**

   ```bash
   pnpm --filter @axionax/node dev
   ```

   - Verify block production is active
   - Check logs for any errors

4. **Start DeAI Worker**

   ```bash
   cd packages/worker
   pip install -r requirements.txt
   python worker.py
   ```

   - Verify worker connects to blockchain
   - Test job execution with Gemini Flash

5. **Start Web Application**

   ```bash
   pnpm --filter @axionax/web dev
   ```

   - Open browser to localhost (default port)
   - Verify wallet connection works
   - Test basic UI interactions

6. **Start Indexer** (if needed)
   ```bash
   pnpm --filter @axionax/indexer dev
   ```

   - Verify indexer is syncing blocks
   - Check database connectivity

## Verification

- Blockchain node producing blocks
- DeAI worker connected and ready
- Web application accessible
- No errors in console logs
- Wallet can connect successfully
