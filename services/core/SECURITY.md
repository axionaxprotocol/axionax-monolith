# Security Policy

## Supported Versions

We release security updates for the following branches:

| Branch  | Supported          |
|---------|--------------------|
| main    | Yes                |
| develop | Yes (pre-release)  |
| older   | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability in **axionax-core-universe** (blockchain core, node, RPC, DeAI worker, ops/deploy, or tooling), please report it responsibly.

**Do not** open a public GitHub issue for security-sensitive findings.

1. **Email:** Send details to the maintainers (e.g. via the contact listed on [axionax.org](https://axionax.org) or the organization profile).
2. **Include:** Description of the issue, steps to reproduce, impact, and suggested fix if any.
3. **Response:** We aim to acknowledge within 72 hours and will work with you on a fix and disclosure timeline.

We appreciate your help in keeping the protocol and its users safe.

## Security-Related Documentation

- [SECURITY_AUDIT.md](core/docs/SECURITY_AUDIT.md) — Audit scope and practices
- [RUNBOOK.md](core/docs/RUNBOOK.md) — Operational security and incident response
- Never commit `.env`, `worker_key.json`, `*.keystore`, or private keys; see [.gitignore](.gitignore).
