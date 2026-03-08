#!/bin/bash

# axionax Testnet Pre-Launch Verification Script
# Verifies all systems are ready for public testnet launch

set -e

echo "🚀 axionax Testnet Pre-Launch Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# 1. Check Genesis File
echo "1. Checking Genesis Configuration..."
GENESIS_FILE=""
if [ -f "genesis.json" ]; then
    GENESIS_FILE="genesis.json"
elif [ -f "core/tools/genesis.json" ]; then
    GENESIS_FILE="core/tools/genesis.json"
fi

if [ -n "$GENESIS_FILE" ]; then
    check_pass "Genesis file exists: $GENESIS_FILE"
    
    # Validate JSON
    if python3 -m json.tool "$GENESIS_FILE" > /dev/null 2>&1; then
        check_pass "Genesis JSON is valid"
    else
        check_fail "Genesis JSON is invalid"
    fi
    
    # Support both formats: (1) config.chainId (EVM, 86137) and (2) top-level chain_id (string)
    CHAIN_ID_OK=0
    EVM_CHAIN_ID=$(python3 -c "import json; d=json.load(open('$GENESIS_FILE')); print(d.get('config',{}).get('chainId',''))" 2>/dev/null | tr -d '\n' || true)
    if [ "$EVM_CHAIN_ID" = "86137" ]; then
        check_pass "Chain ID is correct (EVM): 86137"
        CHAIN_ID_OK=1
    fi
    if [ "$CHAIN_ID_OK" -eq 0 ]; then
        LEGACY_CHAIN_ID=$(python3 -c "import json; d=json.load(open('$GENESIS_FILE')); print(d.get('chain_id',''))" 2>/dev/null || true)
        if [ "$LEGACY_CHAIN_ID" = "axionax-testnet-1" ]; then
            check_pass "Chain ID is correct (legacy): $LEGACY_CHAIN_ID"
            CHAIN_ID_OK=1
        fi
    fi
    if [ "$CHAIN_ID_OK" -eq 0 ]; then
        check_fail "Chain ID not found or not 86137 / axionax-testnet-1"
    fi
    
    # Validators: accept config.chainId format (>=2) or legacy (>=4)
    VALIDATOR_COUNT=$(python3 -c "
import json
d = json.load(open('$GENESIS_FILE'))
v = d.get('validators', [])
print(len(v) if isinstance(v, list) else 0)
" 2>/dev/null || echo "0")
    if [ "$VALIDATOR_COUNT" -ge 2 ]; then
        check_pass "Genesis has $VALIDATOR_COUNT validators"
    elif [ "$VALIDATOR_COUNT" -ge 1 ]; then
        check_warn "Only $VALIDATOR_COUNT validator(s) in genesis (2+ recommended)"
    else
        check_warn "No validators array found in genesis"
    fi
else
    check_fail "Genesis file not found (looked for genesis.json or core/tools/genesis.json)"
fi
echo ""

# 2. Check DNS Configuration
echo "2. Checking DNS Configuration..."

check_dns() {
    local domain=$1
    local expected=$2
    
    if host $domain > /dev/null 2>&1; then
        check_pass "DNS resolves: $domain"
    else
        check_fail "DNS does not resolve: $domain"
    fi
}

check_dns "axionax.org" "GitHub Pages"
check_dns "rpc.axionax.org" "VPS"
check_dns "explorer.axionax.org" "VPS"
check_dns "faucet.axionax.org" "VPS"
echo ""

# 3. Check RPC Endpoint
echo "3. Checking RPC Endpoint..."
RPC_URL="${RPC_URL:-https://rpc.axionax.org}"

if curl -f -s -o /dev/null -w "%{http_code}" "$RPC_URL/health" | grep -q "200"; then
    check_pass "RPC endpoint is accessible: $RPC_URL"
else
    check_fail "RPC endpoint is not accessible: $RPC_URL"
fi
echo ""

# 4. Check Explorer
echo "4. Checking Block Explorer..."
EXPLORER_URL="${EXPLORER_URL:-https://explorer.axionax.org}"

if curl -f -s -o /dev/null -w "%{http_code}" "$EXPLORER_URL" | grep -q "200\|301\|302"; then
    check_pass "Explorer is accessible: $EXPLORER_URL"
else
    check_fail "Explorer is not accessible: $EXPLORER_URL"
fi
echo ""

# 5. Check Faucet
echo "5. Checking Faucet..."
FAUCET_URL="${FAUCET_URL:-https://faucet.axionax.org}"

if curl -f -s -o /dev/null -w "%{http_code}" "$FAUCET_URL" | grep -q "200\|301\|302"; then
    check_pass "Faucet is accessible: $FAUCET_URL"
else
    check_fail "Faucet is not accessible: $FAUCET_URL"
fi
echo ""

# 6. Check GitHub Pages
echo "6. Checking Website..."
WEBSITE_URL="${WEBSITE_URL:-https://axionax.org}"

if curl -f -s -o /dev/null -w "%{http_code}" "$WEBSITE_URL" | grep -q "200"; then
    check_pass "Website is accessible: $WEBSITE_URL"
else
    check_fail "Website is not accessible: $WEBSITE_URL"
fi
echo ""

# 7. Check SSL Certificates
echo "7. Checking SSL Certificates..."

check_ssl() {
    local domain=$1
    if echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
        check_pass "SSL certificate valid: $domain"
    else
        check_warn "SSL certificate issue: $domain"
    fi
}

check_ssl "rpc.axionax.org"
check_ssl "explorer.axionax.org"
check_ssl "faucet.axionax.org"
echo ""

# 8. Check Docker Services
echo "8. Checking Docker Services..."

if command -v docker &> /dev/null; then
    RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | wc -l)
    if [ "$RUNNING_CONTAINERS" -gt "0" ]; then
        check_pass "$RUNNING_CONTAINERS Docker containers running"
        docker ps --format 'table {{.Names}}\t{{.Status}}'
    else
        check_warn "No Docker containers running"
    fi
