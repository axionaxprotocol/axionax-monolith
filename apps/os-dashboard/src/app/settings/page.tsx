import { Card } from "@/components/card";
import { DEFAULT_NODES } from "@/lib/rpc";

export default function SettingsPage() {
  return (
    <div className="space-y-os-section">
      <header>
        <h1 className="text-headline font-semibold tracking-tight text-zinc-100">Settings</h1>
        <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
          Network, RPC and worker configuration.
        </p>
      </header>

      <Card>
        <div className="text-title font-semibold text-zinc-100 mb-os-4">Bootnodes</div>
        <ul className="space-y-os-2">
          {DEFAULT_NODES.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-os-3 rounded-os-md bg-white/[0.04] border border-white/5 px-os-4 py-os-3"
            >
              <span className="font-mono text-body text-zinc-200 truncate">{n.url}</span>
              <span className="text-caption text-zinc-500 shrink-0">{n.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-os-4 text-caption text-zinc-500">
          Edit{" "}
          <code className="font-mono text-zinc-400">
            configs/monolith_worker.toml
          </code>{" "}
          to change.
        </p>
      </Card>

      <Card>
        <div className="text-title font-semibold text-zinc-100 mb-os-4">Network</div>
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
    <div>
      <dt className="text-overline text-zinc-500">{label}</dt>
      <dd className="mt-os-1 font-mono text-body text-zinc-200">{value}</dd>
    </div>
  );
}
