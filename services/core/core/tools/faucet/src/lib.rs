//! Axionax Faucet — testable pure helpers
//!
//! This library exposes the core logic of the faucet binary as pure functions
//! so they can be unit-tested without spinning up an HTTP server or touching
//! the network. The binary re-uses these helpers for all address validation,
//! rate-limit checking, RPC request building, and nonce parsing.

/// Validate an Ethereum-compatible address.
///
/// A valid address must:
/// - Start with the `0x` prefix.
/// - Have a total length of exactly 42 characters (prefix + 40 hex digits).
/// - Contain only ASCII hex digits in the 40-character body.
///
/// Note: the zero address (`0x000…000`) is considered structurally valid here;
/// callers that need to reject it (e.g. the faucet handler) must add that
/// check themselves.
pub fn is_valid_address(addr: &str) -> bool {
    addr.starts_with("0x") && addr.len() == 42 && addr[2..].chars().all(|c| c.is_ascii_hexdigit())
}

/// Normalize an address to lowercase.
///
/// Ethereum addresses are case-insensitive; lowercasing them before using
/// them as `DashMap` keys ensures that `0xABC…` and `0xabc…` are treated
/// as the same entry.
pub fn normalize_address(addr: &str) -> String {
    addr.to_lowercase()
}

/// Return `true` when a new request from this key should be **blocked**
/// because the cooldown period has not fully elapsed yet.
///
/// The check is inclusive on the boundary: if exactly `cooldown_secs` have
/// passed the caller is still considered to be within the cooldown window and
/// must wait at least one more second.
///
/// # Arguments
/// * `last_request_ts` — Unix timestamp (seconds) of the most recent allowed request.
/// * `now_ts`          — Current Unix timestamp (seconds).
/// * `cooldown_secs`   — Required quiet period in seconds (e.g. `86400` for 24 h).
pub fn is_within_cooldown(last_request_ts: u64, now_ts: u64, cooldown_secs: u64) -> bool {
    now_ts.saturating_sub(last_request_ts) <= cooldown_secs
}

/// Format a raw wei amount as a human-readable AXX string with four decimal
/// places, e.g. `"1.0000 AXX"` for `1 × 10¹⁸` wei.
pub fn format_amount_axx(wei: u128) -> String {
    let axx = wei as f64 / 1e18;
    format!("{:.4} AXX", axx)
}

/// Build a JSON-RPC 2.0 `eth_getTransactionCount` request body that can be
/// sent to any EVM-compatible node to retrieve the current nonce for
/// `address`.
pub fn build_get_nonce_request(address: &str) -> serde_json::Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getTransactionCount",
        "params": [address, "latest"],
        "id": 1
    })
}

/// Build a JSON-RPC 2.0 `eth_sendRawTransaction` request body for the given
/// hex-encoded raw transaction string (e.g. `"0xdeadbeef…"`).
pub fn build_send_tx_request(raw_tx_hex: &str) -> serde_json::Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_sendRawTransaction",
        "params": [raw_tx_hex],
        "id": 1
    })
}

/// Parse a hex nonce string returned by `eth_getTransactionCount` into a
/// plain `u64`.  Both `"0x1a"` and `"1a"` (without prefix) are accepted.
/// Returns `0` on parse failure rather than panicking.
pub fn parse_nonce(hex: &str) -> u64 {
    u64::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0)
}

// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;

    // ── Address validation ────────────────────────────────────────────────────

    #[test]
    fn test_valid_address() {
        // Standard 42-char address (0x + 40 hex digits)
        assert!(is_valid_address(
            "0x1234567890123456789012345678901234567890"
        ));
        // All-lowercase hex body
        assert!(is_valid_address(
            "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        ));
        // Zero address is structurally valid; callers enforce business rules
        assert!(is_valid_address(
            "0x0000000000000000000000000000000000000000"
        ));
    }

    #[test]
    fn test_invalid_address_no_prefix() {
        // Missing leading "0x"
        assert!(!is_valid_address("742d35Cc6634C0532925a3b844Bc9e7595f0bEb"));
    }

    #[test]
    fn test_invalid_address_too_short() {
        // Only 8 characters total — nowhere near 42
        assert!(!is_valid_address("0x742d35"));
    }

    #[test]
    fn test_invalid_address_too_long() {
        // 43 characters total (one extra byte at the end)
        assert!(!is_valid_address(
            "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb00"
        ));
    }

    #[test]
    fn test_invalid_address_non_hex() {
        // Correct length but body contains non-hex characters ('Z')
        assert!(!is_valid_address(
            "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
        ));
    }

    // ── Normalize ─────────────────────────────────────────────────────────────

    #[test]
    fn test_normalize_address() {
        let addr = "0x742D35CC6634C0532925A3B844BC9E7595F0BEB";
        assert_eq!(
            normalize_address(addr),
            "0x742d35cc6634c0532925a3b844bc9e7595f0beb"
        );
    }

    #[test]
    fn test_normalize_address_already_lowercase() {
        let addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
        assert_eq!(normalize_address(addr), addr);
    }

    // ── Cooldown ──────────────────────────────────────────────────────────────

    #[test]
    fn test_cooldown_active() {
        // 1 000 s elapsed, cooldown is 86 400 s → firmly within cooldown
        assert!(is_within_cooldown(0, 1_000, 86_400));
    }

    #[test]
    fn test_cooldown_expired() {
        // 90 000 s elapsed, cooldown is 86 400 s → cooldown has passed
        assert!(!is_within_cooldown(0, 90_000, 86_400));
    }

    #[test]
    fn test_cooldown_exact_boundary() {
        // Exactly cooldown_secs have elapsed — the boundary is inclusive,
        // so the caller is still blocked for one more second.
        assert!(is_within_cooldown(0, 86_400, 86_400));
    }

    #[test]
    fn test_cooldown_just_past() {
        // One second beyond the boundary → request is now allowed
        assert!(!is_within_cooldown(0, 86_401, 86_400));
    }

    #[test]
    fn test_cooldown_saturating_sub_no_panic() {
        // now_ts < last_request_ts (e.g. clock skew) must not panic
        // saturating_sub yields 0, which is ≤ any cooldown → still blocked
        assert!(is_within_cooldown(1_000, 500, 86_400));
    }

    // ── Amount formatting ─────────────────────────────────────────────────────

    #[test]
    fn test_format_amount_1_axx() {
        assert_eq!(format_amount_axx(1_000_000_000_000_000_000), "1.0000 AXX");
    }

    #[test]
    fn test_format_amount_half_axx() {
        assert_eq!(format_amount_axx(500_000_000_000_000_000), "0.5000 AXX");
    }

    #[test]
    fn test_format_amount_zero() {
        assert_eq!(format_amount_axx(0), "0.0000 AXX");
    }

    // ── RPC request builders ──────────────────────────────────────────────────

    #[test]
    fn test_build_get_nonce_request() {
        let req = build_get_nonce_request("0xabc");
        assert_eq!(req["jsonrpc"], "2.0");
        assert_eq!(req["method"], "eth_getTransactionCount");
        assert_eq!(req["params"][0], "0xabc");
        assert_eq!(req["params"][1], "latest");
        assert_eq!(req["id"], 1);
    }

    #[test]
    fn test_build_send_tx_request() {
        let req = build_send_tx_request("0xdeadbeef");
        assert_eq!(req["jsonrpc"], "2.0");
        assert_eq!(req["method"], "eth_sendRawTransaction");
        assert_eq!(req["params"][0], "0xdeadbeef");
        assert_eq!(req["id"], 1);
    }

    // ── Nonce parsing ─────────────────────────────────────────────────────────

    #[test]
    fn test_parse_nonce_zero() {
        assert_eq!(parse_nonce("0x0"), 0);
    }

    #[test]
    fn test_parse_nonce_one() {
        assert_eq!(parse_nonce("0x1"), 1);
    }

    #[test]
    fn test_parse_nonce_large() {
        assert_eq!(parse_nonce("0xff"), 255);
    }

    #[test]
    fn test_parse_nonce_no_prefix() {
        // bare hex "10" is decimal 16
        assert_eq!(parse_nonce("10"), 16);
    }

    #[test]
    fn test_parse_nonce_invalid_returns_zero() {
        // Garbage input must not panic and must fall back to 0
        assert_eq!(parse_nonce("not_a_hex_string"), 0);
    }
}
