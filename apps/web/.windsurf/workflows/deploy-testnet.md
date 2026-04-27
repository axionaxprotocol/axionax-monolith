---
description: Deploy Axionax Protocol to Public Testnet
---

# Deploy to Testnet Workflow

This workflow guides you through deploying the Axionax Protocol to a public testnet environment.

## Prerequisites

- Ensure you have access to the VPS server
- Verify Google Cloud credits are available
- Read the deployment documentation in `apps/docs/TESTNET_DEPLOYMENT_PLAN.md`

## Steps

1. **Review Deployment Plan**
   - Read `apps/docs/TESTNET_DEPLOYMENT_PLAN.md`
   - Review `apps/docs/TESTNET_LAUNCH.md` checklist
   - Verify all KPI targets are understood

2. **Prepare Infrastructure**
   - Run the deployment script: `./deploy-vps.ps1`
   - Verify the script is idempotent
   - Ensure health checks are in place via `health-check.sh`

3. **Configure Network**
   - Open Validator port 30333
   - Firewall-protect RPC ports 9933/9944 or enable SSL-only access
   - Verify Genesis Validator is running with 99.9% uptime requirement

4. **Deploy Blockchain Layer**
   - Start the Substrate node
   - Verify block production is active (< 3.0 second target)
   - Check finality time (< 6.0 seconds)
   - Monitor transaction throughput (> 1,000 TPS peak)

5. **Deploy DeAI Worker**
   - Connect Python Worker to Blockchain using `packages/sdk`
   - Implement Job Lifecycle: Submit -> Assign -> Execute -> Submit Result -> Verify
   - Configure Gemini Flash for inference
   - Measure and log full cycle time

6. **Deploy Web Application**
   - Deploy `apps/web` to the web server
   - Verify wallet connection (MetaMask/Rabby)
   - Check page load time (< 1.5 seconds FCP)
   - Monitor API error rate (< 1%)

7. **Setup Monitoring**
   - Configure observability dashboard
   - Setup alerts for KPI breaches
   - Verify all metrics are being tracked

8. **Run E2E Tests**
   - Execute automated end-to-end tests
   - Verify all components are functioning
   - Check blockchain connectivity
   - Validate DeAI job execution

9. **Stress Test** (Optional)
   - Run stress test script to simulate high load
   - Submit 10,000 transactions
   - Submit 500 concurrent AI jobs
   - Verify system stability under load

## Verification

- Block time < 3.0 seconds
- Job success rate > 95%
- Worker response time < 500ms
- Inference latency < 5.0 seconds
- Page load time < 1.5 seconds
- Wallet connect success 100%
- API error rate < 1%
