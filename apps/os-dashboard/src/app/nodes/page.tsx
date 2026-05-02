import { Card } from "@/components/card";
import { DEFAULT_NODES, getNodeStatus } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NodesPage() {
  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  return (
    <div className="space-y-os-section">
      <header>
        <h1 className="text-headline font-semibold tracking-tight">Nodes</h1>
        <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
          Remote and local Axionax peers monitored by this OS.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-os-4">
        {statuses.map((s) => (
          <Card key={s.endpoint.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.endpoint.name}</div>
                <div className="font-mono text-xs text-zinc-500">
                  {s.endpoint.url}
                </div>
              </div>
              <span
                className={
                  s.online
                    ? "rounded-full bg-emerald-400/10 text-emerald-400 px-2 py-0.5 text-xs"
                    : "rounded-full bg-rose-500/10 text-rose-400 px-2 py-0.5 text-xs"
                }
              >
                {s.online ? "online" : "offline"}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Field label="Block" value={s.blockNumber?.toLocaleString() ?? "—"} />
              <Field label="Peers" value={s.peerCount ?? "—"} />
              <Field label="Chain ID" value={s.chainId ?? "—"} />
              <Field label="Latency" value={`${s.latencyMs} ms`} />
            </dl>
            {s.error && (
              <div className="mt-3 rounded-lg bg-rose-500/10 text-rose-300 px-3 py-2 text-xs">
                {s.error}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono">{value}</dd>
    </div>
  );
}
