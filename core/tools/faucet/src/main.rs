use axum::{
    extract::{ConnectInfo, State, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::net::SocketAddr;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};
use reqwest::Client;
use tower_http::cors::{CorsLayer, AllowOrigin};
use axum::http::HeaderValue;
use tracing::{info, error, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use dashmap::DashMap;

use crypto::hash;
use ed25519_dalek::SigningKey;
use blockchain::Transaction;

#[derive(Clone)]
struct AppState {
    client: Client,
    rpc_url: String,
    signing_key: Arc<SigningKey>,
    faucet_address: String,
    chain_id: u64,
    amount_per_request: u128,
    addr_limiter: Arc<DashMap<String, u64>>,  // address -> timestamp
    ip_limiter: Arc<DashMap<String, u64>>,    // IP -> timestamp
    cooldown_secs: u64,                       // configurable cooldown (default 86400)
}

#[derive(Deserialize)]
struct RequestFunds {
    address: String,
}

#[derive(Serialize)]
struct Response {
    status: String,
    tx_hash: Option<String>,
    message: Option<String>,
}

#[derive(Serialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: Vec<serde_json::Value>,
    id: u64,
}

#[derive(Deserialize)]
struct JsonRpcResponse<T> {
    result: Option<T>,
    error: Option<JsonRpcError>,
}

#[derive(Deserialize)]
struct JsonRpcError {
    message: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();
    let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "http://localhost:8545".to_string());
    let chain_id = env::var("CHAIN_ID").unwrap_or_else(|_| "86137".to_string()).parse::<u64>()?;
    let private_key_hex = env::var("FAUCET_PRIVATE_KEY").expect("FAUCET_PRIVATE_KEY must be set");
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string()).parse::<u16>()?;

    // Load private key
    // Assuming private key is 32 bytes hex
    let pk_bytes = hex::decode(private_key_hex.strip_prefix("0x").unwrap_or(&private_key_hex))
        .map_err(|e| anyhow::anyhow!("FAUCET_PRIVATE_KEY contains invalid hex: {e}"))?;
    
    // We need to construct SigningKey from bytes. 
    // Since crypto::signature::generate_keypair() returns SigningKey, and we want to load one,
    // we might need to use ed25519_dalek directly if crypto doesn't expose `from_bytes`.
    // Checking crypto lib.rs, SigningKey is re-exported from ed25519_dalek.
    // But `crypto::signature` doesn't expose `from_bytes`. 
    // However, `crypto::VRF` does: `SigningKey::from_bytes`.
    // Since we depend on `crypto`, and `SigningKey` is public there (via use ed25519_dalek::SigningKey), 
    // we can use ed25519_dalek methods if we import it.
    // BUT we didn't add `ed25519-dalek` to our Cargo.toml, only `crypto`.
    // Wait, `crypto` re-exports `SigningKey`.
    // Let's check `crypto/src/lib.rs` again. `use ed25519_dalek::{...}`. It does NOT `pub use`.
    // But `VRF` struct has `pub fn from_signing_key(signing_key: SigningKey)`.
    // The `SigningKey` type is visible in signature.
    // Actually, `crypto/src/lib.rs` does NOT `pub use ed25519_dalek`.
    // It says `use ed25519_dalek::{...}` inside the module.
    // So `SigningKey` might not be accessible outside unless re-exported.
    // `pub mod signature` uses `super::*`.
    // It returns `SigningKey` in `generate_keypair`. So `SigningKey` MUST be public.
    
    // Assuming we can use `ed25519_dalek::SigningKey` via `crypto::signature`.
    // Let's assume `crypto` crate exposes it. If not, I'll need to add `ed25519-dalek` to Cargo.toml.
    // I'll add `ed25519-dalek` to Cargo.toml just in case.
    // Wait, I already wrote Cargo.toml.
    
    // Let's try to trust `crypto` crate. If compilation fails, I'll fix it.
    // But `crypto::signature::generate_keypair()` returns `SigningKey`.
    // So `SigningKey` is definitely available.
    
    // However, loading from bytes might need `ed25519_dalek::SigningKey::from_bytes(&bytes)`.
    // Since `crypto` doesn't export `from_bytes` wrapper, I might need direct access.
    
    // I'll just assume I can't load it easily without `ed25519-dalek`. 
    // I will rewrite Cargo.toml to include it if needed.
    
    // WORKAROUND: Generate a random key for now if we can't load it, OR better:
    // Rely on `crypto::signature::generate_keypair()` and print it on startup if we can't load.
    // But for a Faucet, we need persistence.
    
    // Let's assume I need `ed25519-dalek` dependency.
    // I'll update Cargo.toml in next step if verification fails.
    
    let pk_array: [u8; 32] = pk_bytes.try_into()
        .map_err(|v: Vec<u8>| anyhow::anyhow!("FAUCET_PRIVATE_KEY must be 32 bytes, got {}", v.len()))?;
    let signing_key = ed25519_dalek::SigningKey::from_bytes(&pk_array);
    let verifying_key = signing_key.verifying_key();
    
    // Derive address
    // Address = 0x + hex(keccak256(pubkey)[12..])
    let pub_bytes = verifying_key.to_bytes();
    let hash = hash::keccak256(&pub_bytes);
    let faucet_address = format!("0x{}", hex::encode(&hash[12..]));
    
    info!("Faucet initialized");
    info!("Address: {}", faucet_address);
    info!("Chain ID: {}", chain_id);
    info!("RPC URL: {}", rpc_url);

    let cooldown_secs: u64 = env::var("RATE_LIMIT_MINUTES")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .map(|m| m * 60)
        .unwrap_or(86400); // default 24h

    let amount: u128 = env::var("FAUCET_AMOUNT")
        .ok()
        .and_then(|v| v.parse::<u128>().ok())
        .unwrap_or(100);

    info!("Rate limit: {} seconds ({} hours)", cooldown_secs, cooldown_secs / 3600);
    info!("Amount per request: {} AXX", amount);

    let app_state = AppState {
        client: Client::new(),
        rpc_url,
        signing_key: Arc::new(signing_key),
        faucet_address,
        chain_id,
        amount_per_request: amount * 10_u128.pow(18),
        addr_limiter: Arc::new(DashMap::new()),
        ip_limiter: Arc::new(DashMap::new()),
        cooldown_secs,
    };

    // CORS: restrict to CORS_ORIGINS in production (comma-separated); unset = permissive
    let cors_layer = match env::var("CORS_ORIGINS") {
        Ok(v) if !v.trim().is_empty() => {
            let origins: Vec<HeaderValue> = v
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .filter_map(|s| s.parse().ok())
                .collect();
            if origins.is_empty() {
                CorsLayer::permissive()
            } else {
                CorsLayer::new().allow_origin(AllowOrigin::list(origins))
            }
        }
        _ => CorsLayer::permissive(),
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/info", get(info_handler))
        .route("/request", post(request_handler))
        .layer(cors_layer)
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;

    Ok(())
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "OK")
}

