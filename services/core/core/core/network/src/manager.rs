//! Network manager for P2P communication

use futures::StreamExt;
use libp2p::{
    core::ConnectedPoint, gossipsub, identify, identity::Keypair, mdns, multiaddr::Protocol,
    swarm::SwarmEvent, Multiaddr, PeerId, Swarm, SwarmBuilder,
};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

/// Interval between periodic P2P health summaries emitted by the swarm task.
const P2P_HEALTH_INTERVAL: Duration = Duration::from_secs(30);

use crate::{
    behaviour::AxionaxBehaviour,
    config::NetworkConfig,
    error::{NetworkError, Result},
    protocol::{MessageType, NetworkMessage},
};

/// Network manager handles P2P communication.
///
/// After [`NetworkManager::start`] is called, the underlying libp2p swarm is
/// moved into a dedicated tokio task that polls events and processes outbound
/// messages. The manager itself becomes a thin handle that:
/// - sends outbound messages through `message_tx`
/// - exposes the inbound event receiver once via [`Self::take_event_receiver`]
/// - reports peer count via an atomic counter updated by the swarm task
pub struct NetworkManager {
    /// Swarm is `Some` until [`Self::start`] consumes it into the swarm task.
    swarm: Option<Swarm<AxionaxBehaviour>>,
    config: NetworkConfig,
    local_peer_id: PeerId,
    /// Outbound message channel. The swarm task drains `message_rx`; callers
    /// publish by sending on `message_tx` (cloned cheaply).
    message_tx: mpsc::Sender<NetworkMessage>,
    message_rx: Option<mpsc::Receiver<NetworkMessage>>,
    /// Channel for forwarding incoming network messages to the node layer.
    event_tx: mpsc::Sender<NetworkMessage>,
    event_rx: Option<mpsc::Receiver<NetworkMessage>>,
    /// Live peer count, updated by the swarm task on connection events.
    peer_count: Arc<AtomicUsize>,
}

/// Network events
#[derive(Debug, Clone)]
pub enum NetworkEvent {
    /// New peer connected
    PeerConnected(PeerId),
    /// Peer disconnected
    PeerDisconnected(PeerId),
    /// New message received
    MessageReceived {
        peer: PeerId,
        message: Box<NetworkMessage>,
    },
    /// Message published successfully
    MessagePublished { message_id: String },
}

