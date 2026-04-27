//! Network manager for P2P communication

use futures::StreamExt;
use libp2p::{
    gossipsub, identity::Keypair, mdns, multiaddr::Protocol, swarm::SwarmEvent, Multiaddr, PeerId,
    Swarm, SwarmBuilder,
};
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

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
        }
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
            info!("Listening on {}", address);
        }
        SwarmEvent::Behaviour(event) => {
            handle_behaviour_event(swarm, event, event_tx).await;
        }
        SwarmEvent::ConnectionEstablished { peer_id, .. } => {
            let n = peer_count.fetch_add(1, Ordering::Relaxed) + 1;
            info!("Connected to peer: {} (total={})", peer_id, n);
        }
        SwarmEvent::ConnectionClosed { peer_id, cause, .. } => {
            // Saturating decrement
            let prev = peer_count.load(Ordering::Relaxed);
            let new = prev.saturating_sub(1);
            peer_count.store(new, Ordering::Relaxed);
            info!(
                "Disconnected from peer {}: {:?} (total={})",
                peer_id, cause, new
            );
        }
        SwarmEvent::IncomingConnection { send_back_addr, .. } => {
            debug!("Incoming connection from {}", send_back_addr);
        }
        SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => {
            if let Some(peer_id) = peer_id {
                warn!("Outgoing connection error to {}: {}", peer_id, error);
            } else {
                warn!("Outgoing connection error: {}", error);
            }
        }
        SwarmEvent::IncomingConnectionError {
            send_back_addr,
            error,
            ..
        } => {
            warn!(
                "Incoming connection error from {}: {}",
                send_back_addr, error
            );
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
                debug!("mDNS discovered peer {} at {}", peer_id, addr);
                swarm.behaviour_mut().add_address(&peer_id, addr);
            }
        }
        AxionaxBehaviourEvent::Mdns(mdns::Event::Expired(peers)) => {
            for (peer_id, _addr) in peers {
                debug!("mDNS expired peer {}", peer_id);
            }
        }
        _ => {
            // Identify, Kademlia, Ping — handled automatically by libp2p
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
