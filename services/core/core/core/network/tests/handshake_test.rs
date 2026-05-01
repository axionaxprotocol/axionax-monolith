//! P2P handshake / discovery integration tests.
//!
//! These tests spin up two `NetworkManager` instances inside the same process
//! on different TCP ports and verify that they can find each other via mDNS,
//! complete the libp2p handshake (TCP → noise → multistream-select →
//! gossipsub subscribe), and report a non-zero `peer_count`.
//!
//! Why this exists: when a real cross-cloud peering attempt stalls, it's
//! useful to have a *local* baseline that we know works. If this test fails,
//! the regression is in our network code, not the operator's firewall.
//!
//! Marked `#[ignore]` because mDNS multicast can be flaky on CI runners and
//! Windows hosts. Run explicitly with:
//!
//! ```bash
//! cargo test -p network --test handshake_test -- --ignored --nocapture
//! ```

use std::time::Duration;

use network::{
    config::{ExternalAddrStrategy, NetworkConfig, ValidationMode},
    manager::NetworkManager,
};
use tokio::time::{sleep, Instant};

/// Build a config tuned for in-process discovery: tiny chain id, mDNS on,
/// no Strict gossipsub validation (saves us from signing test messages).
fn local_config(port: u16) -> NetworkConfig {
    NetworkConfig {
        port,
        chain_id: 99_999, // isolate from any real network sharing the host
        enable_mdns: true,
        enable_kad: true,
        max_peers: 10,
        validation_mode: ValidationMode::None,
        bootstrap_nodes: vec![],
        external_addr_strategy: ExternalAddrStrategy::Disabled,
        block_time_seconds: 1,
        ..NetworkConfig::default()
    }
}

/// Wait until either manager reports a peer, polling at 100ms.
/// Returns (a_peers, b_peers) snapshot when threshold is met or after timeout.
async fn await_peering(
    a: &NetworkManager,
    b: &NetworkManager,
    timeout: Duration,
) -> (usize, usize) {
    let deadline = Instant::now() + timeout;
    loop {
        let (pa, pb) = (a.peer_count(), b.peer_count());
        if pa > 0 && pb > 0 {
            return (pa, pb);
        }
        if Instant::now() >= deadline {
            return (pa, pb);
        }
        sleep(Duration::from_millis(100)).await;
    }
}

#[tokio::test]
#[ignore] // requires multicast — run explicitly with `--ignored`
async fn handshake_two_local_nodes_via_mdns() {
    // Initialize tracing so `--nocapture` shows the diagnostic logs.
    let _ = tracing_subscriber::fmt()
        .with_env_filter("info,network=debug,p2p=debug,p2p::conn=debug,p2p::mdns=debug,p2p::identify=debug")
        .with_test_writer()
        .try_init();

    // Pick two non-default ports to avoid clashing with a real node.
    let mut node_a = NetworkManager::new(local_config(40_801))
        .await
        .expect("create node A");
    let mut node_b = NetworkManager::new(local_config(40_802))
        .await
        .expect("create node B");

    let id_a = *node_a.local_peer_id();
    let id_b = *node_b.local_peer_id();
    eprintln!("node A peer id = {id_a}");
    eprintln!("node B peer id = {id_b}");
    assert_ne!(id_a, id_b, "two managers must have distinct peer IDs");

    node_a.start().await.expect("start node A");
    node_b.start().await.expect("start node B");

    // Give libp2p a generous window: TCP listen → mDNS announce → discovery
    // → noise handshake → multistream → gossipsub subscribe.
    let (pa, pb) = await_peering(&node_a, &node_b, Duration::from_secs(15)).await;

    assert!(
        pa > 0 && pb > 0,
        "expected both nodes to reach peer_count > 0; got A={pa}, B={pb}.\n\
         If this fails on CI, mDNS multicast is likely blocked. Try running locally."
    );
}

#[tokio::test]
async fn handshake_distinct_peer_ids() {
    // Cheap deterministic check that doesn't need multicast: two fresh
    // managers must always have different peer IDs.
    let a = NetworkManager::new(local_config(40_811))
        .await
        .expect("create A");
    let b = NetworkManager::new(local_config(40_812))
        .await
        .expect("create B");
    assert_ne!(a.local_peer_id(), b.local_peer_id());
}

#[tokio::test]
async fn external_addr_strategy_manual_advertises_supplied_addrs() {
    // Smoke-test: building a manager with Manual + external_addrs must not
    // panic and the resolved list must round-trip.
    let config = NetworkConfig {
        port: 40_821,
        external_addr_strategy: ExternalAddrStrategy::Manual,
        external_addrs: vec!["/ip4/203.0.113.42/tcp/40821".to_string()],
        ..local_config(40_821)
    };
    let resolved = config.resolved_external_addrs();
    assert_eq!(resolved.len(), 1);
    assert!(resolved[0].contains("203.0.113.42"));

    // Constructing should still succeed; start() would actually advertise.
    let _ = NetworkManager::new(config)
        .await
        .expect("manager construction must not depend on Manual addrs being reachable");
}
