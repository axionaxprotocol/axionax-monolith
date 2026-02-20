#!/bin/bash
# Update node — run on this machine (any machine on the network, no IP needed)
# Usage: ./scripts/update-node.sh  or  bash scripts/update-node.sh
set -e
cd "$(dirname "$0")/.."
exec python3 scripts/update-node.py "$@"
