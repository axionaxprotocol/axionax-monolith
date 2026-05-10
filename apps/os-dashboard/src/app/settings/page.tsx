import { Card } from "@/components/card";
import { DEFAULT_NODES } from "@/lib/rpc";

export default function SettingsPage() {
  return (
    <div className="space-y-os-8">
      <header className="border-b border-border pb-os-4">
        <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">SYS_CONFIG</h1>
        <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-xl uppercase tracking-wider">
          Network, RPC and worker configuration.
        </p>
      </header>

      <Card className="bg-bg-elev">
        <div className="text-title font-mono font-semibold text-zinc-100 mb-os-4 uppercase tracking-widest">Bootnodes</div>
        <ul className="space-y-os-2">
          {DEFAULT_NODES.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-os-3 rounded-os-sm bg-bg-card border border-border px-os-4 py-os-3"
            >
              <span className="font-mono text-body text-zinc-200 truncate">{n.url}</span>
              <span className="text-caption font-mono text-zinc-500 shrink-0 uppercase tracking-widest">{n.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-os-4 text-caption font-mono text-zinc-500">
          Edit{" "}
          <code className="font-mono text-zinc-400 bg-bg-card border border-border px-1.5 py-0.5 rounded-sm">
            configs/monolith_worker.toml
          </code>{" "}
          to change.
        </p>
      </Card>

      <Card className="bg-bg-elev">
        <div className="text-title font-mono font-semibold text-zinc-100 mb-os-4 uppercase tracking-widest">Network_Params</div>
        <dl className="grid grid-cols-2 gap-os-4">
          <NetworkField label="Chain ID" value="86137" />
          <NetworkField label="Network" value="axionax-testnet" />
          <NetworkField label="Block time" value="3 s" />
          <NetworkField label="VRF delay" value="k = 2" />
        </dl>
      </Card>
    </div>
  );
}

function NetworkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card border border-border p-os-3 rounded-os-sm">
      <dt className="text-micro text-zinc-500 uppercase tracking-widest font-mono">{label}</dt>
      <dd className="mt-os-1 font-mono text-body font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
