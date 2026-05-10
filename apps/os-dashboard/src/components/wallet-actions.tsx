"use client";

import { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, Copy, Check, RefreshCw } from "lucide-react";
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { axionaxLocal, burnerAccount } from "@/lib/web3/config";

// Setup clients outside component to avoid re-creation
const publicClient = createPublicClient({
  chain: axionaxLocal,
  transport: http(),
});

const walletClient = createWalletClient({
  account: burnerAccount,
  chain: axionaxLocal,
  transport: http(),
});

export function WalletActions() {
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [hint, setHint] = useState<{ type: "error" | "success" | "info", msg: string } | null>(null);
  
  // Real Chain State
  const [balance, setBalance] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const address = burnerAccount.address;

  const fetchBalance = async () => {
    try {
      setIsRefreshing(true);
      const wei = await publicClient.getBalance({ address });
      setBalance(formatEther(wei));
      setHint(null);
    } catch (err) {
      setHint({ type: "error", msg: "RPC_CONNECTION_FAILED: Ensure local node is running on :8545" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBalance();
  }, []);

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setHint({ type: "error", msg: "CLIPBOARD_UNAVAILABLE" });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !amount) {
      setHint({ type: "error", msg: "INVALID_INPUT: Address and amount are required" });
      return;
    }

    try {
      setIsSending(true);
      setHint({ type: "info", msg: "BROADCASTING_TX..." });
      
      const hash = await walletClient.sendTransaction({
        to: to as `0x${string}`,
        value: parseEther(amount),
      });
      
      setHint({ type: "success", msg: `TX_MINED: ${hash.slice(0, 10)}...` });
      setTo("");
      setAmount("");
      
      // Auto refresh balance after sending
      setTimeout(fetchBalance, 1000);
    } catch (err: any) {
      setHint({ type: "error", msg: `TX_FAILED: ${err.shortMessage || err.message}` });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-os-4">
      <section className="bg-bg-elev border border-border rounded-none p-os-4 space-y-os-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">ACTIVE_ACCOUNT (DEV_BURNER)</div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-os-4">
          <code className="flex-1 rounded-none bg-bg-card border border-border px-os-4 py-os-3 font-mono text-[11px] text-zinc-200 break-all">
            {address}
          </code>
          <button
            type="button"
            onClick={() => void copyAddr()}
            className="inline-flex items-center justify-center gap-os-2 rounded-none bg-bg-card border border-border px-os-4 py-os-3 text-[10px] font-mono uppercase tracking-widest text-zinc-200 hover:bg-border transition-colors"
          >
            {copied ? <Check size={14} className="text-accent-ok" /> : <Copy size={14} />}
            {copied ? "COPIED" : "COPY_ADDR"}
          </button>
        </div>
      </section>

      <section className="bg-bg-elev border border-border rounded-none p-os-4 space-y-os-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">ONCHAIN_BALANCE</div>
          <button 
            onClick={fetchBalance} 
            disabled={isRefreshing}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex items-baseline gap-os-3">
          <span className="text-[2rem] leading-none font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
            {Number(balance).toFixed(4)}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">AXIO</span>
        </div>
      </section>

      <section className="bg-bg-elev border border-border rounded-none p-os-4 space-y-os-4">
        <div className="flex items-center gap-os-2 text-[12px] font-mono font-bold text-zinc-200 uppercase tracking-widest">
          <ArrowUpRight size={14} className="text-accent-ai" />
          SEND_FUNDS
        </div>
        <form onSubmit={handleSend} className="space-y-os-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1" htmlFor="to">
              TARGET_ADDRESS
            </label>
            <input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-none border border-border bg-bg-card px-os-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 uppercase transition-colors"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-1" htmlFor="amt">
              AMOUNT (AXIO)
            </label>
            <input
              id="amt"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="w-full rounded-none border border-border bg-bg-card px-os-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
          
          {hint && (
            <p className={`rounded-none border px-os-3 py-2 text-[10px] font-mono uppercase tracking-widest ${
              hint.type === "error" ? "bg-accent-danger/10 border-accent-danger/20 text-accent-danger" : 
              hint.type === "success" ? "bg-accent-ok/10 border-accent-ok/20 text-accent-ok" :
              "bg-accent-info/10 border-accent-info/20 text-accent-info"
            }`}>
              {hint.msg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center gap-os-2 rounded-none bg-zinc-200 text-obsidian-950 px-os-6 py-2 text-[10px] font-mono font-bold hover:bg-white uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <ArrowDownLeft size={12} />
            )}
            {isSending ? "BROADCASTING..." : "EXECUTE_TX"}
          </button>
        </form>
      </section>
    </div>
  );
}