impl NetworkManager {
    /// Load a persisted keypair from `path`, or generate a new one and save it.
    fn load_or_generate_keypair(path: &Path) -> Result<Keypair> {
        if path.exists() {
            let bytes = std::fs::read(path).map_err(|e| {
                NetworkError::InitializationError(format!("Cannot read key file: {}", e))
            })?;
            let kp = Keypair::from_protobuf_encoding(&bytes).map_err(|e| {
                NetworkError::InitializationError(format!("Invalid key file: {}", e))
            })?;
            info!("Loaded node identity from {}", path.display());
            return Ok(kp);
        }

        let kp = Keypair::generate_ed25519();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                NetworkError::InitializationError(format!("Cannot create key dir: {}", e))
            })?;
        }
        let encoded = kp.to_protobuf_encoding().map_err(|e| {
            NetworkError::InitializationError(format!("Cannot encode keypair: {}", e))
        })?;
        std::fs::write(path, &encoded).map_err(|e| {
            NetworkError::InitializationError(format!("Cannot write key file: {}", e))
        })?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
        }

        info!(
            "Generated and saved new node identity to {}",
            path.display()
        );
        Ok(kp)
    }

    /// Create new network manager
    pub async fn new(config: NetworkConfig) -> Result<Self> {
        info!("Initializing network manager");

        let keypair = match &config.key_file {
            Some(path) => Self::load_or_generate_keypair(path)?,
            None => Keypair::generate_ed25519(),
        };
        let local_peer_id = PeerId::from(keypair.public());

        info!("Local peer ID: {}", local_peer_id);

        // Create network behaviour using the node's actual keypair
        let behaviour = AxionaxBehaviour::new(&keypair, &config)
            .map_err(|e| NetworkError::InitializationError(e.to_string()))?;

        // Build swarm
        let swarm = SwarmBuilder::with_existing_identity(keypair)
            .with_tokio()
            .with_tcp(
                libp2p::tcp::Config::default(),
                libp2p::noise::Config::new,
                libp2p::yamux::Config::default,
            )
            .map_err(|e| NetworkError::InitializationError(e.to_string()))?
            .with_quic()
            .with_behaviour(|_| behaviour)
            .map_err(|e| NetworkError::InitializationError(e.to_string()))?
            .with_swarm_config(|cfg| cfg.with_idle_connection_timeout(config.idle_timeout))
            .build();

        // Create message channels (bounded to apply backpressure)
        let (message_tx, message_rx) = mpsc::channel(1000);
        // Channel for forwarding inbound gossipsub messages to the node
        let (event_tx, event_rx) = mpsc::channel(1000);

        Ok(Self {
            swarm: Some(swarm),
            config,
            local_peer_id,
            message_tx,
            message_rx: Some(message_rx),
            event_tx,
            event_rx: Some(event_rx),
            peer_count: Arc::new(AtomicUsize::new(0)),
        })
    }

    /// Start the network manager.
    ///
    /// Sets up the listener and bootstrap dials, then moves the swarm into a
    /// dedicated tokio task that drives the libp2p event loop. After this
    /// call returns, the swarm is no longer accessible directly through
    /// `self`; outbound messages must go through `publish()`/`message_tx`.
    pub async fn start(&mut self) -> Result<()> {
        info!("Starting network manager");

        let mut swarm = self
            .swarm
            .take()
            .ok_or_else(|| NetworkError::InitializationError("already started".into()))?;
        let message_rx = self
            .message_rx
            .take()
            .ok_or_else(|| NetworkError::InitializationError("message_rx already taken".into()))?;

        // Listen on configured address
        let listen_addr: Multiaddr = self.config.listen_multiaddr().parse().map_err(|e| {
            NetworkError::InitializationError(format!("Invalid listen address: {}", e))
        })?;

        swarm
            .listen_on(listen_addr.clone())
            .map_err(|e| NetworkError::InitializationError(e.to_string()))?;

        info!("Listening on {}", listen_addr);

        // Apply external-address strategy. For Manual mode the operator has
        // told us our public multiaddrs; advertising them lets remote peers
        // dial back through NAT.
        Self::apply_external_addr_strategy(&mut swarm, &self.config);

        // Subscribe to topics
        Self::subscribe_to_topics_swarm(&mut swarm)?;

        // Dial bootstrap nodes
        Self::dial_bootstrap_nodes(&mut swarm, &self.config.bootstrap_nodes);

        // Hand the swarm to a dedicated task that drives the event loop
        let event_tx = self.event_tx.clone();
        let peer_count = self.peer_count.clone();
        tokio::spawn(async move {
            run_swarm_loop(swarm, message_rx, event_tx, peer_count).await;
        });
        info!("Swarm event loop task spawned");

        Ok(())
    }

    /// Subscribe to all standard network topics.
    fn subscribe_to_topics_swarm(swarm: &mut Swarm<AxionaxBehaviour>) -> Result<()> {
        let topics = [
            MessageType::Blocks,
            MessageType::Transactions,
            MessageType::Consensus,
            MessageType::Status,
        ];

        for topic in topics {
            let topic_name = topic.topic_name();
            swarm
                .behaviour_mut()
                .subscribe(&topic_name)
                .map_err(|e| NetworkError::SubscriptionError(e.to_string()))?;
            debug!("Subscribed to topic: {}", topic_name);
        }

        Ok(())
    }

    /// Apply the configured [`ExternalAddrStrategy`].
    ///
    /// For [`ExternalAddrStrategy::Manual`] this calls `swarm.add_external_address`
    /// for every entry the operator supplied (config or `AXIONAX_EXTERNAL_ADDRS`
    /// env). Auto / Disabled are no-ops here — Auto relies on Identify to fill
    /// the address book later, Disabled deliberately advertises nothing.
    fn apply_external_addr_strategy(
        swarm: &mut Swarm<AxionaxBehaviour>,
        config: &NetworkConfig,
    ) {
        use crate::config::ExternalAddrStrategy;

        if config.external_addr_strategy == ExternalAddrStrategy::Disabled {
            info!(
                target: "p2p",
                "ExternalAddrStrategy::Disabled — node will not advertise an external address"
            );
            return;
        }

        // `resolved_external_addrs()` honours AXIONAX_EXTERNAL_ADDRS /
        // AXIONAX_PUBLIC_IP env vars and auto-promotes Auto → effective
        // Manual when one is set — see NetworkConfig::resolved_external_addrs.
        let addrs = config.resolved_external_addrs();

        if addrs.is_empty() {
            match config.external_addr_strategy {
                ExternalAddrStrategy::Manual => warn!(
                    target: "p2p",
                    "ExternalAddrStrategy::Manual selected but no external addrs \
                     configured (set AXIONAX_EXTERNAL_ADDRS, AXIONAX_PUBLIC_IP, or \
                     NetworkConfig.external_addrs)"
                ),
                ExternalAddrStrategy::Auto => debug!(
                    target: "p2p",
                    "ExternalAddrStrategy::Auto — relying on Identify-observed addresses \
                     (set AXIONAX_PUBLIC_IP=<your public ip> to advertise explicitly)"
                ),
                ExternalAddrStrategy::Disabled => unreachable!(),
            }
            return;
        }

        for raw in &addrs {
            match raw.parse::<Multiaddr>() {
                Ok(addr) => {
                    swarm.add_external_address(addr.clone());
                    info!(
                        target: "p2p",
                        external_addr = %addr,
                        source = ?config.external_addr_strategy,
                        "Advertising external address"
                    );
                }
                Err(e) => warn!(
                    target: "p2p",
                    invalid = %raw,
                    error = %e,
                    "Skipping invalid external address"
                ),
            }
        }
    }

    /// Dial each configured bootstrap node, registering its address with the
    /// behaviour first so subsequent gossip/Kademlia traffic can find them.
    fn dial_bootstrap_nodes(swarm: &mut Swarm<AxionaxBehaviour>, nodes: &[String]) {
        if nodes.is_empty() {
            debug!("No bootstrap nodes configured");
            return;
        }

        info!("Connecting to {} bootstrap nodes", nodes.len());

        for node in nodes {
            match node.parse::<Multiaddr>() {
                Ok(addr) => {
                    if let Some(Protocol::P2p(peer_id)) = addr.iter().last() {
                        swarm.behaviour_mut().add_address(&peer_id, addr.clone());

                        match swarm.dial(addr.clone()) {
                            Ok(_) => info!("Dialing bootstrap node: {}", addr),
                            Err(e) => warn!("Failed to dial bootstrap node {}: {}", addr, e),
                        }
                    } else {
                        warn!("Bootstrap node missing /p2p/<PeerId> suffix: {}", node);
                    }
                }
                Err(e) => warn!("Invalid bootstrap node address {}: {}", node, e),
            }
        }
    }

    /// Publish a message to the network.
    ///
    /// After [`Self::start`] runs the swarm in its own task, this enqueues the
    /// message on the outbound channel; the swarm task picks it up and gossips
    /// it. Returns an error only if the channel is closed (i.e. the swarm
    /// task has terminated).
    pub fn publish(&self, message: NetworkMessage) -> Result<()> {
        self.message_tx
            .try_send(message)
            .map_err(|e| NetworkError::SendError(format!("outbound channel: {}", e)))?;
        Ok(())
    }

    /// Get a clone of the outbound message sender.
    pub fn message_sender(&self) -> mpsc::Sender<NetworkMessage> {
        self.message_tx.clone()
    }

    /// Get local peer ID
    pub fn local_peer_id(&self) -> &PeerId {
        &self.local_peer_id
    }

    /// Get number of currently connected peers.
    ///
    /// Reads the atomic counter that the swarm task maintains.
    pub fn peer_count(&self) -> usize {
        self.peer_count.load(Ordering::Relaxed)
    }

    /// Take the inbound-event receiver.  The caller (e.g. the Node) owns this
    /// receiver and reads incoming blocks / transactions from the network.
    /// Can only be called once; subsequent calls return `None`.
    pub fn take_event_receiver(&mut self) -> Option<mpsc::Receiver<NetworkMessage>> {
        self.event_rx.take()
    }

    /// Get list of connected peers.
    ///
    /// After `start()`, the authoritative peer list lives inside the swarm
    /// task; this returns an empty vec since the manager no longer holds the
    /// swarm. Use `peer_count()` for an up-to-date count.
    pub fn connected_peers(&self) -> Vec<PeerId> {
        // Swarm has been moved into the run task; the authoritative list is
        // not exposed here to keep the boundary simple.
        Vec::new()
    }

    /// Gracefully shut down the network manager.
    ///
    /// Currently a no-op once the swarm is owned by the spawned task; the
    /// task terminates when the message channel is dropped (i.e. when this
    /// `NetworkManager` is dropped). Kept for API compatibility.
    pub async fn shutdown(&mut self) {
        // Dropping this manager closes `message_tx`, which causes the swarm
        // task to exit on its next `message_rx.recv()` returning `None`.
        let count = self.peer_count.load(Ordering::Relaxed);
        info!(
            "Network manager shutting down ({} peers connected)",
            count
        );
    }
}

