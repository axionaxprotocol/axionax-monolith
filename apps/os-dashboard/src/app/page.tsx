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

const APP_LAUNCHER = [
  { href: "/apps", label: "Worker", Icon: Cpu, color: "from-teal-400 to-emerald-500" },
  { href: "/apps", label: "Sentinel", Icon: Shield, color: "from-indigo-400 to-violet-500" },
  { href: "/apps", label: "Explorer", Icon: Eye, color: "from-sky-400 to-blue-500" },
  { href: "/apps", label: "Faucet", Icon: Droplets, color: "from-cyan-400 to-teal-500" },
  { href: "/apps", label: "Router", Icon: Workflow, color: "from-fuchsia-400 to-pink-500" },
  { href: "/wallet", label: "Wallet", Icon: Wallet, color: "from-amber-400 to-orange-500" },
  { href: "/nodes", label: "Nodes", Icon: Server, color: "from-emerald-400 to-green-500" },
  { href: "/apps", label: "App Store", Icon: Boxes, color: "from-rose-400 to-red-500" },
  { href: "/apps", label: "Storage", Icon: HardDrive, color: "from-slate-400 to-slate-600" },
  { href: "/activity", label: "Activity", Icon: Activity, color: "from-blue-400 to-indigo-500" },
  { href: "/apps", label: "Network", Icon: Wifi, color: "from-cyan-400 to-sky-500" },
  { href: "/apps", label: "AI Hub", Icon: Sparkles, color: "from-violet-400 to-fuchsia-500" },
];

export default async function Home() {
  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  const online = statuses.filter((s) => s.online).length;
  const totalPeers = statuses.reduce((a, s) => a + (s.peerCount ?? 0), 0);
  const maxBlock = statuses.reduce(
    (a, s) => Math.max(a, s.blockNumber ?? 0),
    0
  );
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-12 animate-slide-up">
      {/* Hero with ambient glow */}
      <header className="flex flex-col items-center text-center pt-8">
        <div className="relative mb-6 group">
          {/* Multi-layer glow halo */}
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-teal-400/30 via-indigo-500/30 to-fuchsia-500/30 blur-3xl scale-125 animate-pulse-glow" />
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-cyan-400/20 to-emerald-400/20 blur-2xl scale-110" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Axionax"
            className="h-32 w-32 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_32px_rgba(94,234,212,0.5)] group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          {greeting}, <span className="text-zinc-500 font-light">Axionax</span>.
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Decentralized AI Operating System</p>
      </header>

      {/* Three wide widgets with enhanced depth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Network Widget */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-white/15 transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(94,234,212,0.6)] animate-pulse" />
              Network
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                {maxBlock.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 font-medium">block</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <Stat label="Online" value={`${online}/${statuses.length}`} dot="emerald" />
              <Stat label="Peers" value={totalPeers} dot="indigo" />
              <Stat label="Chain" value="86137" dot="cyan" />
            </div>
          </div>
        </div>

        {/* System Widget */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-white/15 transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse" />
              System
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <SysStat label="CPU" value="32%" Icon={Cpu} tone="emerald" />
              <SysStat label="Mem" value="5.8 GB" Icon={Activity} tone="indigo" />
              <SysStat label="Disk" value="1.7 TB" Icon={HardDrive} tone="cyan" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-medium">
                <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                Hailo-NPU Active
              </span>
              <span className="text-[10px] text-zinc-500">4 GB worker pool</span>
            </div>
          </div>
        </div>

        {/* Notifications Widget */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:border-white/15 transition-all duration-300">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/5 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse" />
              Notifications
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              <NotificationItem 
                dotColor="bg-emerald-400" 
                dotGlow="shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                title="Worker rewarded" 
                subtitle={`+0.42 AXIO · 2m ago`} 
              />
              <NotificationItem 
                dotColor="bg-indigo-400" 
                dotGlow="shadow-[0_0_6px_rgba(129,140,248,0.5)]"
                title="New block produced" 
                subtitle={`#${maxBlock.toLocaleString()} · just now`} 
              />
              <NotificationItem 
                dotColor="bg-amber-400" 
                dotGlow="shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                title="System update available" 
                subtitle="v0.1.2 · 1h ago" 
              />
            </ul>
          </div>
        </div>
      </div>

      {/* App launcher grid with enhanced interactions */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Applications</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-5 gap-y-8">
          {APP_LAUNCHER.map((a, index) => (
            <Link
              key={a.label}
              href={a.href}
              className="group flex flex-col items-center gap-3 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`app-icon-shadow grid h-[5.5rem] w-[5.5rem] place-items-center rounded-[1.5rem] bg-gradient-to-br ${a.color} text-white transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:scale-105 relative overflow-hidden`}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <a.Icon size={32} className="relative z-10 drop-shadow-lg" />
              </div>
              <div className="text-xs text-zinc-400 group-hover:text-white font-medium transition-colors duration-200">
                {a.label}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  dot,
}: {
  label: string;
  value: React.ReactNode;
  dot: "emerald" | "indigo" | "cyan";
}) {
  const dotCls =
    dot === "emerald"
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
      : dot === "indigo"
      ? "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]"
      : "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/5 px-2.5 py-1.5 text-zinc-300 hover:bg-white/[0.06] transition-colors duration-200">
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      <span className="text-zinc-500 text-[10px] uppercase tracking-wide">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </span>
  );
}

function NotificationItem({
  dotColor,
  dotGlow,
  title,
  subtitle,
}: {
  dotColor: string;
  dotGlow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <li className="flex items-start gap-3 group cursor-pointer">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${dotColor} ${dotGlow} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
          {title}
        </div>
        <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {subtitle}
        </div>
      </div>
    </li>
  );
}

const SYS_TONES: Record<string, string> = {
  emerald: "text-emerald-300",
  indigo: "text-indigo-300",
  cyan: "text-cyan-300",
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
    <div className="rounded-xl bg-white/5 p-2 text-center">
      <Icon size={14} className={`mx-auto ${SYS_TONES[tone]}`} />
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: "from-emerald-400/30 to-emerald-500/5 text-emerald-300",
  indigo: "from-indigo-400/30 to-indigo-500/5 text-indigo-300",
  cyan: "from-cyan-400/30 to-cyan-500/5 text-cyan-300",
  rose: "from-rose-400/30 to-rose-500/5 text-rose-300",
};

function Widget({
  label,
  value,
  hint,
  tone,
  Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: keyof typeof TONES | string;
  Icon: LucideIcon;
}) {
  const cls = TONES[tone] ?? TONES.emerald;
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div
        className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${cls} blur-2xl opacity-70`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400">
            {label}
          </div>
          <Icon size={16} />
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && (
          <div className="text-xs text-zinc-500 mt-0.5">{hint}</div>
        )}
      </div>
    </div>
  );
}
