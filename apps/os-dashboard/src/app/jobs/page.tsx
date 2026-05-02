import Link from "next/link";
import { ArrowRight, Boxes, Brain, Cpu } from "lucide-react";
import { Card } from "@/components/card";

export const dynamic = "force-dynamic";

const JOB_LINKS = [
  {
    href: "/activity/inference",
    title: "Inference runs",
    desc: "Recent model executions and latency summary from RPC-backed probes.",
    Icon: Brain,
    accent: "from-teal-400 to-cyan-500",
  },
  {
    href: "/activity/models",
    title: "Model registry",
    desc: "Registered models and compatibility tags for worker assignment.",
    Icon: Cpu,
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    href: "/apps",
    title: "App Store · Worker",
    desc: "Install or open the DeAI Worker app for compute jobs on your node.",
    Icon: Boxes,
    accent: "from-rose-400 to-orange-500",
  },
] as const;

export default function JobsPage() {
  return (
    <div className="space-y-os-section">
      <header>
        <h1 className="text-headline font-semibold tracking-tight">Jobs</h1>
        <p className="text-body text-zinc-500 mt-os-2 max-w-2xl">
          Command-center entry points for DeAI workloads: inference activity,
          model registry, and the Worker app. On-chain job receipts merge into
          Activity when the notification bus is connected.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-os-4 md:grid-cols-2 lg:grid-cols-3">
        {JOB_LINKS.map(({ href, title, desc, Icon, accent }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full border border-white/5 transition hover:border-accent/30 hover:bg-white/[0.03]">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}
              >
                <Icon size={20} aria-hidden />
              </div>
              <h2 className="mt-os-4 text-title font-semibold text-zinc-100 group-hover:text-accent transition">
                {title}
              </h2>
              <p className="mt-os-2 text-body text-zinc-500">{desc}</p>
              <span className="mt-os-4 inline-flex items-center gap-1 text-caption font-medium text-accent">
                Open
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border border-white/5">
        <p className="text-caption uppercase tracking-wide text-zinc-500 font-mono">
          decentralized demo
        </p>
        <p className="mt-os-2 text-body text-zinc-400">
          End-to-end Python workload flow is documented under{" "}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-caption text-teal-300">
            services/core/core/deai/RUNBOOK.md
          </code>{" "}
          (<span className="font-mono text-zinc-300">deai_submit.py</span> → worker →{" "}
          <span className="font-mono text-zinc-300">result-*.json</span>).
        </p>
      </Card>
    </div>
  );
}
