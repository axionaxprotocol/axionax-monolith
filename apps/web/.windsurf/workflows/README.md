# Windsurf Workflows

This directory contains workflow definitions for the Axionax Protocol project. These workflows provide step-by-step guidance for common development and deployment tasks.

## Available Workflows

### `/deploy-testnet` - Deploy to Public Testnet

Guides you through deploying the Axionax Protocol to a public testnet environment, including infrastructure setup, blockchain deployment, DeAI worker configuration, and monitoring setup.

**Use when:** You need to deploy the protocol to a testnet environment.

### `/setup-dev` - Setup Local Development Environment

Guides you through setting up a local development environment, including dependency installation, service startup, and environment configuration.

**Use when:** You need to set up a fresh development machine or onboard a new developer.

### `/run-tests` - Run Test Suite

Guides you through running the complete test suite, including unit tests, integration tests, E2E tests, and coverage reporting.

**Use when:** You need to verify code changes or prepare for a deployment.

## How to Use

In the Windsurf IDE, you can invoke these workflows using slash commands:

- Type `/deploy-testnet` to start the testnet deployment workflow
- Type `/setup-dev` to start the development setup workflow
- Type `/run-tests` to start the testing workflow

## Adding New Workflows

To add a new workflow:

1. Create a new `.md` file in this directory
2. Add YAML frontmatter with a `description` field
3. Write the workflow steps in markdown format
4. Use `// turbo` annotation for steps that can be auto-run

Example:

```yaml
---
description: Short description of the workflow
---
# Workflow Title

## Steps

1. Step one
// turbo
2. Step two
3. Step three
```
