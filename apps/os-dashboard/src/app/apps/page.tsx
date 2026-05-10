import { Boxes, Cpu, Droplets, Eye, Shield, Workflow, Skull, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/card";

type App = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  installed: boolean;
  href?: string;
};

const APPS: App[] = [
  {
    id: "propsentinel",
    name: "PROPSENTINEL_RISK",
    desc: "Real-time equity telemetry and kill-switch execution bridge.",
    icon: Skull,
    color: "text-accent-danger bg-accent-danger/10 border-accent-danger/20",
    installed: true,
    href: "/apps/propsentinel",
  },
  {
    id: "worker",
    name: "DEAI_WORKER",
    desc: "Run compute jobs and earn rewards.",
    icon: Cpu,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    installed: true,
  },
  {
    id: "sentinel",
    name: "HYDRA_SENTINEL",
    desc: "Anomaly detection & quota safety.",
    icon: Shield,
    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    installed: true,
  },
  {
    id: "explorer",
    name: "BLOCK_EXPLORER",
    desc: "Local explorer for testnet/mainnet.",
    icon: Eye,
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    installed: false,
  },
  {
    id: "faucet",
    name: "TESTNET_FAUCET",
    desc: "Distribute test AXIO tokens.",
    icon: Droplets,
    color: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    installed: true,
  },
  {
    id: "router",
    name: "ASR_ROUTER",
    desc: "Top-K weighted VRF assignment.",
    icon: Workflow,
    color: "text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20",
    installed: false,
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-os-8">
      <header className="flex items-end justify-between gap-os-4 border-b border-border pb-os-4">
        <div>
          <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">
            MODULE_STORE
          </h1>
          <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-xl uppercase tracking-wider">
            Install and manage services on your node.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-caption font-mono text-zinc-500 uppercase tracking-widest">
          <Boxes size={13} strokeWidth={2} />
          {APPS.length} MODULES
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-os-4">
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
    <Card interactive className="group h-full flex flex-col">
      <div className="flex items-start gap-os-4 flex-1">
        <div
          className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-os-sm border transition-colors ${app.color} group-hover:brightness-110`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="font-mono font-semibold text-zinc-100 uppercase tracking-wide truncate">{app.name}</div>
            {app.installed && (
              <span className="text-[9px] font-mono uppercase tracking-widest rounded-os-sm bg-accent-ok/10 border border-accent-ok/20 text-accent-ok px-1.5 py-0.5 shrink-0">
                INSTALLED
              </span>
            )}
          </div>
          <p className="text-caption font-mono text-zinc-500 line-clamp-2">{app.desc}</p>
        </div>
      </div>
      <div className="mt-os-4 pt-os-3 border-t border-border flex justify-end">
        {app.href ? (
          <Link
            href={app.href}
            className={
              app.installed
                ? "rounded-os-sm border border-border bg-bg-elev hover:bg-border px-os-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-200 transition-colors duration-fast"
                : "rounded-os-sm border border-accent-ai/20 bg-accent-ai/10 hover:bg-accent-ai/20 px-os-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-accent-ai transition-colors duration-fast"
            }
          >
            {app.installed ? "Launch" : "Install"}
          </Link>
        ) : (
          <button
            type="button"
            className={
              app.installed
                ? "rounded-os-sm border border-border bg-bg-elev hover:bg-border px-os-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-200 transition-colors duration-fast"
                : "rounded-os-sm border border-accent-ai/20 bg-accent-ai/10 hover:bg-accent-ai/20 px-os-4 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-accent-ai transition-colors duration-fast"
            }
          >
            {app.installed ? "Launch" : "Install"}
          </button>
        )}
      </div>
    </Card>
  );
}
