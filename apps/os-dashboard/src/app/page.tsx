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
    <div className="space-y-10">
      {/* Hero */}
      <header className="flex flex-col items-center text-center pt-6">
        <div className="relative mb-4">
          {/* glow halo */}
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-teal-400/40 via-indigo-500/40 to-fuchsia-500/40 blur-3xl scale-110" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Axionax"
            className="h-28 w-28 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_24px_rgba(94,234,212,0.55)]"
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {greeting}, <span className="text-zinc-400">Axionax</span>.
        </h1>
      </header>

      {/* Three wide widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Network */}
        <div className="glass rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Network
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">
              {maxBlock.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">block</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <Stat label="Online" value={`${online}/${statuses.length}`} dot="emerald" />
            <Stat label="Peers" value={totalPeers} dot="indigo" />
            <Stat label="Chain" value="86137" dot="cyan" />
          </div>
        </div>

        {/* System */}
        <div className="glass rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            System
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <SysStat label="CPU" value="32%" Icon={Cpu} tone="emerald" />
            <SysStat label="Mem" value="5.8 GB" Icon={Activity} tone="indigo" />
            <SysStat label="Disk" value="1.7 TB" Icon={HardDrive} tone="cyan" />
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Hailo-NPU · 4 GB worker pool
          </div>
        </div>

        {/* Notifications */}
        <div className="glass rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Notifications
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <div>
                <div>Worker rewarded</div>
                <div className="text-xs text-zinc-500">+0.42 AXIO · 2m ago</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <div>
                <div>New block produced</div>
                <div className="text-xs text-zinc-500">#{maxBlock.toLocaleString()} · just now</div>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              <div>
                <div>System update available</div>
                <div className="text-xs text-zinc-500">v0.1.2 · 1h ago</div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* App launcher grid (Umbrel-style) */}
      <section>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-7">
          {APP_LAUNCHER.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`app-icon-shadow grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br ${a.color} text-white transition group-hover:-translate-y-1`}
              >
                <a.Icon size={32} />
              </div>
              <div className="text-xs text-zinc-300 group-hover:text-white">
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
      ? "bg-emerald-400"
      : dot === "indigo"
      ? "bg-indigo-400"
      : "bg-cyan-400";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1 text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
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
