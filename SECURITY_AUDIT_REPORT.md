# Axionax Blockchain Project — Security Audit Report

**Date:** 2026-03-05  
**Scope:** Python DeAI Worker, Rust-Python Bridge, TypeScript SDK, Next.js Website/Deploy, Mock RPC Server  
**Auditor:** Automated Security Analysis  

---

## Executive Summary

This audit reviewed all source files across five major components of the Axionax blockchain project. **34 findings** were identified across Critical, High, Medium, Low, and Informational severity levels. The most critical issues involve hardcoded credentials in deployment scripts, insecure HTTP RPC connections without TLS, a hardcoded default private key in the deployer, and private key exposure through the `ContractManager` constructor.

| Severity      | Count |
|---------------|-------|
| Critical      | 4     |
| High          | 7     |
| Medium        | 10    |
| Low           | 8     |
| Informational | 5     |

---

## Findings

---

### FINDING-01: Hardcoded Default Private Key in Deployer

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/deployer/deploy_token.js`, line 13-14
- **Severity:** Critical
- **Category:** Hardcoded Credentials

**Description:**  
The deployer script contains a well-known Hardhat default private key as a fallback:
```javascript
const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.FAUCET_PRIVATE_KEY
         || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
```
This is Hardhat Account #0's private key. If environment variables are not set, the deployer will use this widely-known key. While intended for local dev, if accidentally used in a testnet or production deployment, all funds from this account are immediately compromisable.

**Impact:** Any attacker who recognizes this key (it is publicly documented) can drain all funds and control all contracts deployed by this account.

**Recommendation:** Remove the hardcoded fallback. Require the environment variable and exit with a clear error if not set:
```javascript
const PK = process.env.DEPLOYER_PRIVATE_KEY || process.env.FAUCET_PRIVATE_KEY;
if (!PK) { console.error("DEPLOYER_PRIVATE_KEY or FAUCET_PRIVATE_KEY must be set"); process.exit(1); }
```

---

### FINDING-02: Hardcoded Default Password in Validator Setup Script

- **File:** `ops/deploy/setup_validator.sh`, line 44
- **Severity:** Critical
- **Category:** Hardcoded Credentials

**Description:**  
The validator setup script sets a default, publicly visible password for the `axionax` system user:
```bash
echo "$AXIONAX_USER:axionax2025" | chpasswd
```
This password is committed to the repository. Anyone with read access to the repo can SSH into a freshly provisioned validator using `axionax:axionax2025`.

**Impact:** Full system-level access to any validator node provisioned with this script before the password is manually changed. Attackers could steal validator keys, manipulate consensus, or compromise the entire node.

**Recommendation:**
- Generate a random password at provisioning time and display it once, or require the operator to set one interactively.
- Better: set `--disabled-password` and require SSH key-only authentication.
- Never commit passwords to version control.

---

### FINDING-03: Private Key Passed as Plain String to ContractManager

- **File:** `core/deai/worker_node.py`, line 367
- **Severity:** Critical
- **Category:** Key Management / Credential Exposure

**Description:**  
The worker node extracts the wallet's raw private key and passes it as a plaintext hex string to `ContractManager`:
```python
self.contract = ContractManager(
    rpc_url=self.network.active_node_url,
    private_key=self.wallet.account.key.hex(),
    contract_address=contract_address,
)
```
This means the private key exists as a plain Python string in memory at multiple points. If the process crashes and a core dump is generated, or if debug logging inadvertently captures it, the key is exposed.

**Impact:** The worker's private key (which holds staked tokens) could be leaked through crash dumps, debug logs, or memory inspection.

**Recommendation:**
- Pass the `Account` object directly instead of the raw key string.
- Refactor `ContractManager` to accept an `Account` or a signing callback rather than a raw private key.
- Ensure the private key string is zeroed/overwritten after use where possible.

---

### FINDING-04: Insecure HTTP (No TLS) for RPC Communication

- **File:** `core/deai/rpc_client.py`, line 10
- **File:** `core/deai/worker_config.toml`, lines 17-19
- **Severity:** Critical
- **Category:** Insecure Communication / Missing TLS

**Description:**  
The RPC client defaults to plain HTTP:
```python
def __init__(self, rpc_url: str = "http://217.76.61.116:8545"):
```
And the worker config hardcodes HTTP URLs for bootnodes:
```toml
bootnodes = [
    "http://217.76.61.116:8545",
    "http://46.250.244.4:8545"
]
```
All RPC traffic — including signed transactions, wallet addresses, and blockchain queries — is sent unencrypted over the internet.

**Impact:** Man-in-the-middle attacks can intercept, modify, or replay transactions. Signed transaction data sent over HTTP can be captured, enabling potential replay or front-running attacks.

**Recommendation:**
- Use HTTPS (TLS) for all RPC endpoints, especially those on the public internet.
- Validate TLS certificates. Consider certificate pinning for production.
- The nginx config in `ops/deploy/nginx/conf.d/rpc.conf` already configures TLS for `rpc.axionax.org` — ensure all clients use this endpoint.

---

### FINDING-05: Hardcoded Blockscout SECRET_KEY_BASE in docker-compose

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/docker-compose.yml`, line 100
- **Severity:** High
- **Category:** Hardcoded Secrets

