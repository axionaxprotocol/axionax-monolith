"use client";

// Live node monitor — block height, peer count, latency, with a sparkline.
//
// Polls every 5s by default (cheap; no streaming dependency yet). Once
// `rpc::ws_logs` is mounted on the node, this widget can listen on
// `/logs?target=metrics` and bypass polling entirely.

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Network, Wifi, type LucideIcon } from "lucide-react";

import { DEFAULT_NODES, getNodeStatus, type NodeEndpoint, type NodeStatus } from "@/lib/rpc";

const SAMPLE_LIMIT = 30;

interface Sample {
  t: number;
  block: number | null;
  peers: number | null;
  latency: number;
}

export interface NodeMonitorProps {
  endpoint?: NodeEndpoint;
  intervalMs?: number;
}

export function NodeMonitor({
  endpoint = DEFAULT_NODES[0]!,
  intervalMs = 5_000,
}: NodeMonitorProps) {
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const next = await getNodeStatus(endpoint);
      if (cancelled) return;
      setStatus(next);
      setSamples((curr) => {
        const sample: Sample = {
          t: Date.now(),
          block: next.blockNumber,
          peers: next.peerCount,
          latency: next.latencyMs,
        };
        const merged = [...curr, sample];
        return merged.length > SAMPLE_LIMIT ? merged.slice(-SAMPLE_LIMIT) : merged;
      });
    };
    void tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [endpoint, intervalMs]);

  const blocksPerMin = useMemo(() => derivedBlocksPerMin(samples), [samples]);
  const uptime = formatDuration(Date.now() - startedAt.current);

  const healthy = status?.online ?? false;
  const blockSeries = samples.map((s) => s.block ?? 0);
  const peerSeries = samples.map((s) => s.peers ?? 0);

  return (
    <div className="h-full flex flex-col gap-3 p-4 bg-obsidian-950/40">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Node Monitor
          </div>
          <div className="font-medium truncate">{endpoint.name}</div>
          <div className="font-mono text-[10px] text-zinc-500 truncate">{endpoint.url}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            healthy
              ? "bg-accent-ok/10 text-accent-ok animate-neon-pulse"
              : "bg-accent-danger/10 text-accent-danger"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              healthy ? "bg-accent-ok" : "bg-accent-danger"
            }`}
          />
          {healthy ? "online" : "offline"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Block height"
          value={status?.blockNumber?.toLocaleString() ?? "—"}
          hint={`${blocksPerMin.toFixed(1)} blk/min`}
          Icon={Activity}
          tone="chain"
        />
        <Stat
          label="Peers"
          value={status?.peerCount?.toString() ?? "—"}
          hint={status?.chainId ? `chain ${parseInt(status.chainId, 16)}` : ""}
          Icon={Network}
          tone="ai"
        />
        <Stat
          label="Latency"
          value={status ? `${status.latencyMs} ms` : "—"}
          hint={status?.error ? truncate(status.error, 32) : ""}
          Icon={Wifi}
          tone={status && status.latencyMs < 250 ? "ai" : "warn"}
        />
        <Stat
          label="Uptime"
          value={uptime}
          hint="since widget mount"
          Icon={Cpu}
          tone="chain"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-[80px]">
        <Sparkline label="block height" data={blockSeries} color="var(--accent-chain, #6366f1)" />
        <Sparkline label="peers" data={peerSeries} color="var(--accent-ai, #5eead4)" />
      </div>
    </div>
  );
}

const TONE_CLS: Record<string, string> = {
  ai: "text-accent-ai",
  chain: "text-accent-chain",
  warn: "text-accent-warn",
  danger: "text-accent-danger",
  ok: "text-accent-ok",
};

function Stat({
  label,
  value,
  hint,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  tone: keyof typeof TONE_CLS;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <Icon size={14} className={TONE_CLS[tone]} />
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-zinc-500 truncate">{hint}</div>}
    </div>
  );
}

function Sparkline({
  label,
  data,
  color,
}: {
  label: string;
  data: number[];
  color: string;
}) {
  if (data.length < 2) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/5 p-3 flex flex-col">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="flex-1 grid place-items-center text-[10px] text-zinc-600">
          collecting samples…
        </div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const W = 120;
  const H = 36;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-3 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="font-mono text-[10px] text-zinc-400 tabular-nums">
          {data[data.length - 1]?.toLocaleString() ?? "—"}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-1 flex-1 w-full"
        role="img"
        aria-label={`${label} sparkline`}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    </div>
  );
}

function derivedBlocksPerMin(samples: Sample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  if (first.block == null || last.block == null) return 0;
  const dtMin = (last.t - first.t) / 60_000;
  if (dtMin <= 0) return 0;
  return (last.block - first.block) / dtMin;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
