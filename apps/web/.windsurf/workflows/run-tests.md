---
description: Run Test Suite for Axionax Protocol
---

# Run Tests Workflow

This workflow guides you through running the test suite for the Axionax Protocol.

## Prerequisites

- Development environment is set up
- All dependencies are installed
- Blockchain node is running (for integration tests)

## Steps

1. **Run Unit Tests**

   ```bash
   pnpm test
   ```

   - Run all unit tests across packages
   - Verify all tests pass
   - Check test coverage report

2. **Run Integration Tests**

   ```bash
   pnpm test:integration
   ```

   - Ensure blockchain node is running
   - Test SDK integration with blockchain
   - Verify DeAI worker job lifecycle
   - Check wallet connection flows

3. **Run E2E Tests**

   ```bash
   pnpm test:e2e
   ```

   - Start all services (blockchain, worker, web)
   - Execute full user journey tests
   - Verify KPI metrics are met
   - Check for any regressions

4. **Run Linting**

   ```bash
   pnpm lint
   ```

   - Check code style compliance
   - Fix any linting errors
   - Verify TypeScript types

5. **Generate Coverage Report**
   ```bash
   pnpm test:coverage
   ```

   - Review coverage metrics
   - Identify untested code paths
   - Ensure critical paths have > 80% coverage

## Verification

- All unit tests pass
- All integration tests pass
- All E2E tests pass
- No linting errors
- Coverage meets requirements
