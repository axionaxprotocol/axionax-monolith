# axionax Testnet Deployment Plan
**Date**: November 13, 2025  
**Status**: Phase 1 In Progress (78% Complete)  
**VPS**: vmi2895217 (217.216.109.5)

---

## 🎯 Executive Summary

Current infrastructure is 78% deployed (7/9 services operational) with MetaMask wallet integration successfully implemented. The existing VPS is suitable for testnet infrastructure services but not adequate for validator node operations due to resource constraints.

**Recommended Approach**: Hybrid deployment strategy focusing on completing current infrastructure while preparing separate validator node deployment.

---

## 📊 Current Status (November 13, 2025)

### ✅ Operational Services (7/9)
| Service | Port | Status | Uptime |
|---------|------|--------|--------|
| PostgreSQL | 5432 | ✅ Healthy | 44h+ |
| Redis | 6379 | ✅ Healthy | 44h+ |
| Nginx/SSL | 80/443 | ✅ Healthy | 44h+ |
| Mock RPC | 8545/8546 | ✅ Healthy | 18h+ |
| Grafana | 3030 | ✅ Healthy | 15h+ |
| Prometheus | 9090 | ✅ Running | 15h+ |
| Website | 3000 | ✅ Running | 23h+ |

### 🔧 Services Requiring Attention (2/9)
- **Explorer API** (Port 3001): Container running, service not responding
- **Faucet API** (Port 3002): Container running, service not responding

### ✅ Recent Achievements
- MetaMask wallet integration with AXX token support
- Auto-network configuration (Chain ID 86137)
- Web3 Context Provider and ConnectButton component
- Token terminology corrected (AXN → AXX per TOKENOMICS.md)
- Production builds verified and deployed

---

## 🚀 Deployment Strategy: Hybrid Approach

### Phase 1: Complete Infrastructure (Immediate - 1-2 Days) ⚡

**Priority 1: Fix Remaining Services**
- [ ] Debug and fix Explorer API (Port 3001)
  - Check RPC connection configuration
  - Verify database connectivity
  - Review container logs: `docker logs axionax-explorer-backend` (or `axionax-explorer-api` in dev)
  - Test: `curl -s http://localhost:3001/api/health`
  - **ถ้า image ไม่มีหรือไม่ขึ้น:** ใช้ stub จาก repo — `docker compose -f docker-compose.dev.yml up -d explorer-api` (build จาก `tools/devtools/Dockerfile.explorer`)

- [ ] Debug and fix Faucet API (Port 3002)
  - Verify wallet/key: ต้องตั้ง `FAUCET_PRIVATE_KEY` (hex 32 bytes)
  - Check RPC integration และ env `RPC_URL`, `PORT=3002`
  - Test: `curl -s http://localhost:3002/health`
  - **Build จาก source:** ใช้ `ops/deploy/Dockerfile.faucet` โดย build context = `core/` (ดู [TESTNET_READINESS.md](../../../TESTNET_READINESS.md))

**Priority 2: End-to-End Testing**
- [ ] MetaMask wallet connection flow
- [ ] Network auto-configuration (Chain ID 86137)
- [ ] Balance display and updates
- [ ] Faucet token distribution
- [ ] Explorer block/transaction viewing
- [ ] Cross-service integration testing

**Priority 3: Documentation**
- [ ] Quick Start Guide for developers
- [ ] MetaMask setup instructions
- [ ] API endpoint documentation
- [ ] Troubleshooting guide
- [ ] Network configuration details

**Target**: 100% infrastructure operational (9/9 services)

**ความพร้อมรวม (Checklist + Verify):** ดู [TESTNET_READINESS.md](../../../TESTNET_READINESS.md) ที่ root repo

---

### Phase 2: Enhanced Testnet Services (1 Week) 🔧

**Mock RPC Enhancements**
- [ ] Add smart contract deployment support
- [ ] Implement `eth_call` for contract interactions
- [ ] Add `eth_estimateGas` functionality
- [ ] Support event logs and filtering
- [ ] Implement transaction receipts
- [ ] Add debug/trace endpoints

**Developer Tools**
- [ ] Create dApp starter template
- [ ] Build example contracts (Token, NFT, DeFi)
- [ ] SDK usage examples
- [ ] Testing framework setup
- [ ] CI/CD pipeline documentation

**Monitoring & Alerts**
- [ ] Grafana dashboards for all services
- [ ] Prometheus alerting rules
- [ ] Service health checks automation
- [ ] Performance metrics tracking
- [ ] Error rate monitoring

---

### Phase 3: Validator Node Deployment (2-4 Weeks) 🏗️

**Infrastructure Planning**

