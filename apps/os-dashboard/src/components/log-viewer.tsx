"use client";

import { useEffect, useRef, useState } from "react";

const SYNTH = [
  "mempool    INFO  bundle acceptance window 2s",
  "consensus  INFO  validator set unchanged",
  "rpc        INFO  eth_chainId cache hit",
  "network    INFO  gossipsub mesh diameter ≤ 3",
  "worker     INFO  sandbox heartbeat OK",
];

interface LogViewerProps {
  /** Lines produced on the server from RPC snapshot */
  seedLines: string[];
}

export function LogViewer({ seedLines }: LogViewerProps) {
  const [lines, setLines] = useState<string[]>(() => [...seedLines]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tick = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const msg = SYNTH[tick.current % SYNTH.length];
      tick.current += 1;
      const ts = new Date().toISOString();
      setLines((prev) => {
        const next = [...prev, `${ts}  ${msg}`];
        return next.length > 400 ? next.slice(-400) : next;
      });
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="rounded-os-sm border border-border bg-bg-card shadow-glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-os-4 py-os-2 bg-bg-elev">
        <span className="text-micro uppercase text-zinc-500 font-mono tracking-widest">node.log</span>
        <span className="text-[10px] text-accent-ok/90 font-mono uppercase tracking-widest flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-ok animate-pulse-glow" />
          streaming · mock tail
        </span>
      </div>
      <pre
        className="max-h-[min(480px,52vh)] overflow-y-auto p-os-4 font-mono text-body text-zinc-300 leading-relaxed whitespace-pre-wrap break-all"
        aria-live="polite"
      >
        {lines.join("\n")}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
