//! Event System - Pub/Sub for blockchain events
//!
//! Enables real-time subscriptions for:
//! - New blocks
//! - New transactions
//! - Staking events (stake, unstake, delegate, slash)
//! - Governance events (proposal, vote, execute)
//! - Peer events (connect, disconnect)

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tracing::{debug, info};

/// Event types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum EventType {
    // Chain events
    NewBlock,
    NewTransaction,
    Reorg,

    // Staking events
    Stake,
    Unstake,
    Delegate,
    Undelegate,
    Slash,
    RewardsClaimed,

    // Governance events
    ProposalCreated,
    Vote,
    ProposalFinalized,
    ProposalExecuted,

    // Network events
    PeerConnected,
    PeerDisconnected,

    // System events
    SyncStarted,
    SyncCompleted,

    // All events (wildcard)
    All,
}

/// Event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    /// Event ID (auto-incremented)
    pub id: u64,

    /// Event type
    pub event_type: EventType,

    /// Timestamp (Unix ms)
    pub timestamp: u64,

    /// Block number (if applicable)
    pub block_number: Option<u64>,

    /// Transaction hash (if applicable)
    pub tx_hash: Option<String>,

    /// Address involved (if applicable)
    pub address: Option<String>,

    /// Event-specific data
    pub data: EventData,
}