/// Drive the libp2p swarm: poll events, drain outbound messages, and update
/// the shared peer counter on connection events.
///
/// Owns the `Swarm` exclusively — this is the single point where the swarm is
/// driven. Returns when `message_rx` is closed (i.e. the manager is dropped).
async fn run_swarm_loop(
    mut swarm: Swarm<AxionaxBehaviour>,
    mut message_rx: mpsc::Receiver<NetworkMessage>,
    event_tx: mpsc::Sender<NetworkMessage>,
    peer_count: Arc<AtomicUsize>,
) {
    info!("Network swarm event loop running");

    let mut health_tick = tokio::time::interval(P2P_HEALTH_INTERVAL);
    // Skip the immediate first tick — we just started.
    health_tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let _ = health_tick.tick().await;

    loop {
        tokio::select! {
            event = swarm.select_next_some() => {
                handle_swarm_event(&mut swarm, event, &event_tx, &peer_count).await;
            }
            maybe_msg = message_rx.recv() => {
                match maybe_msg {
                    Some(message) => {
                        if let Err(e) = publish_on_swarm(&mut swarm, &message) {
                            error!("Error publishing message: {}", e);
                        }
                    }
                    None => {
                        info!("Outbound channel closed; terminating swarm task");
                        break;
                    }
                }
            }
            _ = health_tick.tick() => {
                emit_p2p_health(&swarm, &peer_count);
            }
        }
    }
}