else
    check_warn "Docker not installed or not accessible"
fi
echo ""

# 9. Check Environment Variables (optional when run from repo root; required when run from ops/deploy)
echo "9. Checking Environment Variables..."

check_env() {
    local var=$1
    if [ -n "${!var}" ]; then
        check_pass "$var is set"
    else
        check_warn "$var is not set"
    fi
}

ENV_FILE=".env"
[ -f "ops/deploy/.env" ] && ENV_FILE="ops/deploy/.env"
if [ -f "$ENV_FILE" ]; then
    check_pass ".env file exists ($ENV_FILE)"
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE" 2>/dev/null || true
    set +a
    check_env "DB_PASSWORD"
    check_env "REDIS_PASSWORD"
    check_env "FAUCET_PRIVATE_KEY"
    check_env "GRAFANA_PASSWORD"
else
    check_warn ".env not found (optional for pre-launch; required for deploy)"
fi
echo ""

# 10. Check GitHub Repos
echo "10. Checking GitHub Repositories..."

check_repo() {
    local repo=$1
    if curl -f -s -o /dev/null -w "%{http_code}" "https://api.github.com/repos/axionaxprotocol/$repo" | grep -q "200"; then
        check_pass "Repository accessible: $repo"
    else
        check_warn "Repository not accessible: $repo"
    fi
}

check_repo "axionax-core-universe"
check_repo "axionax-web-universe"
echo ""

# 11. Check Monitoring
echo "11. Checking Monitoring Stack..."

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

if curl -f -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL" | grep -q "200\|302"; then
    check_pass "Grafana is accessible"
else
    check_warn "Grafana is not accessible"
fi

if curl -f -s -o /dev/null -w "%{http_code}" "$PROMETHEUS_URL" | grep -q "200"; then
    check_pass "Prometheus is accessible"
else
    check_warn "Prometheus is not accessible"
fi
echo ""

# 12. Check Documentation
echo "12. Checking Documentation..."

DOCS_OK=0
[ -f "README.md" ] && DOCS_OK=1
[ -f "docs/GENESIS_PUBLIC_TESTNET_PLAN.md" ] && DOCS_OK=1
[ -f "docs/ADD_NETWORK_AND_TOKEN.md" ] && DOCS_OK=1
if [ "$DOCS_OK" -eq 1 ]; then
    check_pass "Key docs exist (README, Genesis plan, Add token)"
else
    check_warn "Some key docs missing"
fi

if [ -f "ops/deploy/VPS_VALIDATOR_UPDATE.md" ] || [ -f "VPS_VALIDATOR_UPDATE.md" ]; then
    check_pass "Validator/deploy guide exists"
else
    check_warn "VPS_VALIDATOR_UPDATE.md not found"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Verification Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "🚀 System is ready for testnet launch!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s)${NC}"
    echo ""
    echo "⚠️  Review warnings before launch"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo "❌ Fix errors before launching testnet"
    exit 1
fi
