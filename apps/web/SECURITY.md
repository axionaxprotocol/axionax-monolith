# Security Policy

## Supported Versions

We take security seriously and actively maintain the following versions:

| Version | Supported          | Status           |
| ------- | ------------------ | ---------------- |
| 1.8.x   | :white_check_mark: | Active (Testnet) |
| 1.7.x   | :x:                | End of Life      |
| 1.6.x   | :x:                | End of Life      |
| < 1.6   | :x:                | End of Life      |

**Note**: Only the latest testnet version (1.8.x) receives security updates.

---

## Reporting a Vulnerability

We value the security community and believe in responsible disclosure. If you discover a security vulnerability, please help us protect our users.

### 🔒 Private Disclosure Process

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please use one of the following methods:

#### 1. GitHub Security Advisory (Preferred)

1. Go to the [Security tab](https://github.com/axionaxprotocol/axionax-web-universe/security)
2. Click "Report a vulnerability"
3. Fill out the form with details

#### 2. Email

Send details to: **security@axionax.org**

Encrypt sensitive information using our PGP key (available upon request).

#### 3. Discord (For urgent issues)

Direct message to: `@security-team` in our Discord server

- Join: https://discord.gg/axionax
- Request private channel for disclosure

---

## What to Include in Your Report

Please provide as much information as possible:

```markdown
### Vulnerability Details

- **Type**: (e.g., XSS, SQL Injection, Authentication bypass)
- **Component**: (e.g., Web Frontend, Explorer API, Smart Contract)
- **Severity**: (Critical / High / Medium / Low)

### Environment

- **Version**: (e.g., v1.8.0-testnet)
- **Browser/Client**: (if applicable)
- **Network**: (testnet/mainnet)

### Steps to Reproduce

1. Step one
2. Step two
3. ...

### Impact

Description of what an attacker could achieve

### Proof of Concept

- Screenshots
- Video recording
- Code snippet
- Request/Response logs

### Suggested Fix (Optional)

Your recommendation for remediation
```

---

## Response Timeline

We commit to the following response times:

| Severity | First Response | Status Update | Fix Timeline |
| -------- | -------------- | ------------- | ------------ |
| Critical | 24 hours       | Every 48h     | 7 days       |
| High     | 48 hours       | Weekly        | 30 days      |
| Medium   | 5 days         | Bi-weekly     | 90 days      |
| Low      | 7 days         | Monthly       | Best effort  |

### Severity Definitions

**Critical**

- Remote code execution
- Unauthorized fund access
- Complete system compromise
- Database breach

**High**

- Authentication bypass
- Privilege escalation
- Data exposure
- DoS affecting all users

**Medium**

- XSS or CSRF vulnerabilities
- Information disclosure
- Limited DoS
- Security misconfiguration

**Low**

- Minor information leakage
- Theoretical vulnerabilities
- Best practice violations

---

## Security Measures

### Current Security Practices

#### Infrastructure

- ✅ HTTPS/TLS 1.3 encryption on all endpoints
- ✅ Rate limiting on all API endpoints
- ✅ DDoS protection via Cloudflare
- ✅ Regular security audits
- ✅ Automated dependency scanning
- ✅ Firewall rules (UFW/iptables)
- ✅ SSH key-only authentication

#### Application Security

- ✅ Input validation and sanitization
- ✅ CORS policies properly configured
- ✅ CSP (Content Security Policy) headers
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React's built-in escaping)
- ✅ CSRF tokens for state-changing operations
- ✅ Secure session management
- ✅ Password hashing (bcrypt/argon2)

#### Smart Contracts

- ✅ Audited by professional firms
- ✅ OpenZeppelin battle-tested libraries
- ✅ Reentrancy guards
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Access control patterns
- ✅ Emergency pause mechanism

#### Dependency audit

- Run `pnpm security:audit` (or `pnpm audit --audit-level=moderate`) regularly.
- As of the latest audit, **2 vulnerabilities** remain (both in `apps/web`): Next.js DoS issues fixed only in Next 15 (>=15.0.8 and >=15.5.10). Upgrading to Next 15 and React 19 will resolve them; we stay on Next 14 for React 18 compatibility until that upgrade is planned.

#### Monitoring

- ✅ Real-time alerting (Prometheus + Grafana)
- ✅ Error tracking (Sentry)
- ✅ Log aggregation
- ✅ Intrusion detection
- ✅ Uptime monitoring

---

## Bug Bounty Program

### 🎁 Rewards (Testnet Phase)

We offer rewards for valid security vulnerabilities:

| Severity | Reward Range     | Eligibility                    |
| -------- | ---------------- | ------------------------------ |
| Critical | $5,000 - $10,000 | Smart contracts, core protocol |
| High     | $1,000 - $5,000  | Backend services, APIs         |
| Medium   | $250 - $1,000    | Frontend, DoS vulnerabilities  |
| Low      | $50 - $250       | Information disclosure         |

**Payment Methods**:

- AXX tokens (vested)
- USDC/USDT
- ETH

### Eligibility Requirements

To be eligible for a reward:

- ✅ Be the first to report the vulnerability
- ✅ Follow responsible disclosure guidelines
- ✅ Provide sufficient detail to reproduce
- ✅ Do not exploit the vulnerability
- ✅ Do not publicly disclose before patch
- ✅ Allow us reasonable time to fix (90 days)

### Out of Scope

The following are **NOT** eligible for rewards:

- ❌ Known issues already in our backlog
- ❌ Issues in third-party dependencies (report to them)
- ❌ Social engineering attacks
- ❌ Physical attacks on infrastructure
- ❌ DoS attacks that require significant resources
- ❌ Spam or brute force attacks
- ❌ Issues affecting outdated browsers
- ❌ Theoretical vulnerabilities without PoC
- ❌ Vulnerabilities found in testnet faucet (intentionally less secure)

---

## Security Audits

### Completed Audits

| Date    | Auditor | Scope             | Report  |
| ------- | ------- | ----------------- | ------- |
| 2026 Q3 | TBD     | Smart Contracts   | Planned |
| 2026 Q3 | TBD     | Protocol Security | Planned |

### Upcoming Audits

- **Smart Contracts**: Trail of Bits (Q3 2026)
- **Protocol Security**: OpenZeppelin (Q3 2026)
- **Infrastructure**: Independent security firm (Q4 2026)

---

## Security Best Practices for Users

### For Regular Users

- ✅ Never share your private keys
- ✅ Use hardware wallets for large amounts
- ✅ Verify URLs before connecting wallet
- ✅ Be cautious of phishing attempts
- ✅ Keep software updated
- ✅ Use strong, unique passwords

### For Developers

- ✅ Review smart contracts before interaction
- ✅ Test thoroughly on testnet first
- ✅ Use established libraries (OpenZeppelin)
- ✅ Implement proper error handling
- ✅ Follow secure coding guidelines
- ✅ Keep dependencies updated

### For Validators

- ✅ Secure your validator keys
- ✅ Use dedicated hardware
- ✅ Implement monitoring and alerts
- ✅ Regular security updates
- ✅ Follow the [Validator Setup Guide](./apps/docs/VALIDATOR_SETUP_GUIDE.md)
- ✅ Review [Operations Runbook](./apps/docs/RUNBOOK.md)

---

## Incident Response

In case of a security incident:

1. **Detection**: Issue identified (automated or reported)
2. **Assessment**: Evaluate severity and impact
3. **Containment**: Isolate affected systems
4. **Notification**: Alert affected users (if applicable)
5. **Resolution**: Deploy fix and verify
6. **Post-mortem**: Document and learn

### Emergency Contacts

- **Security Team**: security@axionax.org
- **Discord**: @security-team (for urgent issues)
- **Status Page**: https://status.axionax.org

---

## Security Updates

Subscribe to security notifications:

- **GitHub Watch**: Enable "Security alerts"
- **Discord**: #security-announcements channel
- **Twitter**: [@axionax](https://twitter.com/axionax)
- **Email**: Subscribe at https://axionax.org/subscribe

---

## Hall of Fame

We recognize security researchers who help us:

| Researcher       | Date | Vulnerability | Severity |
| ---------------- | ---- | ------------- | -------- |
| _Your name here_ | -    | -             | -        |

---

## Security Checklist for Contributors

Before submitting code:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] Authentication/authorization checks
- [ ] SQL injection prevention
- [ ] XSS protection applied
- [ ] CSRF protection for state changes
- [ ] Error messages don't leak sensitive info
- [ ] Secure dependencies (no known vulnerabilities)
- [ ] Tests cover security scenarios
- [ ] Documentation updated

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Blockchain Security Resources](https://github.com/crytic/awesome-ethereum-security)

---

## Compliance

Axionax complies with:

- ✅ GDPR (General Data Protection Regulation)
- ✅ SOC 2 Type II (in progress)
- ✅ ISO 27001 (planned)

---

## Contact

For security-related questions:

- **Email**: security@axionax.org
- **Discord**: https://discord.gg/axionax (#security)
- **GitHub**: Open a Security Advisory

---

**Last Updated**: December 5, 2025 | v1.8.0-testnet

_This security policy is subject to change. Please check back regularly for updates._
