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
  { href: "/apps", label: "Worker", Icon: Cpu, color: "from-teal-400 to-emerald-500", tone: "ai" },
  { href: "/apps", label: "Sentinel", Icon: Shield, color: "from-indigo-400 to-violet-500", tone: "chain" },
  { href: "/apps", label: "Explorer", Icon: Eye, color: "from-sky-400 to-blue-500", tone: "chain" },
  { href: "/apps", label: "Faucet", Icon: Droplets, color: "from-cyan-400 to-teal-500", tone: "ai" },
  { href: "/apps", label: "Router", Icon: Workflow, color: "from-fuchsia-400 to-pink-500", tone: "warn" },
  { href: "/wallet", label: "Wallet", Icon: Wallet, color: "from-amber-400 to-orange-500", tone: "warn" },
  { href: "/nodes", label: "Nodes", Icon: Server, color: "from-emerald-400 to-green-500", tone: "ai" },
  { href: "/apps", label: "App Store", Icon: Boxes, color: "from-rose-400 to-red-500", tone: "danger" },
  { href: "/apps", label: "Storage", Icon: HardDrive, color: "from-slate-400 to-slate-600", tone: "neutral" },
  { href: "/activity", label: "Activity", Icon: Activity, color: "from-blue-400 to-indigo-500", tone: "chain" },
  { href: "/apps", label: "Network", Icon: Wifi, color: "from-cyan-400 to-sky-500", tone: "ai" },
  { href: "/apps", label: "AI Hub", Icon: Sparkles, color: "from-violet-400 to-fuchsia-500", tone: "chain" },
];

export default async function Home() {
  const statuses = await Promise.all(DEFAULT_NODES.map(getNodeStatus));
  const online = statuses.filter((s) => s.online).length;
  const totalPeers = statuses.reduce((a, s) => a + (s.peerCount ?? 0), 0);
  const maxBlock = statuses.reduce((a, s) => Math.max(a, s.blockNumber ?? 0), 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-os-section animate-slide-up">
      {/* Hero */}
      <header className="flex flex-col items-center text-center pt-os-4">
        <div className="relative mb-os-5">
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-teal-400/20 via-indigo-500/20 to-fuchsia-500/20 blur-3xl scale-110" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Axionax"
            className="h-24 w-24 object-contain invert brightness-125 contrast-125 drop-shadow-[0_0_24px_rgba(94,234,212,0.4)]"
          />
        </div>
        <h1 className="text-display text-zinc-100">
          {greeting},{" "}
          <span className="text-zinc-500 font-light">Axionax</span>
          <span className="text-zinc-500 font-light">.</span>
        </h1>
        <p className="mt-os-2 text-caption uppercase text-zinc-500">
          Decentralized AI Operating System
        </p>
      </header>

      {/* Live widgets */}
      <section aria-label="System overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-os-4">
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
        <SectionDivider label="Applications" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-os-5 gap-y-os-8">
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
    <WidgetShell accent="teal" eyebrow="Network">
      <div className="mt-os-3 flex items-baseline gap-2">
        <span className="text-headline font-semibold tabular-nums text-zinc-100">
          {block.toLocaleString()}
        </span>
        <span className="text-caption uppercase text-zinc-500">block</span>
      </div>
      <div className="mt-os-4 flex flex-wrap items-center gap-2">
        <Stat label="Online" value={`${online}/${total}`} dot="emerald" />
        <Stat label="Peers" value={peers} dot="indigo" />
        <Stat label="Chain" value="86137" dot="cyan" />
      </div>
    </WidgetShell>
  );
}

function SystemWidget() {
  return (
    <WidgetShell accent="indigo" eyebrow="System">
      <div className="mt-os-3 grid grid-cols-3 gap-2">
        <SysStat label="CPU" value="32%" Icon={Cpu} tone="emerald" />
        <SysStat label="Mem" value="5.8 GB" Icon={Activity} tone="indigo" />
        <SysStat label="Disk" value="1.7 TB" Icon={HardDrive} tone="cyan" />
      </div>
      <div className="mt-os-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-medium">
          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
          Hailo-NPU
        </span>
        <span className="text-[10px] text-zinc-500">4 GB worker pool</span>
      </div>
    </WidgetShell>
  );
}

function NotificationsWidget({ lastBlock }: { lastBlock: number }) {
  return (
    <WidgetShell accent="amber" eyebrow="Notifications">
      <ul className="mt-os-3 space-y-os-3">
        <NotificationItem
          dot="emerald"
          title="Worker rewarded"
          subtitle="+0.42 AXIO · 2m ago"
        />
        <NotificationItem
          dot="indigo"
          title="New block produced"
          subtitle={`#${lastBlock.toLocaleString()} · just now`}
        />
        <NotificationItem
          dot="amber"
          title="System update available"
          subtitle="v0.1.2 · 1h ago"
        />
      </ul>
    </WidgetShell>
  );
}

const ACCENT_BG: Record<string, string> = {
  teal: "from-teal-400/15 to-teal-400/0",
  indigo: "from-indigo-400/15 to-indigo-400/0",
  amber: "from-amber-400/15 to-amber-400/0",
};

const ACCENT_DOT: Record<string, string> = {
  teal: "bg-teal-400 shadow-[0_0_8px_rgba(94,234,212,0.55)]",
  indigo: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.55)]",
  amber: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]",
};

function WidgetShell({
  accent,
  eyebrow,
  children,
}: {
  accent: keyof typeof ACCENT_BG;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-os-xl p-os-5 relative overflow-hidden group transition-colors duration-base hover:border-white/12">
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${ACCENT_BG[accent]} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-thoughtful`}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-overline text-zinc-500 font-medium">
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${ACCENT_DOT[accent]}`} />
          {eyebrow}
        </div>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

const DOT_CLS: Record<string, string> = {
  emerald: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
  indigo: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]",
  cyan: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]",
  amber: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]",
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/5 px-2.5 py-1 text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[dot]}`} />
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="font-mono text-[11px] font-medium">{value}</span>
    </span>
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
    <li className="flex items-start gap-3 group">
      <span className={`mt-1.5 h-2 w-2 rounded-full ${DOT_CLS[dot]} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors duration-fast truncate">
          {title}
        </div>
        <div className="text-[11px] text-zinc-500 truncate">{subtitle}</div>
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
    <div className="rounded-os-md bg-white/[0.04] border border-white/5 p-2 text-center">
      <Icon size={13} className={`mx-auto ${SYS_TONES[tone]}`} strokeWidth={2} />
      <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-100">{value}</div>
      <div className="text-overline text-zinc-500">{label}</div>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-os-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <span className="text-overline text-zinc-500 font-medium">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

function AppTile({ app, index }: { app: LauncherApp; index: number }) {
  return (
    <Link
      href={app.href}
      className="group flex flex-col items-center gap-os-2 focus:outline-none animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div
        className={`app-icon-shadow grid h-[76px] w-[76px] place-items-center rounded-os-2xl bg-gradient-to-br ${app.color} text-white transition-transform duration-base ease-os group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-focus-visible:-translate-y-1.5 group-focus-visible:scale-[1.03] relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-base" />
        <app.Icon size={28} className="relative z-10 drop-shadow" strokeWidth={1.75} />
      </div>
      <div className="text-[11px] text-zinc-400 group-hover:text-zinc-100 font-medium transition-colors duration-fast">
        {app.label}
      </div>
    </Link>
  );
}