**Option A: Cloud Provider (Recommended)**
- **Provider**: Hetzner Cloud
- **Instance**: CPX41 (8 vCPU, 16GB RAM, 240GB NVMe)
- **Cost**: ~€40/month (~$45 USD)
- **Location**: Europe (Germany) or US
- **Purpose**: Dedicated validator node

**Option B: AWS Alternative**
- **Instance**: t3.xlarge (4 vCPU, 16GB RAM)
- **Cost**: ~$150/month
- **Advantage**: Better global reach, managed services

**Option C: DigitalOcean Alternative**
- **Droplet**: CPU-Optimized (8 vCPU, 16GB RAM)
- **Cost**: ~$160/month
- **Advantage**: Simple management, good documentation

**Validator Node Setup**
- [ ] Provision new VPS (Hetzner CPX41 recommended)
- [ ] Install system dependencies (Rust, Docker, etc.)
- [ ] Build axionax-core from source
- [ ] Configure validator keys and credentials
- [ ] Setup systemd service for auto-restart
- [ ] Configure firewall and security
- [ ] Setup monitoring and logging

**Genesis Ceremony**
- [ ] Define genesis parameters
  - Chain ID: 86137 (testnet) / 86150 (mainnet future)
  - Initial validators: 1-3 nodes
  - Token allocation: Initial supply
  - Network parameters: Block time, gas limits
- [ ] Generate genesis.json
- [ ] Distribute to all validators
- [ ] Coordinate launch time (UTC timezone)
- [ ] Execute synchronized start
- [ ] Verify consensus achievement

**Network Integration**
- [ ] Connect validator to infrastructure VPS
- [ ] Configure RPC endpoints
- [ ] Setup peer discovery
- [ ] Enable WebSocket connections
- [ ] Test block production
- [ ] Verify transaction processing

---

### Phase 4: Public Testnet Launch (1-3 Months) 🌐

**Pre-Launch Checklist**
- [ ] All services 100% operational
- [ ] Validator node stable (3+ days uptime)
- [ ] Documentation complete
- [ ] Faucet operational with rate limits
- [ ] Explorer showing real-time data
- [ ] MetaMask integration tested
- [ ] Security audit completed

**Community Onboarding**
- [ ] Public announcement (Twitter, Discord, Telegram)
- [ ] Developer outreach program
- [ ] Bug bounty program launch
- [ ] Community validator recruitment
- [ ] Tutorial series publication
- [ ] Office hours / support channels

**Scale Strategy**
- [ ] Monitor network load
- [ ] Add validators as needed (target 5-10)
- [ ] Geographic distribution planning
- [ ] Load balancing RPC requests
- [ ] CDN for static assets
- [ ] Database optimization

---

## 💰 Cost Estimation

### Current VPS (vmi2895217)
- **Cost**: ~€20-30/month (~$25-35 USD)
- **Purpose**: Infrastructure services
- **Keep**: ✅ Yes (adequate for current services)

### New Validator VPS (Recommended: Hetzner CPX41)
- **Cost**: ~€40/month (~$45 USD)
- **Purpose**: Validator node operations
- **Timeline**: Provision in Week 3-4

### Total Monthly Cost
- **Phase 1-2**: $25-35/month (current VPS only)
- **Phase 3+**: $70-80/month (both VPS)

### Alternative: Free Tier Options
- **AWS Free Tier**: 12 months free (limited resources)
- **Google Cloud**: $300 credit (3 months)
- **Azure**: $200 credit (1 month)
- Consider for development/testing before production

---

## 📋 Detailed Task Breakdown

### Week 1: Infrastructure Completion
**Days 1-2**: Service Debugging
- Morning: Explorer API investigation
- Afternoon: Faucet API investigation
- Evening: Integration testing

**Days 3-4**: Testing & Documentation
- Morning: End-to-end testing
- Afternoon: Documentation writing
- Evening: Community preparation

**Days 5-7**: Polish & Preparation
- Code cleanup and optimization
- Security hardening
- Performance tuning
- Backup procedures

### Week 2-3: Enhanced Testnet
**Week 2**: Mock RPC Enhancement
- Smart contract support
- Additional RPC methods
- Testing framework
- Developer tools

**Week 3**: Developer Experience
- dApp examples
- Tutorial creation
- SDK documentation
- Video guides

### Week 4-6: Validator Deployment
**Week 4**: Infrastructure Setup
- VPS provisioning
- System configuration
- axionax-core build
- Testing environment

**Week 5**: Genesis Ceremony
- Parameter definition
- Validator coordination
- Genesis file creation
- Launch preparation

**Week 6**: Network Launch
- Synchronized start
- Monitoring and support
- Issue resolution
- Public announcement

---

## 🎯 Success Metrics