**Description:**  
The Blockscout `SECRET_KEY_BASE` is hardcoded in the docker-compose file:
```yaml
SECRET_KEY_BASE: pd1+T03FiW54uPGlkL+xx5U3alkXpgky+kP1/55JyElDiOM1LMnAl7s2ueF4/rQ4m6xkwmjtnIoC2VMYb0+kJg==
```
This key is used by Phoenix/Elixir for session signing and CSRF tokens.

**Impact:** An attacker who knows this key can forge sessions, bypass CSRF protection, and potentially gain admin access to Blockscout.

**Recommendation:** Move to an environment variable. Generate a unique key per deployment:
```bash
mix phx.gen.secret
```

---

### FINDING-06: Hardcoded Database Credentials in docker-compose

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/docker-compose.yml`, lines 63-65, 86
- **Severity:** High
- **Category:** Hardcoded Credentials

**Description:**  
PostgreSQL credentials are hardcoded:
```yaml
POSTGRES_USER: blockscout
POSTGRES_PASSWORD: blockscout
POSTGRES_DB: blockscout
```
And:
```yaml
DATABASE_URL: postgresql://blockscout:blockscout@postgres:5432/blockscout
```

**Impact:** If the database port is exposed or the container is accessed, the trivial username/password combination provides immediate database access.

**Recommendation:** Use environment variables or Docker secrets. Generate strong random passwords per deployment.

---

### FINDING-07: Hardcoded Basic Auth Credentials in .env.example

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/.env.example`, line 11
- **Severity:** High
- **Category:** Hardcoded Credentials

**Description:**  
The `.env.example` file contains an actual credential value:
```
BASIC_AUTH=admin:password
```
While `.env.example` files are templates, users commonly copy them verbatim. This default would give anyone `admin:password` access to the faucet.

**Impact:** Unauthorized faucet access allowing token draining.

**Recommendation:** Use a placeholder like `BASIC_AUTH=changeme_user:changeme_password` and add validation in the faucet code to reject these default values.

---

### FINDING-08: Public IP Addresses and SSH Access Details in Committed Files

- **File:** `ops/deploy/VPS_CONNECTION.txt`, line 5
- **File:** `core/deai/worker_config.toml`, lines 17-18
- **Severity:** High
- **Category:** Information Disclosure

**Description:**  
The repository contains live server IP addresses and SSH commands:
```
ssh root@217.216.109.5
```
And real validator IPs in the worker config:
```toml
bootnodes = [
    "http://217.76.61.116:8545",
    "http://46.250.244.4:8545"
]
```

**Impact:** Attackers gain immediate knowledge of infrastructure topology. Combined with the hardcoded password (FINDING-02), this enables direct SSH access to validators.

**Recommendation:**
- Remove `VPS_CONNECTION.txt` from version control and add it to `.gitignore`.
- Move bootnode IPs to environment variables or a separate non-committed config.

---

