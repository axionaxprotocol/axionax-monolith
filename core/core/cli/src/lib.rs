//! Axionax CLI — library of testable helpers

use serde_json::Value;

/// Format a hex block number string to decimal
pub fn hex_to_decimal(hex: &str) -> u64 {
    u64::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0)
}

/// Format balance from wei hex string to AXX (divide by 10^18)
pub fn wei_to_axx(hex: &str) -> f64 {
    let wei = u128::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0);
    wei as f64 / 1e18
}

/// Build a JSON-RPC request body
pub fn build_rpc_request(method: &str, params: Vec<Value>) -> Value {
    serde_json::json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    })
}

/// Parse RPC response — returns result value or error string
pub fn parse_rpc_response(response: &Value) -> Result<Value, String> {
    if let Some(error) = response.get("error") {
        return Err(format!("RPC Error: {}", error));
    }
    Ok(response["result"].clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_to_decimal() {
        assert_eq!(hex_to_decimal("0x0"), 0);
        assert_eq!(hex_to_decimal("0x1"), 1);
        assert_eq!(hex_to_decimal("0xa"), 10);
        assert_eq!(hex_to_decimal("0x64"), 100);
        assert_eq!(hex_to_decimal("0xff"), 255);
        assert_eq!(hex_to_decimal("0x15079"), 86137); // testnet chain ID
    }

    #[test]
    fn test_hex_to_decimal_no_prefix() {
        assert_eq!(hex_to_decimal("64"), 100);
        assert_eq!(hex_to_decimal("ff"), 255);
    }

    #[test]
    fn test_wei_to_axx() {
        // 1 AXX = 1e18 wei
        let one_axx = format!("0x{:x}", 1_000_000_000_000_000_000u128);
        assert!((wei_to_axx(&one_axx) - 1.0).abs() < 1e-9);

        // 0 wei
        assert_eq!(wei_to_axx("0x0"), 0.0);

        // 0.5 AXX
        let half_axx = format!("0x{:x}", 500_000_000_000_000_000u128);
        assert!((wei_to_axx(&half_axx) - 0.5).abs() < 1e-9);
    }

    #[test]
    fn test_build_rpc_request() {
        let req = build_rpc_request("eth_blockNumber", vec![]);
        assert_eq!(req["jsonrpc"], "2.0");
        assert_eq!(req["method"], "eth_blockNumber");
        assert_eq!(req["id"], 1);
        assert!(req["params"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_build_rpc_request_with_params() {
        let req = build_rpc_request(
            "eth_getBlockByNumber",
            vec![serde_json::json!("0x64"), serde_json::json!(false)],
        );
        assert_eq!(req["method"], "eth_getBlockByNumber");
        assert_eq!(req["params"][0], "0x64");
        assert_eq!(req["params"][1], false);
    }

    #[test]
    fn test_parse_rpc_response_success() {
        let response = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "result": "0x64"
        });
        let result = parse_rpc_response(&response);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "0x64");
    }

    #[test]
    fn test_parse_rpc_response_error() {
        let response = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "error": { "code": -32601, "message": "Method not found" }
        });
        let result = parse_rpc_response(&response);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("RPC Error"));
    }

    #[test]
    fn test_parse_rpc_response_null_result() {
        let response = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "result": null
        });
        let result = parse_rpc_response(&response);
        assert!(result.is_ok());
        assert!(result.unwrap().is_null());
    }
}
