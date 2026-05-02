import { DEFAULT_NODES, getNodeStatus } from "@axionax/sdk";

/**
 * One-shot log lines derived from live RPC (server-only). Pairs with LogViewer for a live feel.
 */
export async function buildLogSeedLines(): Promise<string[]> {
  const lines: string[] = [];
  const iso = new Date().toISOString();
  lines.push(`${iso}  axionax-os  INFO  log collector · Obsidian shell`);
  lines.push(`${iso}  axionax-os  INFO  polling ${DEFAULT_NODES.length} configured endpoints`);

  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  for (const s of statuses) {
    const st = s.online ? "OK" : "OFFLINE";
    const h = s.blockNumber != null ? String(s.blockNumber) : "—";
    const p = s.peerCount != null ? String(s.peerCount) : "—";
    lines.push(
      `${iso}  net      ${st.padEnd(7)}  ${s.endpoint.name}  height=${h}  peers=${p}  ${s.latencyMs}ms`,
    );
    if (s.error) {
      lines.push(`${iso}  net      WARN  ${s.endpoint.name}: ${s.error}`);
    }
  }

  lines.push(`${iso}  p2p      INFO  tail follows · connector WebSocket planned (core §7)`);
  return lines;
}
