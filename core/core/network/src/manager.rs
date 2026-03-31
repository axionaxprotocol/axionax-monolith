//! Network manager for P2P communication

use futures::StreamExt;
use libp2p::{
    gossipsub, mdns,
    identity::Keypair, multiaddr::Protocol, swarm::SwarmEvent, Multiaddr, PeerId, Swarm,
    SwarmBuilder,
};
use std::path::Path;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use crate::{
    behaviour::AxionaxBehaviour,
    config::NetworkConfig,
    error::{NetworkError, Result},
    protocol::{MessageType, NetworkMessage},
};

/// Network manager handles P2P communication
pub struct NetworkManager {
    swarm: Swarm<AxionaxBehaviour>,
    config: NetworkConfig,
    local_peer_id: PeerId,
    _message_tx: mpsc::Sender<NetworkMessage>,
    message_rx: mpsc::Receiver<NetworkMessage>,
    /// Channel for forwarding incoming network messages to the node layer.
    event_tx: mpsc::Sender<NetworkMessage>,
    event_rx: Option<mpsc::Receiver<NetworkMessage>>,
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
            let bytes = std::fs::read(path)
                .map_err(|e| NetworkError::InitializationError(format!("Cannot read key file: {}", e)))?;
            let kp = Keypair::from_protobuf_encoding(&bytes)
                .map_err(|e| NetworkError::InitializationError(format!("Invalid key file: {}", e)))?;
            info!("Loaded node identity from {}", path.display());
            return Ok(kp);
        }

        let kp = Keypair::generate_ed25519();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| NetworkError::InitializationError(format!("Cannot create key dir: {}", e)))?;
        }
        let encoded = kp.to_protobuf_encoding()
            .map_err(|e| NetworkError::InitializationError(format!("Cannot encode keypair: {}", e)))?;
        std::fs::write(path, &encoded)
            .map_err(|e| NetworkError::InitializationError(format!("Cannot write key file: {}", e)))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
        }

        info!("Generated and saved new node identity to {}", path.display());
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
            swarm,
            config,
            local_peer_id,
            _message_tx: message_tx,
            message_rx,
            event_tx,
            event_rx: Some(event_rx),
        })
    }

    /// Start the network manager
    pub async fn start(&mut self) -> Result<()> {
        info!("Starting network manager");

        // Listen on configured address
        let listen_addr: Multiaddr = self.config.listen_multiaddr().parse().map_err(|e| {
            NetworkError::InitializationError(format!("Invalid listen address: {}", e))
        })?;

        self.swarm
            .listen_on(listen_addr.clone())
            .map_err(|e| NetworkError::InitializationError(e.to_string()))?;

        info!("Listening on {}", listen_addr);

        // Subscribe to topics
        self.subscribe_to_topics()?;

        // Connect to bootstrap nodes
        self.connect_bootstrap_nodes().await?;

        Ok(())
    }

    /// Subscribe to network topics
    fn subscribe_to_topics(&mut self) -> Result<()> {
        let topics = vec![
            MessageType::Blocks,
            MessageType::Transactions,
            MessageType::Consensus,
            MessageType::Status,
        ];

        for topic in topics {
            let topic_name = topic.topic_name();
            self.swarm
                .behaviour_mut()
                .subscribe(&topic_name)
                .map_err(|e| NetworkError::SubscriptionError(e.to_string()))?;
            debug!("Subscribed to topic: {}", topic_name);
        }

        Ok(())
    }

    /// Connect to bootstrap nodes
    async fn connect_bootstrap_nodes(&mut self) -> Result<()> {
        if self.config.bootstrap_nodes.is_empty() {
            debug!("No bootstrap nodes configured");
            return Ok(());
        }

        info!(
            "Connecting to {} bootstrap nodes",
            self.config.bootstrap_nodes.len()
        );

        for node in &self.config.bootstrap_nodes {
            match node.parse::<Multiaddr>() {
                Ok(addr) => {
                    if let Some(Protocol::P2p(peer_id)) = addr.iter().last() {
                        self.swarm
                            .behaviour_mut()
                            .add_address(&peer_id, addr.clone());

                        match self.swarm.dial(addr.clone()) {
                            Ok(_) => info!("Dialing bootstrap node: {}", addr),
                            Err(e) => warn!("Failed to dial bootstrap node {}: {}", addr, e),
                        }
                    }
                }
                Err(e) => warn!("Invalid bootstrap node address {}: {}", node, e),
            }
        }

        Ok(())
    }

    /// Publish message to network
    pub fn publish(&mut self, message: NetworkMessage) -> Result<()> {
        let topic = message.message_type().topic_name();
        let data = message
            .to_bytes()
            .map_err(NetworkError::SerializationError)?;

        self.swarm
            .behaviour_mut()
            .publish(&topic, data)
            .map_err(|e| NetworkError::SendError(e.to_string()))?;

        debug!("Published message to topic: {}", topic);
        Ok(())
    }

    /// Get local peer ID
    pub fn local_peer_id(&self) -> &PeerId {
        &self.local_peer_id
    }

    /// Get number of connected peers
    pub fn peer_count(&self) -> usize {
        self.swarm.behaviour().peer_count()
    }

    /// Take the inbound-event receiver.  The caller (e.g. the Node) owns this
    /// receiver and reads incoming blocks / transactions from the network.
    /// Can only be called once; subsequent calls return `None`.
    pub fn take_event_receiver(&mut self) -> Option<mpsc::Receiver<NetworkMessage>> {
        self.event_rx.take()
    }

    /// Get list of connected peers
    pub fn connected_peers(&self) -> Vec<PeerId> {
        self.swarm
            .behaviour()
            .connected_peers()
            .iter()
            .map(|&peer_id| *peer_id)
            .collect()
    }

    /// Gracefully shut down the network manager.
    /// Disconnects all active peers; the swarm resources are released on drop.
    pub async fn shutdown(&mut self) {
        let peers: Vec<PeerId> = self.connected_peers();
        let count = peers.len();
        for peer_id in peers {
            let _ = self.swarm.disconnect_peer_id(peer_id);
        }
        info!("Network manager shut down ({} peers disconnected)", count);
    }

    /// Run the network event loop
    pub async fn run(&mut self) -> Result<()> {
        info!("Network manager running");

        loop {
            tokio::select! {
                // Handle swarm events
                event = self.swarm.select_next_some() => {
                    if let Err(e) = self.handle_swarm_event(event).await {
                        error!("Error handling swarm event: {}", e);
                    }
                }

                // Handle outgoing messages
                Some(message) = self.message_rx.recv() => {
                    if let Err(e) = self.publish(message) {
                        error!("Error publishing message: {}", e);
                    }
                }
            }
        }
    }

    /// Handle swarm events
    async fn handle_swarm_event(
        &mut self,
        event: SwarmEvent<crate::behaviour::AxionaxBehaviourEvent>,
    ) -> Result<()> {
        match event {
            SwarmEvent::NewListenAddr { address, .. } => {
                info!("Listening on {}", address);
            }
            SwarmEvent::Behaviour(event) => {
                self.handle_behaviour_event(event).await;
            }
            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                info!("Connected to peer: {}", peer_id);
            }
            SwarmEvent::ConnectionClosed { peer_id, cause, .. } => {
                info!("Disconnected from peer {}: {:?}", peer_id, cause);
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

        Ok(())
    }

    /// Dispatch a behaviour-level event (gossipsub, mDNS, identify, etc.)
    async fn handle_behaviour_event(&mut self, event: crate::behaviour::AxionaxBehaviourEvent) {
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
                        if self.event_tx.try_send(net_msg).is_err() {
                            warn!("Inbound event channel full; dropping message {}", message_id);
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
                    self.swarm.behaviour_mut().add_address(&peer_id, addr);
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
