import { create } from "zustand";
import type { Account, RiskEvent } from "@/lib/propsentinel";

interface TelemetryState {
  wsStatus: "connecting" | "connected" | "disconnected";
  accountMap: Record<string, Account>;
  events: RiskEvent[];
  
  // Actions
  setWsStatus: (status: "connecting" | "connected" | "disconnected") => void;
  initData: (accounts: Account[], events: RiskEvent[]) => void;
  flushTelemetry: (buffer: Record<string, Partial<Account>>) => void;
  addEvent: (event: RiskEvent) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  wsStatus: "connecting",
  accountMap: {},
  events: [],

  setWsStatus: (status) => set({ wsStatus: status }),
  
  initData: (accounts, events) => {
    const map: Record<string, Account> = {};
    accounts.forEach(a => map[a.account_number] = a);
    set({ accountMap: map, events });
  },

  flushTelemetry: (buffer) => set((state) => {
    const nextMap = { ...state.accountMap };
    let changed = false;
    for (const [accNum, partial] of Object.entries(buffer)) {
      if (nextMap[accNum]) {
        nextMap[accNum] = {
          ...nextMap[accNum],
          ...partial,
          portfolio: { ...nextMap[accNum].portfolio, ...(partial.portfolio || {}) }
        };
        changed = true;
      }
    }
    return changed ? { accountMap: nextMap } : state;
  }),

  addEvent: (event) => set((state) => ({
    events: [event, ...state.events].slice(0, 50) // Keep last 50 events
  }))
}));
