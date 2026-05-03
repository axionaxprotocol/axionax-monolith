import { Boxes, Cpu, Droplets, Eye, Shield, Workflow, type LucideIcon } from "lucide-react";
import { Card } from "@/components/card";

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
    <div className="space-y-os-section">
      <header className="flex items-end justify-between gap-os-4">
        <div>
          <h1 className="text-headline font-semibold tracking-tight text-zinc-100">
            App Store
          </h1>
          <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
            Install and manage services on your node.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-caption text-zinc-500 font-medium">
          <Boxes size={13} strokeWidth={2} />
          {APPS.length} apps
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-os-4">
        {APPS.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  );
}

function AppCard({ app }: { app: App }) {
  const Icon = app.icon;
  return (
    <Card interactive>
      <div className="flex items-start gap-os-4">
        <div
          className={`app-icon-shadow shrink-0 grid h-14 w-14 place-items-center rounded-os-lg bg-gradient-to-br ${app.color} text-white`}
        >
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-zinc-100 truncate">{app.name}</div>
            {app.installed && (
              <span className="text-[10px] uppercase tracking-wide rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 px-2 py-0.5 font-medium shrink-0">
                installed
              </span>
            )}
          </div>
          <p className="text-body text-zinc-500 mt-os-1 line-clamp-2">{app.desc}</p>
          <button
            type="button"
            className={
              app.installed
                ? "mt-os-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 px-os-4 py-1.5 text-caption font-medium transition-colors duration-fast"
                : "mt-os-3 rounded-full bg-accent-ai text-obsidian-950 hover:bg-accent-dim px-os-4 py-1.5 text-caption font-semibold transition-colors duration-fast"
            }
          >
            {app.installed ? "Open" : "Install"}
          </button>
        </div>
      </div>
    </Card>
  );
}
