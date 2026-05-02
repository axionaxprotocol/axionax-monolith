"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Copy, Check } from "lucide-react";

interface WalletActionsProps {
  /** Checksummed or lower-case 0x address used for balance display */
  address: string;
  balanceWei: string;
  balanceFormatted: string;
}

export function WalletActions({
  address,
  balanceWei,
  balanceFormatted,
}: WalletActionsProps) {
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setHint("Clipboard unavailable in this context.");
    }
  }

  function prepareSend(e: React.FormEvent) {
    e.preventDefault();
    setHint(
      "Raw signing is not wired in Axionax OS yet — use a browser wallet or axionax-cli for transfers.",
    );
  }

  return (
    <div className="space-y-os-8">
      <section className="glass rounded-2xl p-os-panel space-y-os-4">
        <div className="text-overline uppercase text-zinc-500">Receive</div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-os-4">
          <code className="flex-1 rounded-xl bg-obsidian-950 border border-matte-800 px-os-4 py-os-3 font-mono text-body text-zinc-200 break-all">
            {address}
          </code>
          <button
            type="button"
            onClick={() => void copyAddr()}
            className="inline-flex items-center justify-center gap-os-2 rounded-xl bg-white/5 px-os-4 py-os-3 text-sm text-zinc-200 hover:bg-white/10 transition"
          >
            {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-body text-zinc-500">
          Share this address to receive AXIO on chain{" "}
          <span className="font-mono text-zinc-400">86137</span>.
        </p>
      </section>

      <section className="glass rounded-2xl p-os-panel space-y-os-4">
        <div className="text-overline uppercase text-zinc-500">Balance</div>
        <div className="flex flex-wrap items-baseline gap-os-3">
          <span className="text-display font-semibold tracking-tight text-zinc-100 tabular-nums">
            {balanceFormatted}
          </span>
          <span className="text-body text-zinc-500">AXIO · wei {balanceWei}</span>
        </div>
      </section>

      <section className="glass rounded-2xl p-os-panel space-y-os-4">
        <div className="flex items-center gap-os-2 text-title font-semibold text-zinc-200">
          <ArrowUpRight size={18} className="text-accent" />
          Send
        </div>
        <form onSubmit={prepareSend} className="space-y-os-4">
          <div>
            <label className="text-caption uppercase text-zinc-500" htmlFor="to">
              To (0x…)
            </label>
            <input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x…"
              className="mt-os-1 w-full rounded-xl border border-matte-800 bg-obsidian-950 px-os-4 py-os-3 font-mono text-body text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-caption uppercase text-zinc-500" htmlFor="amt">
              Amount (AXIO)
            </label>
            <input
              id="amt"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="mt-os-1 w-full rounded-xl border border-matte-800 bg-obsidian-950 px-os-4 py-os-3 font-mono text-body text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          {hint && (
            <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-os-4 py-os-3 text-body text-amber-200">
              {hint}
            </p>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-os-2 rounded-xl bg-accent text-bg px-os-6 py-os-3 text-body font-medium hover:bg-accent-dim transition"
          >
            <ArrowDownLeft size={16} />
            Prepare transaction
          </button>
        </form>
      </section>
    </div>
  );
}
