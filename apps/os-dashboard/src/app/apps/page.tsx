import { Boxes, Cpu, Droplets, Eye, Shield, Workflow, type LucideIcon } from "lucide-react";

type App = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  installed: boolean;
};

const APPS: App[] = [
  {
    id: "worker",
    name: "DeAI Worker",
    desc: "Run compute jobs and earn rewards.",
    icon: Cpu,
    color: "from-teal-400 to-emerald-500",
    installed: true,
  },
  {
    id: "sentinel",
    name: "Hydra Sentinel",
    desc: "Anomaly detection & quota safety.",
    icon: Shield,
    color: "from-indigo-400 to-violet-500",
    installed: true,
  },
  {
    id: "explorer",
    name: "Block Explorer",
    desc: "Local explorer for testnet/mainnet.",
    icon: Eye,
    color: "from-sky-400 to-blue-500",
    installed: false,
  },
  {
    id: "faucet",
    name: "Testnet Faucet",
    desc: "Distribute test AXIO tokens.",
    icon: Droplets,
    color: "from-cyan-400 to-teal-500",
    installed: true,
  },
  {
    id: "router",
    name: "ASR Router",
    desc: "Top-K weighted VRF assignment.",
    icon: Workflow,
    color: "from-fuchsia-400 to-pink-500",
    installed: false,
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">App Store</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Install and manage services on your node.
          </p>
        </div>
        <span className="text-xs text-zinc-500 inline-flex items-center gap-1">
          <Boxes size={14} /> {APPS.length} apps
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPS.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className="glass rounded-2xl p-5 transition hover:bg-white/5"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`app-icon-shadow shrink-0 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${a.color} text-white`}
                >
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{a.name}</div>
                    {a.installed && (
                      <span className="text-[10px] uppercase tracking-wide rounded-full bg-emerald-400/10 text-emerald-400 px-2 py-0.5">
                        installed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                    {a.desc}
                  </p>
                  <button
                    className={
                      a.installed
                        ? "mt-3 rounded-full bg-white/5 text-zinc-200 px-4 py-1.5 text-xs hover:bg-white/10 transition"
                        : "mt-3 rounded-full bg-accent text-bg-DEFAULT px-4 py-1.5 text-xs font-medium hover:bg-accent-dim transition"
                    }
                  >
                    {a.installed ? "Open" : "Install"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