/// Event-specific data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventData {
    Block(BlockEventData),
    Transaction(TxEventData),
    Staking(StakingEventData),
    Governance(GovEventData),
    Peer(PeerEventData),
    Empty,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockEventData {
    pub number: u64,
    pub hash: String,
    pub parent_hash: String,
    pub tx_count: usize,
    pub proposer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxEventData {
    pub hash: String,
    pub from: String,
    pub to: Option<String>,
    pub value: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingEventData {
    pub validator: String,
    pub delegator: Option<String>,
    pub amount: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovEventData {
    pub proposal_id: u64,
    pub proposer: Option<String>,
    pub voter: Option<String>,
    pub vote: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerEventData {
    pub peer_id: String,
    pub address: String,
}

/// Subscription handle
pub struct Subscription {
    pub id: u64,
    pub event_types: Vec<EventType>,
    pub receiver: broadcast::Receiver<Event>,
}

/// Event Bus - Central event dispatcher
pub struct EventBus {
    /// Broadcast sender
    sender: broadcast::Sender<Event>,

    /// Event ID counter
    next_id: AtomicU64,

    /// Subscription counter
    next_sub_id: AtomicU64,

    /// Active subscriptions (for stats)
    subscriptions: Arc<RwLock<HashMap<u64, Vec<EventType>>>>,

    /// Event history (recent events)
    history: Arc<RwLock<VecDeque<Event>>>,

    /// Max history size
    max_history: usize,

    /// Max concurrent subscriptions
    max_subscriptions: usize,
}

impl EventBus {
    /// Create new event bus
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self {
            sender,
            next_id: AtomicU64::new(1),
            next_sub_id: AtomicU64::new(1),
            subscriptions: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(VecDeque::new())),
            max_history: 1000,
            max_subscriptions: 100,
        }
    }

    /// Publish an event
    pub async fn publish(&self, event_type: EventType, data: EventData) -> u64 {
        let event = Event {
            id: self.next_id.fetch_add(1, Ordering::SeqCst),
            event_type: event_type.clone(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            block_number: None,
            tx_hash: None,
            address: None,
            data,
        };

        let event_id = event.id;

        // Add to history
        {
            let mut history = self.history.write().await;
            history.push_back(event.clone());
            if history.len() > self.max_history {
                history.pop_front();
            }
        }

        // Broadcast
        let _ = self.sender.send(event);

        debug!("Published event {} of type {:?}", event_id, event_type);
        event_id
    }

    /// Publish with full event data
    pub async fn publish_full(&self, mut event: Event) -> u64 {
        event.id = self.next_id.fetch_add(1, Ordering::SeqCst);
        event.timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let event_id = event.id;
        let event_type = event.event_type.clone();

        // Add to history
        {
            let mut history = self.history.write().await;
            history.push_back(event.clone());
            if history.len() > self.max_history {
                history.pop_front();
            }
        }

        let _ = self.sender.send(event);

        debug!("Published event {} of type {:?}", event_id, event_type);
        event_id
    }

    /// Subscribe to events. Returns None if max subscriptions reached.
    pub async fn subscribe(&self, event_types: Vec<EventType>) -> Option<Subscription> {
        {
            let subs = self.subscriptions.read().await;
            if subs.len() >= self.max_subscriptions {
                tracing::warn!("Max subscriptions ({}) reached, rejecting", self.max_subscriptions);
                return None;
            }
        }
        let sub_id = self.next_sub_id.fetch_add(1, Ordering::SeqCst);
        let receiver = self.sender.subscribe();

        // Track subscription
        {
            let mut subs = self.subscriptions.write().await;
            subs.insert(sub_id, event_types.clone());
        }

        info!("New subscription {} for {:?}", sub_id, event_types);

        Some(Subscription {
            id: sub_id,
            event_types,
            receiver,
        })
    }

    /// Unsubscribe
    pub async fn unsubscribe(&self, sub_id: u64) {
        let mut subs = self.subscriptions.write().await;
        subs.remove(&sub_id);
        info!("Unsubscribed {}", sub_id);
    }

    /// Get recent events
    pub async fn get_history(&self, count: usize) -> Vec<Event> {
        let history = self.history.read().await;
        history.iter().rev().take(count).cloned().collect()
    }

    /// Get events by type
    pub async fn get_events_by_type(&self, event_type: EventType, count: usize) -> Vec<Event> {
        let history = self.history.read().await;
        history
            .iter()
            .rev()
            .filter(|e| e.event_type == event_type)
            .take(count)
            .cloned()
            .collect()
    }

    /// Get subscription count
    pub async fn subscription_count(&self) -> usize {
        self.subscriptions.read().await.len()
    }

    /// Get total events published
    pub fn total_events(&self) -> u64 {
        self.next_id.load(Ordering::SeqCst) - 1
    }
}

/// Helper for publishing common events
impl EventBus {
    /// Publish new block event
    pub async fn emit_new_block(
        &self,
        number: u64,
        hash: String,
        parent_hash: String,
        tx_count: usize,
        proposer: String,
    ) -> u64 {
        let event = Event {
            id: 0,
            event_type: EventType::NewBlock,
            timestamp: 0,
            block_number: Some(number),
            tx_hash: None,
            address: Some(proposer.clone()),
            data: EventData::Block(BlockEventData {
                number,
                hash,
                parent_hash,
                tx_count,
                proposer,
            }),
        };
        self.publish_full(event).await
    }

    /// Publish stake event
    pub async fn emit_stake(&self, validator: String, amount: String) -> u64 {
        self.publish(
            EventType::Stake,
            EventData::Staking(StakingEventData {
                validator,
                delegator: None,
                amount,
                action: "stake".to_string(),
            }),
        )
        .await
    }

    /// Publish delegation event
    pub async fn emit_delegation(
        &self,
        delegator: String,
        validator: String,
        amount: String,
    ) -> u64 {
        self.publish(
            EventType::Delegate,
            EventData::Staking(StakingEventData {
                validator,
                delegator: Some(delegator),
                amount,
                action: "delegate".to_string(),
            }),
        )
        .await
    }

    /// Publish proposal created event
    pub async fn emit_proposal_created(&self, proposal_id: u64, proposer: String) -> u64 {
        self.publish(
            EventType::ProposalCreated,
            EventData::Governance(GovEventData {
                proposal_id,
                proposer: Some(proposer),
                voter: None,
                vote: None,
                status: Some("active".to_string()),
            }),
        )
        .await
    }

    /// Publish vote event
    pub async fn emit_vote(&self, proposal_id: u64, voter: String, vote: String) -> u64 {
        self.publish(
            EventType::Vote,
            EventData::Governance(GovEventData {
                proposal_id,
                proposer: None,
                voter: Some(voter),
                vote: Some(vote),
                status: None,
            }),
        )
        .await
    }

    /// Publish peer connected event
    pub async fn emit_peer_connected(&self, peer_id: String, address: String) -> u64 {
        self.publish(
            EventType::PeerConnected,
            EventData::Peer(PeerEventData { peer_id, address }),
        )
        .await
    }
}

/// Filter events based on subscription
impl Subscription {
    /// Check if event matches subscription
    pub fn matches(&self, event: &Event) -> bool {
        if self.event_types.contains(&EventType::All) {
            return true;
        }
        self.event_types.contains(&event.event_type)
    }

    /// Receive next matching event
    pub async fn recv(&mut self) -> Result<Event, broadcast::error::RecvError> {
        loop {
            let event = self.receiver.recv().await?;
            if self.matches(&event) {
                return Ok(event);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_publish_subscribe() {
        let bus = EventBus::new(100);

        let mut sub = bus.subscribe(vec![EventType::NewBlock]).await.unwrap();

        bus.emit_new_block(
            1,
            "0x123".to_string(),
            "0x000".to_string(),
            10,
            "0xval".to_string(),
        )
        .await;

        let event = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            sub.recv(),
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(event.event_type, EventType::NewBlock);
        assert_eq!(event.block_number, Some(1));
    }

    #[tokio::test]
    async fn test_event_filtering() {
        let bus = EventBus::new(100);

        let mut sub = bus.subscribe(vec![EventType::Stake]).await.unwrap();

        // This should NOT be received
        bus.emit_new_block(1, "0x".to_string(), "0x".to_string(), 0, "0x".to_string()).await;

        // This SHOULD be received
        bus.emit_stake("0xval".to_string(), "1000".to_string()).await;

        let event = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            sub.recv(),
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(event.event_type, EventType::Stake);
    }

    #[tokio::test]
    async fn test_history() {
        let bus = EventBus::new(100);

        bus.emit_stake("0x1".to_string(), "100".to_string()).await;
        bus.emit_stake("0x2".to_string(), "200".to_string()).await;

        let history = bus.get_history(10).await;
        assert_eq!(history.len(), 2);
    }

    #[tokio::test]
    async fn test_wildcard_subscription() {
        let bus = EventBus::new(100);

        let mut sub = bus.subscribe(vec![EventType::All]).await.unwrap();

        bus.emit_stake("0x1".to_string(), "100".to_string()).await;
        bus.emit_vote(1, "0x1".to_string(), "for".to_string()).await;

        // Should receive both
        let e1 = sub.recv().await.unwrap();
        let e2 = sub.recv().await.unwrap();

        assert_eq!(e1.event_type, EventType::Stake);
        assert_eq!(e2.event_type, EventType::Vote);
    }
}
