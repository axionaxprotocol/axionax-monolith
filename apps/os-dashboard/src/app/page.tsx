import { Activity, Boxes, Cpu, Wallet, Wifi } from "lucide-react";
import { Card, StatCard } from "@/components/card";
import { DEFAULT_NODES, getNodeStatus } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  const online = statuses.filter((s) => s.online).length;
  const totalPeers = statuses.reduce((a, s) => a + (s.peerCount ?? 0), 0);
  const maxBlock = statuses.reduce(
    (a, s) => Math.max(a, s.blockNumber ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-zinc-500">
          Overview of your Axionax nodes and services.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nodes online"
          value={`${online}/${statuses.length}`}
          hint="Public RPC reachable"
          icon={<Wifi size={20} />}
        />
        <StatCard
          label="Highest block"
          value={maxBlock.toLocaleString()}
          hint="Across reachable nodes"
          icon={<Activity size={20} />}
        />
        <StatCard
          label="Peers (total)"
          value={totalPeers}
          hint="Sum of net_peerCount"
          icon={<Cpu size={20} />}
        />
        <StatCard
          label="Apps installed"
          value="3"
          hint="Worker · Sentinel · Faucet"
          icon={<Boxes size={20} />}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Connected nodes</h2>
          <span className="text-xs text-zinc-500">Live</span>
        </div>
        <div className="divide-y divide-border">
          {statuses.map((s) => (
            <div
              key={s.endpoint.id}
              className="flex items-center justify-between py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    s.online
                      ? "h-2 w-2 rounded-full bg-emerald-400"
                      : "h-2 w-2 rounded-full bg-rose-500"
                  }
                />
                <div>
                  <div className="font-medium">{s.endpoint.name}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {s.endpoint.url}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono">
                  {s.blockNumber !== null
                    ? `#${s.blockNumber.toLocaleString()}`
                    : s.error ?? "—"}
                </div>
                <div className="text-xs text-zinc-500">
                  peers {s.peerCount ?? "—"} · {s.latencyMs} ms
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-2">Wallet</h3>
          <p className="text-sm text-zinc-500 mb-4">
            No wallet attached. Create or import one to start interacting with
            the network.
          </p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-accent/10 text-accent px-3 py-1.5 text-sm hover:bg-accent/20">
            <Wallet size={14} /> Set up wallet
          </button>
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Quick actions</h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>· Run health check on all nodes</li>
            <li>· Install a new App from the App Store</li>
            <li>· Backup your wallet keystore</li>
            <li>· Open the Block Explorer</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
