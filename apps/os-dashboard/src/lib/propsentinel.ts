export type Platform = "mt4" | "mt5";

export type AccountStatus = "active" | "warning" | "breached" | "offline";

export interface Terminal {
  terminal_id: string;
  platform: Platform;
  last_heartbeat: string;
  is_active: boolean;
}

export interface RiskProfile {
  daily_drawdown_pct: number | null;
  max_drawdown_pct: number | null;
  daily_drawdown_abs: number | null;
  max_drawdown_abs: number | null;
}

export interface Account {
  id: string;
  account_number: string;
  broker_name: string;
  platform: Platform;
  currency: string;
  label: string | null;
  status: AccountStatus;
  portfolio: {
    equity: number;
    balance: number;
    margin: number | null;
    free_margin: number | null;
    floating_pl: number;
    open_positions: number;
    margin_level_pct: number | null;
  };
  risk_profile: RiskProfile;
  terminals: Terminal[];
  peaks: {
    all_time: number;
    daily: number;
  };
  drawdown: {
    all_time_pct: number;
    daily_pct: number;
  };
}

export interface RiskEvent {
  id: string;
  account_number: string;
  trigger_type: "daily_drawdown" | "max_drawdown" | "custom_rule";
  threshold: number;
  actual_value: number;
  equity_at_event: number;
  peak_at_event: number;
  kill_signal_sent: boolean;
  kill_confirmed: boolean;
  created_at: string;
}

export interface DashboardData {
  accounts: Account[];
  recent_events: RiskEvent[];
  summary: {
    total_accounts: number;
    active_terminals: number;
    breached_today: number;
    warnings: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_PROPSENTINEL_URL ?? "http://localhost:8100";

/**
 * Fetch initial state via SSR. 
 * STRICT RULE: Do NOT use revalidate polling here. 
 * Real-time updates must be handled via WebSocket on the client.
 */
export async function fetchPropsentinelDashboard(): Promise<DashboardData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/dashboard`, {
      cache: "no-store", // Always fetch fresh on full reload
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as DashboardData;
  } catch (err) {
    return null;
  }
}

