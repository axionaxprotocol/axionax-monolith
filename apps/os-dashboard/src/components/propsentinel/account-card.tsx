import type { Account } from "@/lib/propsentinel";

interface Props { account: Account; }

const STATUS_BORDER: Record<string, string> = {
  active: "border-border", 
  warning: "border-accent-warn/40 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]", 
  breached: "border-accent-danger/50 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]", 
  offline: "border-border border-dashed",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-accent-ok", 
  warning: "bg-accent-warn", 
  breached: "bg-accent-danger animate-pulse-glow", 
  offline: "bg-zinc-600",
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function AccountCard({ account }: Props) {
  const { portfolio, risk_profile, drawdown, terminals, status } = account;
  const activeTerminals = terminals.filter((t) => t.is_active).length;

  return (
    <div className={`bg-bg-card border rounded-os-sm p-os-3 flex flex-col gap-os-3 ${STATUS_BORDER[status]}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-mono text-body font-semibold text-zinc-100 tracking-wide uppercase truncate">{account.account_number}</div>
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 truncate">{account.broker_name} · {account.platform.toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-bg-elev border border-border px-1.5 py-0.5 rounded-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{activeTerminals}T</span>
        </div>
      </div>

      <div>
        <div className="font-mono text-[1.5rem] leading-none font-bold text-zinc-100 tabular-nums">{fmt(portfolio.equity)}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[10px] font-mono font-medium tabular-nums ${portfolio.floating_pl >= 0 ? "text-accent-ok" : "text-accent-danger"}`}>
            {portfolio.floating_pl >= 0 ? "+" : ""}{fmt(portfolio.floating_pl)}
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{portfolio.open_positions} POS</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border">
        <DrawdownBar label="D_DD" pct={drawdown.daily_pct} limit={risk_profile.daily_drawdown_pct} />
        <DrawdownBar label="M_DD" pct={drawdown.all_time_pct} limit={risk_profile.max_drawdown_pct} />
      </div>
    </div>
  );
}

function DrawdownBar({ label, pct, limit }: { label: string; pct: number; limit: number | null }) {
  const ratio = limit != null && limit > 0 ? Math.min(pct / limit, 1) : 0;
  const danger = ratio >= 0.9;
  const warn = ratio >= 0.7 && ratio < 0.9;
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
        <span className="text-zinc-500 uppercase tracking-widest">{label}</span>
        <span className={`tabular-nums font-medium ${danger ? "text-accent-danger" : warn ? "text-accent-warn" : "text-zinc-400"}`}>{pct.toFixed(2)}%</span>
      </div>
      <div className="h-1 bg-bg-elev rounded-none overflow-hidden">
        <div className={`h-full rounded-none transition-all duration-fast ${danger ? "bg-accent-danger" : warn ? "bg-accent-warn" : "bg-accent-ok"}`} style={{ width: `${Math.max(ratio * 100, 2)}%` }} />
      </div>
    </div>
  );
}
