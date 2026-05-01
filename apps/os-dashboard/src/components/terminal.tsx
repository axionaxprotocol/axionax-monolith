"use client";

// Web Terminal for Axionax OS.
//
// Pure-React (no xterm.js) — keeps the dashboard bundle small. Upgrade path
// is a single drop-in if/when we need full ANSI rendering: replace the
// rendering layer with `@xterm/xterm` while keeping the command resolver.
//
// Commands are an explicit allow-list so the terminal can never trigger
// arbitrary RPC calls. Each command receives the trimmed args and the
// shared `TerminalContext` (RPC URL, log writer).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_NODES,
  getBlockNumber,
  getChainId,
  getPeerCount,
  type NodeEndpoint,
} from "@/lib/rpc";

interface TerminalLine {
  kind: "input" | "output" | "error" | "info";
  text: string;
}

interface TerminalContext {
  endpoint: NodeEndpoint;
  write: (kind: TerminalLine["kind"], text: string) => void;
}

type CommandFn = (args: string[], ctx: TerminalContext) => Promise<void> | void;

interface CommandSpec {
  name: string;
  summary: string;
  run: CommandFn;
}

const COMMANDS: Record<string, CommandSpec> = {
  help: {
    name: "help",
    summary: "List available commands",
    run: (_args, ctx) => {
      ctx.write("info", "Available commands:");
      Object.values(COMMANDS).forEach((c) => {
        ctx.write("output", `  ${c.name.padEnd(18)} ${c.summary}`);
      });
    },
  },
  clear: {
    name: "clear",
    summary: "Clear the screen",
    run: () => {
      // Handled in component (see useEffect below) — emits no output.
    },
  },
  "axionax --status": {
    name: "axionax --status",
    summary: "Show node status (block height + chain id)",
    run: async (_args, ctx) => {
      const [bn, ci] = await Promise.all([
        getBlockNumber(ctx.endpoint.url),
        getChainId(ctx.endpoint.url),
      ]);
      if (!bn.ok) {
        ctx.write("error", `block_number: ${bn.error.message}`);
      } else {
        ctx.write("output", `block_number: ${bn.data.toLocaleString()}`);
      }
      if (!ci.ok) {
        ctx.write("error", `chain_id: ${ci.error.message}`);
      } else {
        ctx.write("output", `chain_id:     ${parseInt(ci.data, 16)}`);
      }
      ctx.write("output", `endpoint:     ${ctx.endpoint.url}`);
    },
  },
  "p2p --check-peers": {
    name: "p2p --check-peers",
    summary: "Show connected peer count",
    run: async (_args, ctx) => {
      const r = await getPeerCount(ctx.endpoint.url);
      if (!r.ok) {
        ctx.write("error", `net_peerCount: ${r.error.message}`);
        return;
      }
      ctx.write("output", `peers: ${r.data} (latency ${r.latencyMs} ms)`);
    },
  },
  "node --logs --tail": {
    name: "node --logs --tail",
    summary: "(stub) Tail node logs — wire to /logs WebSocket",
    run: (_args, ctx) => {
      ctx.write(
        "info",
        "Live log streaming requires the WebSocket endpoint at ws://<node>:8546/logs",
      );
      ctx.write(
        "info",
        "Wire `rpc::ws_logs::ws_router` into the node startup, then add `useLogStream()` here.",
      );
    },
  },
};

const COMMAND_NAMES = Object.keys(COMMANDS).sort();

/** Resolve a command line against the allow-list, longest-prefix wins. */
function resolveCommand(line: string): { spec: CommandSpec; rest: string[] } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const sortedByLen = [...COMMAND_NAMES].sort((a, b) => b.length - a.length);
  for (const name of sortedByLen) {
    if (trimmed === name || trimmed.startsWith(`${name} `)) {
      const rest = trimmed.slice(name.length).trim();
      const args = rest.length > 0 ? rest.split(/\s+/) : [];
      return { spec: COMMANDS[name]!, rest: args };
    }
  }
  return null;
}

export interface TerminalProps {
  endpoint?: NodeEndpoint;
  prompt?: string;
  greeting?: string;
}

export function Terminal({
  endpoint = DEFAULT_NODES[0]!,
  prompt = "axionax$",
  greeting = "Axionax OS Terminal — type `help` for commands.",
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { kind: "info", text: greeting },
  ]);
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const historyCursor = useRef<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const write = useCallback((kind: TerminalLine["kind"], text: string) => {
    setLines((curr) => [...curr, { kind, text }]);
  }, []);

  // Auto-scroll on new line.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const ctx = useMemo<TerminalContext>(() => ({ endpoint, write }), [endpoint, write]);

  const submit = useCallback(
    async (raw: string) => {
      setLines((curr) => [...curr, { kind: "input", text: `${prompt} ${raw}` }]);
      if (raw.trim()) {
        history.current.unshift(raw);
        historyCursor.current = -1;
      }
      if (raw.trim() === "clear") {
        setLines([]);
        return;
      }
      const resolved = resolveCommand(raw);
      if (!resolved) {
        write("error", `command not found: ${raw.trim()}`);
        write("info", "type `help` to list commands");
        return;
      }
      try {
        await resolved.spec.run(resolved.rest, ctx);
      } catch (e) {
        write("error", e instanceof Error ? e.message : String(e));
      }
    },
    [ctx, prompt, write],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = input;
        setInput("");
        void submit(raw);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.current.length === 0) return;
        historyCursor.current = Math.min(
          history.current.length - 1,
          historyCursor.current + 1,
        );
        setInput(history.current[historyCursor.current] ?? "");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        historyCursor.current = Math.max(-1, historyCursor.current - 1);
        setInput(historyCursor.current === -1 ? "" : history.current[historyCursor.current] ?? "");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const matches = COMMAND_NAMES.filter((n) => n.startsWith(input));
        if (matches.length === 1) {
          setInput(matches[0]!);
        } else if (matches.length > 1) {
          write("info", matches.join("   "));
        }
        return;
      }
      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setLines([]);
      }
    },
    [input, submit, write],
  );

  return (
    <div
      className="h-full flex flex-col bg-obsidian-950/60 font-mono text-[12.5px]"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-2 space-y-0.5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.kind === "input"
                ? "text-zinc-300"
                : line.kind === "error"
                ? "text-accent-danger"
                : line.kind === "info"
                ? "text-accent-ai"
                : "text-zinc-200"
            }
          >
            {line.text || "\u00a0"}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const raw = input;
          setInput("");
          void submit(raw);
        }}
        className="flex items-center gap-2 px-3 py-2 border-t border-white/5 bg-black/30"
      >
        <span className="text-accent-ai select-none">{prompt}</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent outline-none text-zinc-100 placeholder-zinc-600 caret-accent-ai"
          placeholder="type a command — try `help`"
        />
      </form>
    </div>
  );
}

export { COMMAND_NAMES, resolveCommand };
