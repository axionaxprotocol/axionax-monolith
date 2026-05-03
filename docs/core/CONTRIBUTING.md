# Contributing to Axionax Core Universe

Thank you for contributing. This document explains how to set up, test, and submit changes.

## Quick start

1. **Fork** the repository on GitHub.
2. **Clone** your fork and add upstream:
   ```bash
   git clone https://github.com/YOUR_USERNAME/axionax-core-universe.git
   cd axionax-core-universe
   git remote add upstream https://github.com/axionaxprotocol/axionax-core-universe.git
   ```
3. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature
   ```
4. **Make changes**, then **test** and **lint** (see below).
5. **Commit** with a clear message and **push** to your fork.
6. **Open a Pull Request** against `main` with a short description and any related issue.

## Development setup

- **Rust:** 1.70+ (`rustup` recommended).  
  On Windows, full Rust build may require LLVM/Clang for some crates; set `LIBCLANG_PATH` if needed.
- **Python:** 3.10+ for `core/deai` (see `core/deai/requirements.txt`).
- **Docker:** Optional, for deployment and local stack.

```bash
# From repo root
cd core
cargo build
cd deai && pip install -r requirements.txt
```

## Testing

Run tests before submitting:

```bash
# Rust (from core/)
cd core
cargo test --workspace

# Python DeAI (from core/deai/)
cd core/deai
python -m pytest . -v --tb=short --ignore=tests
```

See the main [README](README.md#testing--verification) for more test commands and notes (e.g. Windows, skipped tests).

## Code style

- **Rust:** `cargo fmt --all` and `cargo clippy --workspace -- -D warnings`.
- **Python:** Prefer type hints and docstrings; follow existing patterns in `core/deai`.
- **Docs:** Use English for new docs and comments in `core/docs/` and configs.

## Pull request guidelines

- Keep PRs focused; prefer several small PRs over one large one.
- Update docs if you change behavior or add options.
- Ensure CI (if run) and local tests pass.

## Documentation

- Architecture and network docs: [core/docs/](core/docs/README.md).
- Main docs index: [README — Documentation](README.md#-documentation).

## Questions

- **Issues:** [GitHub Issues](https://github.com/axionaxprotocol/axionax-core-universe/issues).
- **Website:** [axionax.org](https://axionax.org).

Thanks for contributing.
