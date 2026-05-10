import type { RiskEvent } from "@/lib/propsentinel";

export function RiskTimeline({ events }: { events: RiskEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-os-sm p-4 text-center text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
        NO_EVENTS
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-os-sm divide-y divide-border h-fit max-h-[800px] overflow-y-auto">
      {events.map((evt) => (
        <div key={evt.id} className="p-2 flex items-start gap-2 hover:bg-bg-elev transition-colors duration-fast">
          <div className="mt-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-danger shadow-[0_0_4px_rgba(239,68,68,0.5)] block" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-mono text-[10px] font-semibold text-zinc-200 uppercase tracking-widest truncate">
                {evt.account_number}
              </span>
              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">
                {new Date(evt.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="text-[9px] font-mono text-accent-danger font-medium uppercase tracking-widest truncate">
              {evt.trigger_type.replace("_", " ")}
            </div>
            <div className="text-[8px] font-mono text-zinc-500 mt-0.5 uppercase tracking-widest truncate">
              L:{evt.threshold} A:{evt.actual_value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