/// Periodic structured log of the node's P2P health.
///
/// Emits the local peer id, atomic peer count, the set of addresses the swarm
/// is currently listening on, and a count of external addresses that remote
/// peers have reported via Identify. This is the single most useful signal
/// when debugging "nodes work on localhost but never connect over public IPs".
fn emit_p2p_health(swarm: &Swarm<AxionaxBehaviour>, peer_count: &Arc<AtomicUsize>) {
    let listeners: Vec<String> = swarm.listeners().map(|m| m.to_string()).collect();
    let external_addrs: Vec<String> = swarm.external_addresses().map(|m| m.to_string()).collect();
    let count = peer_count.load(Ordering::Relaxed);

    info!(
        target: "p2p::health",
        peers = count,
        listening = ?listeners,
        external = ?external_addrs,
        local_peer_id = %swarm.local_peer_id(),
        "P2P health summary"
    );

    if external_addrs.is_empty() {
        warn!(
            target: "p2p::health",
            "No external addresses observed yet — node may be behind NAT or firewall. \
             Verify the host advertises a reachable /ip4/<PUBLIC_IP>/tcp/{} multiaddr.",
            listeners
                .iter()
                .find_map(|s| s.split('/').nth(4))
                .unwrap_or("<port>")
        );
    }
}