### Phase 1 Success Criteria
- ✅ 100% service uptime (9/9 operational)
- ✅ Explorer API response time < 500ms
- ✅ Faucet successfully distributes AXX tokens
- ✅ MetaMask auto-configures network
- ✅ All documentation complete

### Phase 2 Success Criteria
- ✅ Mock RPC supports smart contract deployment
- ✅ 3+ dApp examples published
- ✅ Developer feedback collected
- ✅ Grafana dashboards showing all metrics
- ✅ Zero critical bugs

### Phase 3 Success Criteria
- ✅ Validator node produces blocks consistently
- ✅ Genesis ceremony completed successfully
- ✅ Network achieves consensus (>2/3 validators)
- ✅ RPC endpoints serve real blockchain data
- ✅ 99%+ uptime over 7 days

### Phase 4 Success Criteria
- ✅ 10+ active developers building on testnet
- ✅ 5-10 validator nodes operational
- ✅ 100+ daily active users
- ✅ 1000+ transactions processed
- ✅ Zero security incidents

---

## 🚨 Risk Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| VPS downtime | High | Low | Monitoring, auto-restart, backups |
| Validator crash | High | Medium | Redundant validators, quick recovery |
| Network partition | Medium | Low | Peer diversity, monitoring |
| Smart contract bugs | Medium | Medium | Audits, testing, bug bounty |
| DDoS attack | High | Medium | Rate limiting, CDN, firewall |

### Resource Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| VPS resource exhaustion | High | Medium | Monitoring, auto-scaling plan |
| Cost overrun | Low | Low | Budget tracking, cost alerts |
| Insufficient validators | Medium | Medium | Community incentives |

### Timeline Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Service debugging delays | Low | High | Already 78% complete, focused effort |
| Validator setup complexity | Medium | Medium | Detailed documentation, testing |
| Community adoption slow | Low | Medium | Marketing, incentives, partnerships |

---

## 📞 Support & Communication

### Development Team Channels
- **GitHub**: https://github.com/axionaxprotocol/axionax-core
- **Issues**: Track progress and bugs
- **Discussions**: Technical Q&A
- **Pull Requests**: Code review process

### Community Channels (To Setup)
- **Discord**: Developer support, announcements
- **Telegram**: Community chat, quick updates
- **Twitter**: Public announcements, marketing
- **Medium/Blog**: Technical articles, tutorials

### Documentation Sites
- **Main Docs**: https://docs.axionax.org
- **API Reference**: In progress
- **Tutorials**: To be created
- **Network Status**: Grafana dashboards

---

## 🔄 Review & Adjustment

### Weekly Reviews
- **Every Monday**: Progress assessment
- **Metrics Review**: Service uptime, performance
- **Issue Triage**: Prioritize blockers
- **Timeline Adjustment**: Update estimates

### Monthly Reviews
- **Budget Review**: Cost tracking
- **Community Feedback**: Developer surveys
- **Feature Requests**: Prioritization
- **Roadmap Updates**: Adjust based on learnings

---

## ✅ Next Immediate Actions (24-48 Hours)

1. **Debug Explorer API** (Priority 1)
   ```bash
   ssh root@217.216.109.5
   docker logs axionax-explorer-api
   # Check RPC configuration
   # Verify database connectivity
   ```

2. **Debug Faucet API** (Priority 1)
   ```bash
   docker logs axionax-faucet-api
   # Check wallet configuration
   # Verify RPC integration
   ```

3. **Test MetaMask Integration** (Priority 2)
   - Open http://217.216.109.5:3000
   - Click "Connect Wallet"
   - Verify network auto-configuration
   - Test balance display

4. **Document Current Setup** (Priority 2)
   - Network configuration (Chain ID 86137)
   - RPC endpoints
   - Explorer URL
   - Faucet URL

5. **Prepare for Phase 2** (Priority 3)
   - Research Hetzner pricing
   - Plan validator node specs
   - Draft genesis ceremony steps

---

## 📝 Conclusion

The axionax testnet deployment is proceeding well with 78% infrastructure completion. The recommended hybrid approach allows us to:

1. **Quickly complete** remaining infrastructure (1-2 days)
2. **Enhance developer experience** with improved tools (1 week)
3. **Deploy production validator** on dedicated VPS (2-4 weeks)
4. **Launch public testnet** with community participation (1-3 months)

This phased approach minimizes risk, controls costs, and ensures a stable foundation for mainnet preparation.

**Total Estimated Timeline**: 6-10 weeks to full public testnet  
**Total Estimated Cost**: $70-80/month operational costs  
**Expected Outcome**: Production-ready testnet with active developer community

---

**Document Version**: 1.0  
**Last Updated**: November 13, 2025  
**Next Review**: November 20, 2025  
**Owner**: axionax Protocol Core Team
