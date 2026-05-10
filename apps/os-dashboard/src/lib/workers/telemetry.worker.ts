const telemetryBuffer: Record<string, any> = {};
let isDirty = false;
let ws: WebSocket | null = null;
let reconnectTimer: number;
let reconnectAttempts = 0;

// Flush buffer to main thread at fixed interval (100ms = 10 FPS)
// Keeps the main thread entirely free from JSON.parse and dictionary merging
setInterval(() => {
  if (isDirty) {
    self.postMessage({ type: "TELEMETRY_FLUSH", payload: telemetryBuffer });
    // Reset buffer
    for (const key in telemetryBuffer) delete telemetryBuffer[key];
    isDirty = false;
  }
}, 100);

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === "CONNECT") {
    connect(e.data.url);
  } else if (e.data.type === "DISCONNECT") {
    if (ws) ws.close();
    clearTimeout(reconnectTimer);
  }
};

function connect(url: string) {
  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      self.postMessage({ type: "WS_STATUS", payload: "connected" });
    };

    ws.onclose = () => {
      self.postMessage({ type: "WS_STATUS", payload: "disconnected" });
      const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
      const jitter = Math.random() * 500;
      reconnectTimer = self.setTimeout(() => connect(url), delay + jitter);
      reconnectAttempts++;
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "telemetry") {
          // O(1) in-memory buffer on worker thread
          telemetryBuffer[payload.account_number] = { portfolio: payload.portfolio };
          isDirty = true;
        } else if (payload.type === "event") {
          // Immediately forward critical risk events
          self.postMessage({ type: "NEW_EVENT", payload: payload.data });
        }
      } catch (e) {
        // Drop malformed
      }
    };
  } catch (err) {
    self.postMessage({ type: "WS_STATUS", payload: "disconnected" });
  }
}