fn publish_on_swarm(swarm: &mut Swarm<AxionaxBehaviour>, message: &NetworkMessage) -> Result<()> {
    let topic = message.message_type().topic_name();
    let data = message
        .to_bytes()
        .map_err(NetworkError::SerializationError)?;

    swarm
        .behaviour_mut()
        .publish(&topic, data)
        .map_err(|e| NetworkError::SendError(e.to_string()))?;

    debug!("Published message to topic: {}", topic);
    Ok(())
}

async fn handle_swarm_event(
    swarm: &mut Swarm<AxionaxBehaviour>,
    event: SwarmEvent<crate::behaviour::AxionaxBehaviourEvent>,
    event_tx: &mpsc::Sender<NetworkMessage>,
    peer_count: &Arc<AtomicUsize>,
) {
    match event {
        SwarmEvent::NewListenAddr { address, .. } => {
            info!(target: "p2p", listen_addr = %address, "Listening on new address");
        }
        SwarmEvent::ExpiredListenAddr { address, .. } => {
            warn!(target: "p2p", listen_addr = %address, "Listen address expired");
        }
        SwarmEvent::ListenerClosed { addresses, reason, .. } => {
            warn!(
                target: "p2p",
                ?addresses,
                ?reason,
                "Listener closed"
            );
        }
        SwarmEvent::Behaviour(event) => {
            handle_behaviour_event(swarm, event, event_tx).await;
        }
        SwarmEvent::ConnectionEstablished {
            peer_id,
            connection_id,
            endpoint,
            num_established,
            ..
        } => {
            let n = peer_count.fetch_add(1, Ordering::Relaxed) + 1;
            let (direction, addr) = match &endpoint {
                ConnectedPoint::Dialer { address, .. } => ("outgoing", address.to_string()),
                ConnectedPoint::Listener { send_back_addr, .. } => {
                    ("incoming", send_back_addr.to_string())
                }
            };
            info!(
                target: "p2p::conn",
                %peer_id,
                connection_id = ?connection_id,
                direction,
                addr,
                num_established = num_established.get(),
                total_peers = n,
                "Peer connection established"
            );
        }
        SwarmEvent::ConnectionClosed {
            peer_id,
            connection_id,
            cause,
            num_established,
            ..
        } => {
            // Saturating decrement
            let prev = peer_count.load(Ordering::Relaxed);
            let new = prev.saturating_sub(1);
            peer_count.store(new, Ordering::Relaxed);
            info!(
                target: "p2p::conn",
                %peer_id,
                connection_id = ?connection_id,
                cause = ?cause,
                remaining_to_peer = num_established,
                total_peers = new,
                "Peer connection closed"
            );
        }
        SwarmEvent::IncomingConnection {
            connection_id,
            local_addr,
            send_back_addr,
        } => {
            debug!(
                target: "p2p::conn",
                connection_id = ?connection_id,
                %local_addr,
                %send_back_addr,
                "Incoming connection"
            );
        }
        SwarmEvent::OutgoingConnectionError {
            peer_id,
            connection_id,
            error,
        } => {
            warn!(
                target: "p2p::conn",
                connection_id = ?connection_id,
                peer_id = ?peer_id,
                %error,
                "Outgoing connection error"
            );
        }
        SwarmEvent::IncomingConnectionError {
            connection_id,
            local_addr,
            send_back_addr,
            error,
        } => {
            warn!(
                target: "p2p::conn",
                connection_id = ?connection_id,
                %local_addr,
                %send_back_addr,
                %error,
                "Incoming connection error"
            );
        }
        SwarmEvent::Dialing { peer_id, connection_id } => {
            debug!(
                target: "p2p::conn",
                peer_id = ?peer_id,
                connection_id = ?connection_id,
                "Dialing peer"
            );
        }
        SwarmEvent::NewExternalAddrCandidate { address } => {
            info!(
                target: "p2p",
                %address,
                "Discovered new external address candidate"
            );
        }
        SwarmEvent::ExternalAddrConfirmed { address } => {
            info!(
                target: "p2p",
                %address,
                "External address confirmed (reachable from outside)"
            );
        }
        SwarmEvent::ExternalAddrExpired { address } => {
            warn!(target: "p2p", %address, "External address expired");
        }
        _ => {}
    }
}

