"use client";

import { useEffect, useState, useMemo, memo, useTransition } from "react";
import { Shield, Wifi, WifiOff, Search } from "lucide-react";
import { AccountCard } from "./account-card";
import { RiskTimeline } from "./risk-timeline";
import { useTelemetryStore } from "@/lib/store/telemetry";
import type { DashboardData, RiskEvent } from "@/lib/propsentinel";

const MemoAccountCard = memo(AccountCard, (prev, next) => {
  return prev.account.portfolio.equity === next.account.portfolio.equity &&
         prev.account.portfolio.open_positions === next.account.portfolio.open_positions &&
         prev.account.status === next.account.status;
});

type FilterState = "all" | "active" | "warning" | "breached" | "offline";

export function PropsentinelClient({ initialData }: { initialData: DashboardData | null }) {
  const { accountMap, events, wsStatus, initData, setWsStatus, flushTelemetry, addEvent } = useTelemetryStore();
  
  const [summary, setSummary] = useState(initialData?.summary);
  const [search, setSearch] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterState>("all");

  // Initialize store once
  useEffect(() => {
    if (initialData) {
      initData(initialData.accounts, initialData.recent_events);
    }
  }, [initialData, initData]);

  // Worker Initialization
  useEffect(() => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8100/ws";
    
    // Spawn Web Worker (Off-main-thread processing)
    const worker = new Worker(new URL('../../lib/workers/telemetry.worker.ts', import.meta.url));
    
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "WS_STATUS") {
        setWsStatus(payload);
      } else if (type === "TELEMETRY_FLUSH") {
        // High-performance batch state update
        flushTelemetry(payload);
      } else if (type === "NEW_EVENT") {
        addEvent(payload as RiskEvent);
      }
    };

    worker.postMessage({ type: "CONNECT", url: WS_URL });

    return () => {
      worker.postMessage({ type: "DISCONNECT" });
      worker.terminate();
    };
  }, [setWsStatus, flushTelemetry, addEvent]);

  const handleSearch = (val: string) => {
    setSearch(val);
    startTransition(() => {
      setDeferredSearch(val);
    });
  };

  const filteredAccounts = useMemo(() => {
    return Object.values(accountMap).filter(acc => {
      const matchSearch = acc.account_number.includes(deferredSearch) || (acc.label?.includes(deferredSearch) ?? false);
      const matchFilter = filter === "all" || acc.status === filter;
      return matchSearch && matchFilter;
    });
  }, [accountMap, deferredSearch, filter]);

  if (!initialData) {
    return (
      <div className="bg-bg-card border border-border p-8 text-center flex flex-col items-center justify-center min-h-[300px] rounded-none">
        <Shield size={32} className="text-zinc-600 mb-3" />
        <p className="text-title font-mono font-semibold text-zinc-400 uppercase tracking-widest">ENGINE_OFFLINE</p>
        <p className="text-micro font-mono text-zinc-500 mt-2 uppercase tracking-wider">
          Awaiting telemetry stream on <span className="text-accent-info">localhost:8100</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-elev border border-border p-1.5 rounded-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg-card border border-border rounded-none">
            {wsStatus === "connected" ? (
              <><Wifi size={10} className="text-accent-ok" /><span className="text-[9px] font-mono text-accent-ok uppercase tracking-widest">LIVE</span></>
            ) : (
              <><WifiOff size={10} className="text-accent-danger" /><span className="text-[9px] font-mono text-accent-danger uppercase tracking-widest">OFFLINE</span></>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <TopStat label="TERM" value={summary?.active_terminals || 0} />
            <TopStat label="ACC" value={summary?.total_accounts || 0} />
            <TopStat label="WARN" value={summary?.warnings || 0} tone="warn" />
            <TopStat label="KILL" value={summary?.breached_today || 0} tone="danger" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={10} className={`absolute left-1.5 top-1/2 -translate-y-1/2 ${isPending ? 'text-accent-info animate-pulse' : 'text-zinc-500'}`} />
            <input 
              type="text" 
              placeholder="SEARCH..." 
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="bg-bg-card border border-border rounded-none py-0.5 pl-5 pr-2 text-[9px] font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 uppercase w-28"
            />
          </div>
          <div className="flex items-center bg-bg-card border border-border p-[1px] rounded-none">
            {(["all", "active", "warning", "breached"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-1.5 py-[1px] text-[8px] font-mono uppercase tracking-widest rounded-none ${filter === f ? "bg-zinc-200 text-obsidian-950 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <div className="lg:col-span-3 xl:col-span-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 items-start auto-rows-max">
            {filteredAccounts.map((account) => (
              <MemoAccountCard key={account.id} account={account} />
            ))}
            {filteredAccounts.length === 0 && (
              <div className="col-span-full py-6 text-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest border border-dashed border-border rounded-none">
                NO_ACCOUNTS_MATCH
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-1.5">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-bg-elev px-2 py-1 rounded-none border border-border flex justify-between items-center">
            <span>EVENT_LOG</span>
            <span className="text-zinc-600">[{events.length}]</span>
          </div>
          <RiskTimeline events={events} />
        </div>
      </div>
    </div>
  );
}

function TopStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warn" | "danger" }) {
  const toneMap = {
    default: "text-zinc-200",
    warn: "text-accent-warn",
    danger: "text-accent-danger"
  };
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{label}:</span>
      <span className={`font-mono text-[10px] font-bold tabular-nums leading-none ${toneMap[tone]}`}>{value}</span>
    </div>
  );
}
