//! Live log streaming over WebSocket for the Axionax OS dashboard.
//!
//! Architecture
//! ============
//!
//! ```text
//!  ┌──────────────────┐   tracing event   ┌──────────────────┐
//!  │  tracing macros  │ ────────────────▶ │  fmt::Layer      │
//!  │  (info!, warn!)  │                   │  + custom Writer │
//!  └──────────────────┘                   └────────┬─────────┘
//!                                                  │ formatted line
//!                                                  ▼
//!                                  ┌─────────────────────────┐
//!                                  │  broadcast::Sender<String>  │
//!                                  └────────┬────────────────┘
//!                                           │ subscribe()
//!                ┌──────────────────────────┼────────────────────────┐
//!                ▼                          ▼                        ▼
//!     WebSocket client #1          WebSocket client #2     ...
//! ```
//!
//! `LogChannel` owns a `tokio::sync::broadcast::Sender<String>`. A
//! `tracing_subscriber::fmt::Layer` writes each formatted line into the
//! channel via the [`MakeBroadcastWriter`] adapter. WebSocket clients
//! `subscribe()` to receive lines.
//!
//! Wiring (typical `axionax-node` startup)
//! --------------------------------------
//! ```ignore
//! use rpc::ws_logs::{LogChannel, MakeBroadcastWriter, ws_router};
//! use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
//!
//! let log_channel = LogChannel::new();
//!
//! tracing_subscriber::registry()
//!     .with(EnvFilter::from_default_env())
//!     .with(tracing_subscriber::fmt::layer())                                    // stdout
//!     .with(tracing_subscriber::fmt::layer()
//!         .with_writer(MakeBroadcastWriter::new(log_channel.clone()))            // broadcast
//!         .with_ansi(false)                                                      // dashboards prefer raw
//!         .compact())
//!     .init();
//!
//! // Mount the WebSocket route alongside the regular HTTP health server.
//! let app = ws_router(log_channel.clone());
//! axum::serve(listener, app).await?;
//! ```
//!
//! Connect from the dashboard:
//! ```js
//! const ws = new WebSocket("ws://localhost:8546/logs");
//! ws.onmessage = (e) => terminal.write(e.data);
//! ```

use std::io::{self, Write};
use std::sync::{Arc, Mutex};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use tokio::sync::broadcast;
use tracing_subscriber::fmt::MakeWriter;

/// Number of buffered log lines. Lagging subscribers drop oldest first.
const CHANNEL_CAPACITY: usize = 1024;

/// Cheap-to-clone handle around a `broadcast` channel of formatted log lines.
///
/// Drop semantics: the underlying `Sender` lives as long as any clone; when
/// the last `LogChannel` is dropped, all subscribers receive `Closed`.
#[derive(Clone)]
pub struct LogChannel {
    sender: broadcast::Sender<String>,
}

impl LogChannel {
    /// Create a new channel with the default capacity.
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(CHANNEL_CAPACITY);
        Self { sender }
    }

    /// Subscribe to the stream. New subscribers do **not** receive backlog.
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.sender.subscribe()
    }

    /// Number of currently active subscribers.
    pub fn subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }

    /// Manually publish a synthetic line — useful for tests.
    pub fn emit(&self, line: impl Into<String>) {
        let _ = self.sender.send(line.into());
    }
}

impl Default for LogChannel {
    fn default() -> Self {
        Self::new()
    }
}

// ----------------------------------------------------------------------------
// MakeWriter adapter so the channel can plug into `tracing_subscriber::fmt`.
// ----------------------------------------------------------------------------

/// `tracing_subscriber::fmt::MakeWriter` adapter that ships every formatted
/// log line into the wrapped [`LogChannel`].
///
/// Cheap to clone (it only holds an `Arc`).
#[derive(Clone)]
pub struct MakeBroadcastWriter {
    inner: Arc<Inner>,
}

struct Inner {
    sender: broadcast::Sender<String>,
    /// Per-thread line buffer. `tracing_subscriber::fmt` may issue multiple
    /// `write` calls per event, so we buffer until newline.
    buf: Mutex<Vec<u8>>,
}

impl MakeBroadcastWriter {
    pub fn new(channel: LogChannel) -> Self {
        Self {
            inner: Arc::new(Inner {
                sender: channel.sender,
                buf: Mutex::new(Vec::with_capacity(256)),
            }),
        }
    }
}

