import { Card } from "@/components/card";
import { DEFAULT_NODES } from "@/lib/rpc";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">
          Network, RPC and worker configuration.
        </p>
      </header>

      <Card>
        <div className="font-semibold mb-3">Bootnodes</div>
        <ul className="space-y-2 text-sm font-mono">
          {DEFAULT_NODES.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-lg bg-bg-elev px-3 py-2"
            >
              <span>{n.url}</span>
              <span className="text-xs text-zinc-500">{n.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Edit <span className="font-mono">configs/monolith_worker.toml</span>{" "}
          to change.
        </p>
      </Card>

      <Card>
        <div className="font-semibold mb-3">Network</div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Chain ID
            </dt>
            <dd className="font-mono mt-1">86137</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Network
            </dt>
            <dd className="font-mono mt-1">axionax-testnet</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Block time
            </dt>
            <dd className="font-mono mt-1">3 s</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              VRF delay
            </dt>
            <dd className="font-mono mt-1">k = 2</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