### FINDING-09: Faucet Endpoint Lacks Rate Limiting (server.js variant)

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/server.js`, line 33
- **Severity:** High
- **Category:** Denial of Service / Resource Exhaustion

**Description:**  
The `server.js` faucet variant has no rate limiting on the `/request` endpoint:
```javascript
app.get("/request", async (req, res) => {
    const to = (req.query.address||"").trim();
```
While the `index.js` variant implements `express-rate-limit`, this separate `server.js` does not.

**Impact:** An attacker can drain the faucet wallet by sending unlimited requests, exhausting all native tokens and AXX ERC-20 tokens.

**Recommendation:** Add rate limiting (per-IP and per-address) to `server.js`, consistent with the protections in `index.js`.

---

### FINDING-10: Faucet ERC-20 Endpoint Accepts User-Controlled Amount

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/index.js`, line 86
- **Severity:** High
- **Category:** Input Validation / Business Logic

**Description:**  
The `/request-erc20` endpoint accepts a user-supplied `amount` query parameter:
```javascript
const rawAmt = req.query.amount ?? FAUCET_AMOUNT_ERC20;
```
An attacker can request arbitrary amounts:
```
GET /request-erc20?address=0x...&amount=999999999999999
```

**Impact:** Complete drain of the faucet's ERC-20 token balance in a single request.

**Recommendation:** Remove the user-controlled `amount` parameter. Always use the server-configured `FAUCET_AMOUNT_ERC20` value.

---

### FINDING-11: Mock RPC web3_sha3 Returns Random Hash Instead of Keccak256

- **File:** `ops/deploy/mock-rpc/server.js`, lines 549-553
- **Severity:** High
- **Category:** Incorrect Implementation / Integrity

**Description:**  
The `web3_sha3` method returns a random hash instead of computing the actual keccak256:
```javascript
case 'web3_sha3': {
    const [data] = params;
    return jsonRpcResponse(id, generateHash());
}
```

**Impact:** Any client relying on `web3_sha3` for cryptographic verification (e.g., signature verification, address derivation) will get incorrect results. This could mask bugs that rely on deterministic hashing, leading to issues when transitioning to real nodes.

**Recommendation:** Implement proper keccak256 hashing using a library like `ethers.js` or `js-sha3`.

---

### FINDING-12: CORS Wildcard on RPC Configuration

- **File:** `ops/deploy/configs/rpc-config.toml`, line 14
- **File:** `ops/deploy/environments/testnet/public/.env.rpc`, line 29
- **File:** `ops/deploy/nginx/conf.d/rpc.conf`, line 57
- **Severity:** Medium
- **Category:** Cross-Origin Security

**Description:**  
Multiple configurations set CORS to allow all origins:
```toml
cors_origins = ["*"]
```
```
RPC_CORS_ALLOWED_ORIGINS=*
```
```nginx
add_header Access-Control-Allow-Origin * always;
```

**Impact:** Any website can make authenticated cross-origin requests to the RPC node. This enables potential phishing sites to interact with the chain on behalf of users who visit them while having MetaMask connected.

**Recommendation:** Restrict CORS to known frontend domains (e.g., `https://explorer.axionax.org`, `https://app.axionax.org`).

---

### FINDING-13: No TLS Certificate Verification in Python RPC Client

- **File:** `core/deai/rpc_client.py`, lines 25-30
- **Severity:** Medium
- **Category:** Insecure Communication

**Description:**  
The `requests.post()` call does not explicitly set `verify=True` (though this is the default). More importantly, there is no hostname validation or certificate pinning, and the default URL is HTTP (not HTTPS). If a user provides an HTTPS URL, default `requests` behavior will verify, but there is no enforcement or warning for HTTP usage.

**Impact:** Combined with FINDING-04 (HTTP default), traffic is unencrypted. Even if HTTPS were used, there's no pinning against MITM attacks with rogue CAs.

**Recommendation:**
- Enforce HTTPS URLs at initialization time.
- Add certificate pinning for production endpoints.
- Warn or refuse to connect over plain HTTP unless explicitly opted in.

---

### FINDING-14: Mutable Default Argument in rpc_client.py

- **File:** `core/deai/rpc_client.py`, lines 15, 51
- **Severity:** Medium
- **Category:** Code Quality / Potential Bug

**Description:**  
Two methods use mutable default arguments:
```python
def _call(self, method: str, params: List[Any] = []) -> Any:
def get_logs(self, from_block: str, address: Optional[str] = None, topics: List[str] = []) -> List[Dict]:
```

**Impact:** If the list is ever mutated, the default value is shared across all calls, which can lead to subtle, hard-to-debug issues that could be exploited in adversarial conditions.

**Recommendation:** Use `None` as default and initialize inside the function:
```python
def _call(self, method: str, params: Optional[List[Any]] = None) -> Any:
    if params is None:
        params = []
```

---

### FINDING-15: Private Key Logged in Worker Startup (Wallet Address Logged, Key Passes Through Memory)

- **File:** `core/deai/worker_node.py`, line 399
- **Severity:** Medium
- **Category:** Information Disclosure

**Description:**  
While the wallet address (not the key) is logged:
```python
logger.info(f"👛 Worker Wallet: {self.wallet.get_address()}")
```
The `WalletManager.get_private_key()` method (line 138-143) exists as a public API and returns the raw hex key. If any future logging or error handler accidentally calls this, or if the traceback includes the `ContractManager` constructor arguments (which include the plaintext key, per FINDING-03), the private key would be exposed in logs.

**Impact:** Private key exposure in log files, potentially accessible to operations staff or log aggregation systems.

**Recommendation:**
- Rename `get_private_key()` to `_get_private_key()` (private by convention).
- Add a `__repr__` to `ContractManager` that masks the key.
- Ensure no logging captures the private key argument.

---

### FINDING-16: Keystore File Written with Potentially Insecure Permissions on Non-Unix Systems

- **File:** `core/deai/wallet_manager.py`, lines 125-132
- **Severity:** Medium
- **Category:** Key Management

**Description:**  
The keystore file is written and then permissions are set:
```python
with open(self.key_file, "w") as f:
    json.dump(encrypted, f, indent=2)
try:
    os.chmod(self.key_file, 0o600)
except (OSError, AttributeError):
    pass
```
The file is briefly world-readable between `open()` and `chmod()`. On Windows, `chmod` fails silently.

**Impact:** A race condition window where the keystore is readable by other users. On Windows, the keystore is permanently world-readable.

**Recommendation:**
- On Unix, use `os.open()` with `O_CREAT | O_WRONLY` and mode `0o600`, then `os.fdopen()` to write.
- On Windows, use `icacls` or platform-appropriate ACLs.

---

### FINDING-17: Legacy Plaintext Key Migration in WalletManager

- **File:** `core/deai/wallet_manager.py`, lines 88-96
- **Severity:** Medium
- **Category:** Key Management

**Description:**  
The code supports loading plaintext private keys from a JSON field:
```python
elif "private_key" in keystore:
    print("⚠️  WARNING: Found plaintext key! Migrating to encrypted format...")
    private_key = keystore["private_key"]
```
While it migrates to encrypted format, the original plaintext file is not securely deleted afterward — the content remains on disk until overwritten by the OS.

**Impact:** The plaintext key persists on disk after migration, recoverable with forensic tools.

**Recommendation:** After migration, securely overwrite the original file contents before writing the encrypted version, or at minimum explicitly delete the file and recreate it.

---

### FINDING-18: No Input Validation on RPC Method Names in find_peers.py

- **File:** `core/deai/find_peers.py`, lines 28-30
- **Severity:** Medium
- **Category:** Input Validation

**Description:**  
The `find_peers.py` script calls administrative RPC methods:
```python
methods_to_try = ["admin_peers", "net_peers", "parity_netPeers"]
```
While these are hardcoded (not user-controlled), the script calls them against a public RPC node. If the node has these methods enabled, it exposes internal network topology.

**Impact:** Information disclosure of peer network topology, IP addresses, and node versions.

**Recommendation:** This script should only run against local/controlled nodes, not production validators. Add a warning or restrict to localhost URLs.

---

### FINDING-19: RPC Endpoint Logging Truncates Data but Still Logs Payloads

- **File:** `ops/deploy/mock-rpc/server.js`, line 199
- **Severity:** Medium
- **Category:** Information Disclosure

**Description:**  
```javascript
console.log(`[RPC] ${method}`, JSON.stringify(params).slice(0, 100));
```
While truncated to 100 characters, this could still log sensitive data like transaction parameters, signed data, or private method calls.

**Impact:** Sensitive transaction data could appear in server logs.

**Recommendation:** Exclude sensitive methods (like `eth_sendRawTransaction`) from detailed param logging, or log only the method name.

---

### FINDING-20: Mock RPC Server Has No Authentication

- **File:** `ops/deploy/mock-rpc/server.js`
- **Severity:** Medium
- **Category:** Missing Authentication

**Description:**  
The mock RPC server accepts all requests without any authentication. While it's a mock, it binds to `0.0.0.0` (line 638), making it accessible on all network interfaces.

**Impact:** If deployed on a machine with a public IP (even accidentally), anyone can interact with the mock chain, register workers, and submit jobs.

**Recommendation:** Bind to `127.0.0.1` by default. Add a warning if binding to `0.0.0.0`. Consider requiring an API key for non-read methods.

---

### FINDING-21: MockSandbox Provides No Security Isolation

- **File:** `core/deai/sandbox.py`, lines 273-289
- **Severity:** Medium
- **Category:** Security Control Bypass

**Description:**  
The `MockSandbox` class provides zero isolation:
```python
class MockSandbox:
    def execute(self, **kwargs) -> ExecutionResult:
        logger.warning("Using MockSandbox - NO SECURITY ISOLATION!")
        return ExecutionResult(status=ExecutionStatus.SUCCESS, ...)
```
The `create_sandbox()` factory silently falls back to `MockSandbox` if Docker is unavailable. The `--no-sandbox` CLI flag explicitly enables this. In mock mode, untrusted code from the blockchain would execute without sandboxing.

**Impact:** Arbitrary code execution on the worker node if sandbox falls back to mock mode.

**Recommendation:**
- In production, refuse to start if Docker sandbox is unavailable.
- Log a CRITICAL-level warning if mock sandbox is used.
- Add a configuration option to prevent fallback to mock sandbox.

---

### FINDING-22: Rust Bridge u128-to-u64 Truncation

- **File:** `core/bridge/rust-python/src/lib.rs`, lines 49, 64-65, 189, 209-211
- **Severity:** Low
- **Category:** Data Integrity / FFI Boundary

**Description:**  
The bridge stores values as `u128` internally but exposes them to Python as `u64`:
```rust
fn new(address: String, stake: u64) -> Self {
    PyValidator { address, stake: stake as u128, ... }
}
fn stake(&self) -> PyResult<u64> {
    Ok(self.stake as u64)
}
```
Similarly for `PyTransaction::value`. If a stake or value exceeds `u64::MAX`, the conversion silently truncates.

**Impact:** Values above ~18.4 quintillion (u64 max) would be silently truncated, potentially causing incorrect stake calculations or transaction values.

**Recommendation:** Use Python's arbitrary-precision integers. Return the `u128` as a string or use `num-bigint` with PyO3's BigInt support.

---

### FINDING-23: VRF Seed Truncation to 4 Bytes in ASR

- **File:** `core/deai/asr.py`, line 235
- **Severity:** Low
- **Category:** Cryptographic Weakness

**Description:**  
The VRF-based selection uses only the first 4 bytes of the seed:
```python
np.random.seed(int.from_bytes(vrf_seed[:4], 'big'))
```
This provides only 2^32 (~4 billion) possible selections, making the VRF output predictable if the seed is partially known.

**Impact:** Reduced randomness in worker selection. An attacker who can predict or influence 4 bytes of the VRF seed could manipulate worker assignment.

**Recommendation:** Use all bytes of the VRF seed. Consider using `numpy.random.Generator` with `SeedSequence` which accepts arbitrarily large seeds, or use the full seed with a CSPRNG.

---

### FINDING-24: No CSRF Protection in Faucet Endpoints

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/index.js`, lines 67-95
- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/faucet/server.js`, lines 33-51
- **Severity:** Low
- **Category:** CSRF

**Description:**  
Both faucet implementations use `GET` requests for state-changing operations (sending tokens). The `index.js` variant enables CORS with `app.use(cors())`, allowing any origin. Combined with GET requests, this means any website can trigger faucet requests via `<img>` tags or `fetch()`.

**Impact:** A malicious website could drain the faucet by triggering requests from a victim's browser, bypassing rate limits tied to the faucet server's perspective.

**Recommendation:**
- Use `POST` for state-changing operations.
- Restrict CORS to known frontend origins.
- Add CSRF tokens for authenticated endpoints.

---

### FINDING-25: No Request ID Validation in SDK RPC Clients

- **File:** `core/docs/sdk-types/staking-client.ts`, line 39
- **File:** `core/docs/sdk-types/governance-client.ts`, line 39
- **Severity:** Low
- **Category:** Response Validation

**Description:**  
The RPC clients use `Date.now()` as the request ID:
```typescript
id: Date.now(),
```
But never validate that the response ID matches the request ID. In a multiplexed or proxied environment, responses could be correlated incorrectly.

**Impact:** In edge cases with concurrent requests, a response for one request could be incorrectly attributed to another.

**Recommendation:** Use a monotonically incrementing counter and validate the response `id` field matches.

---

### FINDING-26: SDK RPC Error Message Directly Exposed to Users

- **File:** `core/docs/sdk-types/staking-client.ts`, line 45
- **File:** `core/docs/sdk-types/governance-client.ts`, line 45
- **Severity:** Low
- **Category:** Information Disclosure

**Description:**  
RPC error messages are thrown directly:
```typescript
throw new Error(`RPC Error: ${data.error.message}`);
```

**Impact:** Internal RPC error details (potentially including stack traces, internal state, or node configuration) could be exposed to end users.

**Recommendation:** Log the full error server-side and return a sanitized error message to the client.

---

### FINDING-27: TypeScript SDK Does Not Validate Address Format

- **File:** `core/docs/sdk-types/staking-client.ts`, lines 59, 106, 115, 125-129
- **File:** `core/docs/sdk-types/governance-client.ts`, lines 116-120, 139-142
- **Severity:** Low
- **Category:** Input Validation

**Description:**  
The SDK client methods accept `address` parameters as plain `string` without validating they are valid Ethereum addresses (checksum, length, format).

**Impact:** Invalid addresses would result in wasted gas on failed transactions, or could trigger unexpected contract behavior.

**Recommendation:** Validate addresses using `ethers.utils.isAddress()` or `viem.isAddress()` before making RPC calls.

---

### FINDING-28: UI Stores Faucet Auth Credentials in localStorage

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/ui/index.html`, lines 293-298
- **Severity:** Low
- **Category:** Credential Storage

**Description:**  
Basic auth credentials are stored in `localStorage`:
```javascript
localStorage.setItem('faucetAuthUser', u);
localStorage.setItem('faucetAuthPass', p);
```

**Impact:** Any XSS vulnerability in the UI would allow an attacker to steal faucet credentials. `localStorage` is accessible to all scripts on the same origin.

**Recommendation:** Use `sessionStorage` at minimum (cleared on tab close), or preferably use HTTP-only cookies set by the server.

---

### FINDING-29: Solidity Contract Missing Zero-Address Checks

- **File:** `ops/deploy/environments/testnet/Axionax_v1.6_Testnet_in_a_Box/deployer/contracts/AXX.sol`, lines 32, 53-56
- **Severity:** Low
- **Category:** Smart Contract Safety

**Description:**  
The `transfer` and `_transfer` functions do not check for `address(0)`:
```solidity
function _transfer(address from, address to, uint256 amount) internal {
    require(balanceOf[from] >= amount, "balance");
    unchecked { balanceOf[from] -= amount; balanceOf[to] += amount; }
}
```

**Impact:** Tokens can be accidentally burned by transferring to `address(0)`, or balances could be artificially inflated.

**Recommendation:** Add `require(to != address(0), "transfer to zero")` and `require(from != address(0), "transfer from zero")`.

---

### FINDING-30: Dependency Version Ranges Allow Vulnerable Versions

- **File:** `core/deai/requirements.txt`
- **Severity:** Informational
- **Category:** Dependency Management

**Description:**  
Dependencies use minimum version pins with `>=` which allows any future version:
```
requests>=2.28.0
web3>=6.0.0
```
Known CVEs exist in older versions of some of these packages.

**Impact:** Depending on the resolved version, known vulnerabilities could be present.

**Recommendation:** Pin exact versions or use upper-bound ranges (e.g., `requests>=2.31.0,<3.0`). Run `pip audit` or `safety check` regularly. Consider using a lockfile.

---

### FINDING-31: Missing eth_account Dependency in requirements.txt

- **File:** `core/deai/requirements.txt`
- **Severity:** Informational
- **Category:** Dependency Management

**Description:**  
The `wallet_manager.py` imports `from eth_account import Account`, but `eth_account` is not listed in `requirements.txt`. It's likely installed as a transitive dependency of `web3`, but this is fragile.

**Impact:** If `web3` changes its dependency tree, `eth_account` may not be installed, causing an import error at runtime.

**Recommendation:** Explicitly add `eth-account` to `requirements.txt`.

---

### FINDING-32: generate-genesis.py Uses subprocess.run Without Shell=False Verification

- **File:** `ops/deploy/scripts/generate-genesis.py`, line 17
- **Severity:** Informational
- **Category:** Command Injection (Low Risk)

**Description:**  
```python
sys.exit(subprocess.run([sys.executable, str(CANONICAL)] + sys.argv[1:]).returncode)
```
While `sys.argv` is passed as a list (not through shell), and `CANONICAL` is derived from a known path, the script forwards all command-line arguments to the subprocess. If a user passes specially crafted arguments, they could be interpreted by the target script.

**Impact:** Low risk since no shell is involved and the target is a known Python script. However, argument injection into the downstream script is possible.

**Recommendation:** Validate or sanitize `sys.argv` arguments before forwarding.

---

### FINDING-33: Docker Sandbox Image Not Pinned to Digest

- **File:** `core/deai/sandbox.py`, line 70
- **Severity:** Informational
- **Category:** Supply Chain Security

**Description:**  
The sandbox uses a tag-based image reference:
```python
DEFAULT_IMAGE = "python:3.11-slim"
```
Docker tags are mutable — a compromised Docker Hub account could push a malicious image under this tag.

**Impact:** A supply chain attack could replace the sandbox base image with a malicious one, compromising all job executions.

**Recommendation:** Pin the image to a specific digest:
```python
DEFAULT_IMAGE = "python:3.11-slim@sha256:<known-digest>"
```

---

### FINDING-34: sys.path Manipulation in Multiple Python Files

- **File:** `core/deai/worker_node.py`, line 20
- **File:** `core/deai/find_peers.py`, line 3
- **File:** `core/deai/test_worker_connection.py`, line 3
- **File:** `core/deai/test_job_execution.py`, line 7
- **Severity:** Informational
- **Category:** Code Quality / Import Safety

**Description:**  
Multiple files modify `sys.path` at runtime:
```python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
```

**Impact:** In a malicious environment, this could allow local directory Python files to shadow standard library modules (module hijacking). Low practical risk in this context.

**Recommendation:** Use proper Python packaging with `setup.py` or `pyproject.toml` and install the package in development mode (`pip install -e .`).

---

## Summary of Recommendations (Priority Order)

1. **Immediate (Critical):**
   - Remove the hardcoded Hardhat private key fallback from `deploy_token.js`
   - Remove the hardcoded password from `setup_validator.sh`; use SSH key auth
   - Switch all RPC connections to HTTPS/TLS
   - Refactor `ContractManager` to avoid passing raw private keys as strings

2. **Short-term (High):**
   - Move all secrets out of docker-compose files into environment variables or Docker secrets
   - Remove `VPS_CONNECTION.txt` from version control
   - Add rate limiting to the `server.js` faucet variant
   - Remove user-controlled `amount` parameter from the ERC-20 faucet endpoint
   - Implement proper keccak256 in mock RPC's `web3_sha3`

3. **Medium-term (Medium):**
   - Restrict CORS to known domains
   - Enforce sandbox mode — refuse to start without Docker in production
   - Fix mutable default arguments
   - Improve keystore file permissions handling
   - Securely delete plaintext keys after migration

4. **Long-term (Low/Informational):**
   - Pin Docker images to digests
   - Pin dependency versions
   - Validate Ethereum addresses in SDK
   - Use proper Python packaging instead of `sys.path` manipulation
   - Implement full VRF seed usage in ASR

---

*End of Security Audit Report*