/// The `Write` half handed to `fmt::Layer`. Holds a clone of the `Arc<Inner>`.
pub struct BroadcastWriter {
    inner: Arc<Inner>,
}

impl Write for BroadcastWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let mut guard = self
            .inner
            .buf
            .lock()
            .map_err(|_| io::Error::new(io::ErrorKind::Other, "log buffer poisoned"))?;
        guard.extend_from_slice(buf);

        // Drain complete lines (split on '\n').
        while let Some(idx) = guard.iter().position(|&b| b == b'\n') {
            let line: Vec<u8> = guard.drain(..=idx).collect();
            // Try UTF-8; non-UTF-8 lines are silently dropped — this matches
            // typical tracing output which is always UTF-8.
            if let Ok(text) = std::str::from_utf8(&line) {
                // Trim the trailing newline so dashboards can format freely.
                let trimmed = text.trim_end_matches(['\r', '\n']).to_string();
                if !trimmed.is_empty() {
                    let _ = self.inner.sender.send(trimmed);
                }
            }
        }
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

impl<'a> MakeWriter<'a> for MakeBroadcastWriter {
    type Writer = BroadcastWriter;
    fn make_writer(&'a self) -> Self::Writer {
        BroadcastWriter {
            inner: self.inner.clone(),
        }
    }
}

// ----------------------------------------------------------------------------
// Axum router exposing the WebSocket endpoint.
// ----------------------------------------------------------------------------

/// Build an `axum::Router` that serves a single WebSocket endpoint at `/logs`.
///
/// Mount this anywhere the operator chooses (typical: `:8546`, alongside the
/// JSON-RPC WebSocket).
pub fn ws_router(channel: LogChannel) -> Router {
    Router::new()
        .route("/logs", get(ws_handler))
        .with_state(channel)
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(channel): State<LogChannel>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| stream_logs(socket, channel))
}

async fn stream_logs(mut socket: WebSocket, channel: LogChannel) {
    let mut rx = channel.subscribe();

    // Greet the client so the dashboard can verify the channel is alive even
    // when the node is quiet.
    let _ = socket
        .send(Message::Text(
            serde_json::json!({ "kind": "hello", "subscribers": channel.subscriber_count() })
                .to_string(),
        ))
        .await;

    loop {
        tokio::select! {
            recv = rx.recv() => match recv {
                Ok(line) => {
                    if socket.send(Message::Text(line)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(skipped)) => {
                    // Tell the client we dropped messages so they can hint at
                    // dashboard backpressure.
                    let warn = serde_json::json!({
                        "kind": "lagged",
                        "skipped": skipped,
                    }).to_string();
                    if socket.send(Message::Text(warn)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Closed) => break,
            },
            client = socket.recv() => match client {
                None | Some(Err(_)) | Some(Ok(Message::Close(_))) => break,
                Some(Ok(Message::Ping(p))) => {
                    if socket.send(Message::Pong(p)).await.is_err() { break; }
                }
                _ => { /* ignore client text/binary */ }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn channel_subscriber_counts() {
        let c = LogChannel::new();
        assert_eq!(c.subscriber_count(), 0);
        let _r1 = c.subscribe();
        let _r2 = c.subscribe();
        assert_eq!(c.subscriber_count(), 2);
    }

    #[tokio::test]
    async fn writer_publishes_complete_lines_only() {
        let channel = LogChannel::new();
        let mut rx = channel.subscribe();
        let mw = MakeBroadcastWriter::new(channel.clone());

        let mut w = mw.make_writer();
        // Two writes to compose a single line — typical of fmt::Layer.
        w.write_all(b"hello ").unwrap();
        w.write_all(b"world\n").unwrap();
        // Partial line — should not flush.
        w.write_all(b"partial").unwrap();

        let msg = rx.try_recv().expect("expected one complete line");
        assert_eq!(msg, "hello world");
        assert!(rx.try_recv().is_err(), "partial line must be buffered");
    }

    #[tokio::test]
    async fn manual_emit_round_trip() {
        let c = LogChannel::new();
        let mut rx = c.subscribe();
        c.emit("synthetic");
        assert_eq!(rx.recv().await.unwrap(), "synthetic");
    }
}