async fn handle_behaviour_event(
    swarm: &mut Swarm<AxionaxBehaviour>,
    event: crate::behaviour::AxionaxBehaviourEvent,
    event_tx: &mpsc::Sender<NetworkMessage>,
) {
    use crate::behaviour::AxionaxBehaviourEvent;

    match event {
        AxionaxBehaviourEvent::Gossipsub(gossipsub::Event::Message {
            propagation_source,
            message_id,
            message,
        }) => {
            debug!(
                "Gossipsub message from {}: id={}, {} bytes",
                propagation_source,
                message_id,
                message.data.len()
            );

            match NetworkMessage::from_bytes(&message.data) {
                Ok(net_msg) => {
                    if event_tx.try_send(net_msg).is_err() {
                        warn!(
                            "Inbound event channel full; dropping message {}",
                            message_id
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        "Failed to deserialize gossipsub message from {}: {}",
                        propagation_source, e
                    );
                }
            }
        }
        AxionaxBehaviourEvent::Mdns(mdns::Event::Discovered(peers)) => {
            for (peer_id, addr) in peers {
                debug!(target: "p2p::mdns", %peer_id, %addr, "mDNS discovered peer");
                swarm.behaviour_mut().add_address(&peer_id, addr);
            }
        }
        AxionaxBehaviourEvent::Mdns(mdns::Event::Expired(peers)) => {
            for (peer_id, _addr) in peers {
                debug!(target: "p2p::mdns", %peer_id, "mDNS peer expired");
            }
        }
        AxionaxBehaviourEvent::Identify(identify::Event::Received {
            peer_id,
            info,
            ..
        }) => {
            // The peer told us which address *they* observed for us — this is
            // the single most useful piece of information when debugging why
            // a node behind NAT can't be reached on its public IP.
            info!(
                target: "p2p::identify",
                %peer_id,
                observed_addr = %info.observed_addr,
                protocol_version = %info.protocol_version,
                agent_version = %info.agent_version,
                listen_addr_count = info.listen_addrs.len(),
                "Identify received from peer"
            );

            // Feed observed addresses into Kademlia so the DHT learns reachable
            // routes back to this peer.
            for addr in &info.listen_addrs {
                swarm.behaviour_mut().add_address(&peer_id, addr.clone());
            }
        }
        AxionaxBehaviourEvent::Identify(identify::Event::Sent { peer_id, .. }) => {
            debug!(target: "p2p::identify", %peer_id, "Identify sent to peer");
        }
        AxionaxBehaviourEvent::Identify(identify::Event::Error { peer_id, error, .. }) => {
            warn!(target: "p2p::identify", %peer_id, %error, "Identify protocol error");
        }
        _ => {
            // Kademlia, Ping — handled automatically by libp2p; surface only on errors.
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_network_manager_creation() {
        let config = NetworkConfig::dev();
        let manager = NetworkManager::new(config).await;
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_peer_id_generation() {
        let config = NetworkConfig::dev();
        let manager = NetworkManager::new(config).await.unwrap();
        let peer_id = manager.local_peer_id();
        assert!(!peer_id.to_string().is_empty());
    }
}
