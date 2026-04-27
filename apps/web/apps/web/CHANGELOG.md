# Changelog

All notable changes to Axionax Web will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2025-12-11

### Updated to v1.9.0

- All documentation updated to v1.9.0
- Infrastructure status: 100% operational
- Protocol compliance verified

## [2.0.0] - 2025-12-05

### Updated to v1.8.0

- All documentation updated to v1.8.0
- Infrastructure status: 100% operational
- Protocol compliance verified

## [2.0.0] - 2025-11-20

### 🎉 Major Release: Testnet Launch

#### Added

- ✅ **Testnet deployment** at https://axionax.org with SSL/HTTPS
- 🌍 **2 validators online** (EU: 217.76.61.116, AU: 46.250.244.4)
- 📊 **Live metrics dashboard** with real-time block height (5s refresh)
- 🔄 **TanStack Query v5** integration for server state management
- 🎨 **React 19** with Server Components support
- 🏪 **Zustand** for global state management
- 🔌 **Nginx reverse proxy** for HTTPS → HTTP RPC communication
- 📱 **Mobile-first Tailwind design** with accessibility features
- 🚀 **One-command deployment** script for VPS

#### Changed

- **Refactored repository structure** for better maintainability:
  - Moved all deployment scripts to `scripts/` directory (11 files)
  - Moved documentation to `docs/` directory (6 files)
  - Created comprehensive `scripts/README.md` guide
- **Modernized `Statistics` component**:
  - Replaced `useState`/`useEffect` with TanStack Query hooks
  - Added proper TypeScript interfaces
  - Implemented 5-second polling for live data
- **Updated main README.md**:
  - Current testnet status and infrastructure
  - Modern tech stack documentation
  - Improved project structure visualization
  - Better deployment instructions
- **Web3 integration**:
  - Updated RPC endpoints to use HTTPS proxy
  - Improved validator connectivity with fallback logic
  - Enhanced MetaMask network configuration

#### Fixed

- Mixed-content security warnings (HTTPS → HTTP RPC)
- Validator metrics displaying 0/2 instead of actual status
- 404 errors on `/rpc/eu` and `/rpc/au` endpoints
- Empty Props interface ESLint warnings

#### Removed

- Duplicate `CNAME` files (kept only in `public/`)
- Outdated infrastructure status documentation

### Technical Improvements

- Cleaner codebase following Copilot Instructions
- Better separation of concerns (scripts, docs, source code)
- Improved developer experience with organized structure
- Enhanced deployment workflow

---

## [1.8.0] - 2025-11-15

### Added

- Cross-platform installation scripts
- ESLint and Prettier configurations
- EditorConfig for consistent coding style
- MIT License
- Git line ending normalization (.gitattributes)

### Changed

- Updated dependencies to latest versions
- Improved code organization

## [1.0.0] - 2025-10-01

### Added

- Initial web interface release
- Wallet connection
- Transaction history
- Network status display
- Responsive design
