# axionax V1.6 Testnet in a Box

## Description
This system allows you to run the complete axionax V1.6 Testnet on a single machine using Docker Compose

## Structure
- `Dockerfile` builds the node from Rust
- `docker-compose.yml` runs all services (node, deployer, faucet, UI, blockscout, postgres)
- `deployer/` scripts for deploying contracts and verifying RPC
- `faucet/` API for distributing native/erc20 tokens
- `ui/` web UI and nginx config

## Usage
1. Create a `.env` file using `.env.example` as a reference
2. Build and run
   ```bash
   docker-compose build
   docker-compose up -d
   ```
3. Check status
   ```bash
   docker-compose ps
   ```
4. Test faucet
   ```bash
   curl 'http://127.0.0.1:8081/request?address=YOUR_ADDRESS'
   curl 'http://127.0.0.1:8081/request-erc20?address=YOUR_ADDRESS'
   ```
5. Access the web UI at http://127.0.0.1:8080

## Notes
- To redeploy the contract, use `deployer/deploy_token.js`
- Configuration can be customized as needed

## Contact / Report Issues
Please report issues via the GitHub repository
