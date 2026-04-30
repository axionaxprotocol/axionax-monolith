import { Card } from "@/components/card";
import { Boxes, Cpu, Droplets, Eye, Shield, Workflow } from "lucide-react";

const APPS = [
  {
    id: "worker",
    name: "DeAI Worker",
    desc: "Run compute jobs and earn rewards.",
    icon: Cpu,
    installed: true,
  },
  {
    id: "sentinel",
    name: "Hydra Sentinel",
    desc: "Anomaly detection & quota safety.",
    icon: Shield,
    installed: true,
  },
  {
    id: "explorer",
    name: "Block Explorer",
    desc: "Local explorer for testnet/mainnet.",
    icon: Eye,
    installed: false,
  },
  {
    id: "faucet",
    name: "Testnet Faucet",
    desc: "Distribute test AXIO tokens.",
    icon: Droplets,
    installed: true,
  },
  {
    id: "router",
    name: "ASR Router",
    desc: "Top-K weighted VRF assignment.",
    icon: Workflow,
    installed: false,
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">App Store</h1>
          <p className="text-sm text-zinc-500">
            Install and manage services on your node.
          </p>
        </div>
        <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
          <Boxes size={14} /> {APPS.length} apps
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPS.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <a.icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{a.name}</div>
                  {a.installed && (
                    <span className="text-[10px] uppercase tracking-wide rounded bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5">
                      installed
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mt-1">{a.desc}</p>
                <button
                  className={
                    a.installed
                      ? "mt-3 rounded-lg bg-bg-elev text-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-800"
                      : "mt-3 rounded-lg bg-accent/10 text-accent px-3 py-1.5 text-xs hover:bg-accent/20"
                  }
                >
                  {a.installed ? "Open" : "Install"}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