async fn info_handler(State(state): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "address": state.faucet_address,
        "chain_id": state.chain_id,
        "amount_per_request": state.amount_per_request.to_string(),
        "status": "operational"
    }))
}

/// EVM address: 0x + 40 hex chars, not the zero address.
fn is_valid_evm_address(s: &str) -> bool {
    let s = s.strip_prefix("0x").unwrap_or(s);
    if s.len() != 40 {
        return false;
    }
    if s == "0000000000000000000000000000000000000000" {
        return false;
    }
    s.chars().all(|c| c.is_ascii_hexdigit())
}

async fn request_handler(
    ConnectInfo(client_addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
    Json(payload): Json<RequestFunds>,
) -> impl IntoResponse {
    let address = payload.address.trim();
    if !is_valid_evm_address(address) {
        return (
            StatusCode::BAD_REQUEST,
            Json(Response {
                status: "error".to_string(),
                tx_hash: None,
                message: Some("Invalid address: must be 0x + 40 hex chars, not zero address.".to_string()),
            }),
        ).into_response();
    }
    let address = if address.starts_with("0x") {
        address.to_string()
    } else {
        format!("0x{}", address)
    };
    let client_ip = client_addr.ip().to_string();
    info!("Received request for {} from {}", address, client_ip);

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let cooldown = state.cooldown_secs;

    // Rate limit per IP
    if let Some(last) = state.ip_limiter.get(&client_ip) {
        if now - *last < cooldown {
            let remaining = cooldown - (now - *last);
            warn!("IP rate limited: {} ({}s remaining)", client_ip, remaining);
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(Response {
                    status: "error".to_string(),
                    tx_hash: None,
                    message: Some(format!("Rate limit: 1 request per {}h per IP. Try again in {}m.",
                        cooldown / 3600, remaining / 60 + 1)),
                }),
            ).into_response();
        }
    }

    // Rate limit per address
    if let Some(last) = state.addr_limiter.get(&address) {
        if now - *last < cooldown {
            let remaining = cooldown - (now - *last);
            warn!("Address rate limited: {} ({}s remaining)", address, remaining);
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(Response {
                    status: "error".to_string(),
                    tx_hash: None,
                    message: Some(format!("Rate limit: 1 request per {}h per address. Try again in {}m.",
                        cooldown / 3600, remaining / 60 + 1)),
                }),
            ).into_response();
        }
    }

    // Get nonce
    let nonce = match get_nonce(&state.client, &state.rpc_url, &state.faucet_address).await {
        Ok(n) => n,
        Err(e) => {
            error!("Failed to get nonce: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(Response {
                    status: "error".to_string(),
                    tx_hash: None,
                    message: Some("Failed to get nonce from RPC".to_string()),
                }),
            ).into_response();
        }
    };

    let pub_key = state.signing_key.verifying_key();
    let mut tx = Transaction {
        hash: [0u8; 32],
        from: state.faucet_address.clone(),
        to: address.clone(),
        value: state.amount_per_request,
        gas_price: 20,
        gas_limit: 21000,
        nonce,
        data: vec![],
        signature: vec![],
        signer_public_key: pub_key.to_bytes().to_vec(),
    };

    tx.compute_hash();
    let payload = tx.signing_payload();
    tx.signature = crypto::signature::sign(&state.signing_key, &payload);
    
    // Serialize to JSON bytes
    // Since we defined `eth_sendRawTransaction` to take hex string of JSON bytes
    let tx_json = match serde_json::to_vec(&tx) {
        Ok(v) => v,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(Response {
                status: "error".to_string(),
                tx_hash: None,
                message: Some(format!("Failed to serialize transaction: {e}")),
            })).into_response();
        }
    };
    let tx_hex = format!("0x{}", hex::encode(tx_json));

    // Send transaction
    match send_raw_transaction(&state.client, &state.rpc_url, tx_hex).await {
        Ok(hash) => {
            state.addr_limiter.insert(address.clone(), now);
            state.ip_limiter.insert(client_ip.clone(), now);
            info!("Sent funds to {}: {}", address, hash);
            (
                StatusCode::OK,
                Json(Response {
                    status: "success".to_string(),
                    tx_hash: Some(hash),
                    message: Some("Funds sent successfully".to_string()),
                }),
            ).into_response()
        },
        Err(e) => {
            error!("Failed to send transaction: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(Response {
                    status: "error".to_string(),
                    tx_hash: None,
                    message: Some(format!("Failed to send transaction: {}", e)),
                }),
            ).into_response()
        }
    }
}

