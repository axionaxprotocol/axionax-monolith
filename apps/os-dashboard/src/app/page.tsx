import Link from "next/link";
import {
  Activity,
  Boxes,
  Cpu,
  Droplets,
  Eye,
  HardDrive,
  Server,
  Shield,
  Sparkles,
  Wallet,
  Wifi,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_NODES, getNodeStatus } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AppTone = "ai" | "chain" | "warn" | "danger" | "neutral";

interface LauncherApp {
  href: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  tone: AppTone;
}

const APP_LAUNCHER: readonly LauncherApp[] = [
  { href: "/apps", label: "Worker", Icon: Cpu, color: "text-emerald-400 bg-emerald-400/10", tone: "ai" },
  { href: "/apps", label: "Sentinel", Icon: Shield, color: "text-indigo-400 bg-indigo-400/10", tone: "chain" },
  { href: "/apps", label: "Explorer", Icon: Eye, color: "text-sky-400 bg-sky-400/10", tone: "chain" },
  { href: "/apps", label: "Faucet", Icon: Droplets, color: "text-teal-400 bg-teal-400/10", tone: "ai" },
  { href: "/apps", label: "Router", Icon: Workflow, color: "text-fuchsia-400 bg-fuchsia-400/10", tone: "warn" },
  { href: "/wallet", label: "Wallet", Icon: Wallet, color: "text-amber-400 bg-amber-400/10", tone: "warn" },
  { href: "/nodes", label: "Nodes", Icon: Server, color: "text-emerald-500 bg-emerald-500/10", tone: "ai" },
  { href: "/apps", label: "App Store", Icon: Boxes, color: "text-rose-400 bg-rose-400/10", tone: "danger" },
  { href: "/apps", label: "Storage", Icon: HardDrive, color: "text-slate-300 bg-slate-400/10", tone: "neutral" },
  { href: "/activity", label: "Activity", Icon: Activity, color: "text-blue-400 bg-blue-400/10", tone: "chain" },
  { href: "/apps", label: "Network", Icon: Wifi, color: "text-cyan-400 bg-cyan-400/10", tone: "ai" },
  { href: "/apps", label: "AI Hub", Icon: Sparkles, color: "text-violet-400 bg-violet-400/10", tone: "chain" },
];

export default async function Home() {
  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  const online = statuses.filter((s) => s.online).length;
  const totalPeers = statuses.reduce((a, s) => a + (s.peerCount ?? 0), 0);
  const maxBlock = statuses.reduce((a, s) => Math.max(a, s.blockNumber ?? 0), 0);

  return (
    <div className="space-y-os-8 animate-slide-up">
      {/* Hero — Data Dense Technical Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border pb-os-4">
        <div>
          <div className="flex items-center gap-3 mb-os-2">
            <div className="h-8 w-8 bg-bg-elev border border-border flex items-center justify-center rounded-os-sm">
              <Server size={16} className="text-zinc-300" />
            </div>
            <h1 className="text-display font-mono text-zinc-100 tracking-tight uppercase">
              AXIONAX_OS
            </h1>
          </div>
          <p className="text-body font-mono text-zinc-500 uppercase tracking-widest">
            Decentralized AI Operating Environment
          </p>
        </div>
        <div className="mt-os-4 sm:mt-0 flex items-center gap-os-4">
          <div className="text-right">
            <div className="text-overline text-zinc-500">SYSTEM_STATUS</div>
            <div className="text-title font-mono text-accent-ok flex items-center justify-end gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-ok animate-pulse-glow" />
              OPERATIONAL
            </div>
          </div>
        </div>
      </header>

      {/* Live widgets */}
      <section aria-label="System overview">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-os-4">
          <NetworkWidget
            block={maxBlock}
            online={online}
            total={statuses.length}
            peers={totalPeers}
          />
          <SystemWidget />
          <NotificationsWidget lastBlock={maxBlock} />
        </div>
      </section>

      {/* App launcher */}
      <section aria-label="Applications">
        <SectionDivider label="MODULES" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-os-4">
          {APP_LAUNCHER.map((app, index) => (
            <AppTile key={`${app.label}-${index}`} app={app} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Widgets                                                                   */
/* -------------------------------------------------------------------------- */

function NetworkWidget({
  block,
  online,
  total,
  peers,
}: {
  block: number;
  online: number;
  total: number;
  peers: number;
}) {
  return (
    <WidgetShell accent="teal" eyebrow="NETWORK_SYNC">
      <div className="mt-os-2 flex items-baseline gap-2">
        <span className="text-[2rem] leading-none font-mono font-bold tabular-nums text-zinc-100">
          {block.toLocaleString()}
        </span>
        <span className="text-micro uppercase text-zinc-500">BLK</span>
      </div>
      <div className="mt-os-3 grid grid-cols-2 gap-2">
        <Stat label="Nodes" value={`${online}/${total}`} dot="emerald" />
        <Stat label="Peers" value={peers} dot="indigo" />
      </div>
    </WidgetShell>
  );
}

function SystemWidget() {
  return (
    <WidgetShell accent="indigo" eyebrow="RESOURCES">
      <div className="mt-os-2 grid grid-cols-3 gap-2">
        <SysStat label="CPU" value="32%" Icon={Cpu} tone="emerald" />
        <SysStat label="MEM" value="5.8G" Icon={Activity} tone="indigo" />
        <SysStat label="DSK" value="1.7T" Icon={HardDrive} tone="cyan" />
      </div>
      <div className="mt-os-3 flex items-center justify-between border-t border-border pt-os-2">
        <span className="text-micro font-mono text-zinc-400 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-ai animate-pulse-glow" />
          HAILO-NPU
        </span>
        <span className="text-micro font-mono text-zinc-500">POOL: 4GB</span>
      </div>
    </WidgetShell>
  );
}

function NotificationsWidget({ lastBlock }: { lastBlock: number }) {
  return (
    <WidgetShell accent="amber" eyebrow="EVENT_LOG">
      <ul className="mt-os-2 space-y-2">
        <NotificationItem
          dot="emerald"
          title="Worker rewarded"
          subtitle="+0.42 AXIO"
        />
        <NotificationItem
          dot="indigo"
          title="Block produced"
          subtitle={`#${lastBlock.toLocaleString()}`}
        />
        <NotificationItem
          dot="amber"
          title="Update available"
          subtitle="v0.1.2"
        />
      </ul>
    </WidgetShell>
  );
}

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.55)]",
  indigo: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.55)]",
  amber: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.55)]",
};

