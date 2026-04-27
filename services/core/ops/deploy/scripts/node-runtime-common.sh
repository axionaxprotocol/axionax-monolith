#!/usr/bin/env bash
# shellcheck shell=bash
# Shared helpers for axionax-node-bootstrap.sh and run-full-node.sh.
# Do not execute directly; use: source "$(dirname "$0")/node-runtime-common.sh"

# When sourced: BASH_SOURCE[0] is this file; parent dir is scripts/.
axionax_resolve_paths() {
  local _here
  _here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  AXIONAX_SCRIPTS_DIR="${AXIONAX_SCRIPTS_DIR:-$_here}"
  AXIONAX_DEPLOY_DIR="$(cd "$AXIONAX_SCRIPTS_DIR/.." && pwd)"
  AXIONAX_REPO_ROOT="${AXIONAX_REPO_ROOT:-$(cd "$AXIONAX_DEPLOY_DIR/../.." && pwd)}"
  AXIONAX_CORE_DIR="$AXIONAX_REPO_ROOT/core"
  AXIONAX_NODE_BIN="${AXIONAX_NODE_BIN:-$AXIONAX_CORE_DIR/target/release/axionax-node}"
  AXIONAX_DEFAULT_GENESIS="${AXIONAX_DEFAULT_GENESIS:-$AXIONAX_CORE_DIR/tools/genesis.json}"
}

axionax_require_binary() {
  if [[ ! -x "$AXIONAX_NODE_BIN" ]]; then
    echo "error: axionax-node not found or not executable: $AXIONAX_NODE_BIN" >&2
    echo "  Run: $AXIONAX_SCRIPTS_DIR/axionax-node-bootstrap.sh build" >&2
    return 1
  fi
}

axionax_require_genesis_src() {
  if [[ ! -f "$AXIONAX_DEFAULT_GENESIS" ]]; then
    echo "error: genesis not found: $AXIONAX_DEFAULT_GENESIS" >&2
    echo "  Set AXIONAX_DEFAULT_GENESIS or clone repo with core/tools/genesis.json" >&2
    return 1
  fi
}