async fn get_nonce(client: &Client, rpc_url: &str, address: &str) -> anyhow::Result<u64> {
    let request = JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        method: "eth_getTransactionCount".to_string(),
        params: vec![serde_json::json!(address), serde_json::json!("latest")],
        id: 1,
    };

    let res = client.post(rpc_url)
        .json(&request)
        .send()
        .await?;

    let body: JsonRpcResponse<String> = res.json().await?;
    
    if let Some(err) = body.error {
        return Err(anyhow::anyhow!("RPC error: {}", err.message));
    }

    if let Some(result) = body.result {
        let hex = result.strip_prefix("0x").unwrap_or(&result);
        Ok(u64::from_str_radix(hex, 16)?)
    } else {
        Ok(0) // Default to 0 if no result (or error handling needed)
    }
}

async fn send_raw_transaction(client: &Client, rpc_url: &str, tx_hex: String) -> anyhow::Result<String> {
    let request = JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        method: "eth_sendRawTransaction".to_string(),
        params: vec![serde_json::json!(tx_hex)],
        id: 1,
    };

    let res = client.post(rpc_url)
        .json(&request)
        .send()
        .await?;

    let body: JsonRpcResponse<String> = res.json().await?;
    
    if let Some(err) = body.error {
        return Err(anyhow::anyhow!("RPC error: {}", err.message));
    }

    if let Some(result) = body.result {
        Ok(result)
    } else {
        Err(anyhow::anyhow!("No result from RPC"))
    }
}