function WidgetShell({
  accent,
  eyebrow,
  children,
}: {
  accent: keyof typeof ACCENT_DOT;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-os-md p-os-4 shadow-glass relative group transition-colors duration-fast hover:border-border-strong">
      <div className="flex items-center justify-between text-micro text-zinc-500 font-mono mb-os-2">
        <span>{eyebrow}</span>
        <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent]}`} />
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

const DOT_CLS: Record<string, string> = {
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
  amber: "bg-amber-500",
};

function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: React.ReactNode;
  dot: keyof typeof DOT_CLS;
}) {
  return (
    <div className="flex items-center justify-between rounded-os-sm bg-bg-elev border border-border px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-micro text-zinc-400 uppercase font-mono">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[dot]}`} />
        {label}
      </div>
      <span className="font-mono text-caption text-zinc-200 font-medium">{value}</span>
    </div>
  );
}

function NotificationItem({
  dot,
  title,
  subtitle,
}: {
  dot: keyof typeof DOT_CLS;
  title: string;
  subtitle: string;
}) {
  return (
    <li className="flex items-center justify-between group">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[dot]} flex-shrink-0`} />
        <span className="text-body font-mono text-zinc-300 truncate">{title}</span>
      </div>
      <span className="text-micro font-mono text-zinc-500 shrink-0">{subtitle}</span>
    </li>
  );
}

const SYS_TONES: Record<string, string> = {
  emerald: "text-emerald-400",
  indigo: "text-indigo-400",
  cyan: "text-cyan-400",
};

function SysStat({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  tone: keyof typeof SYS_TONES;
}) {
  return (
    <div className="rounded-os-sm bg-bg-elev border border-border p-2 flex flex-col items-center">
      <Icon size={14} className={`mb-1 ${SYS_TONES[tone]}`} strokeWidth={2} />
      <div className="text-body font-mono font-semibold tabular-nums text-zinc-100 leading-tight">{value}</div>
      <div className="text-[9px] uppercase font-mono text-zinc-500">{label}</div>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-os-4">
      <span className="text-micro font-mono text-zinc-500">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function AppTile({ app, index }: { app: LauncherApp; index: number }) {
  return (
    <Link
      href={app.href}
      className="group flex items-center gap-os-3 p-os-3 rounded-os-md bg-bg-elev border border-border focus:outline-none hover:border-zinc-500 transition-colors duration-fast animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
    >
      <div
        className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-os-sm ${app.color} transition-transform duration-fast group-hover:scale-105`}
      >
        <app.Icon size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <div className="text-body font-mono text-zinc-200 group-hover:text-white transition-colors duration-fast truncate">
          {app.label}
        </div>
      </div>
    </Link>
  );
}
