import Link from "next/link";
import { ArrowRight, Boxes, Brain, Cpu } from "lucide-react";
import { Card } from "@/components/card";

export const dynamic = "force-dynamic";

const JOB_LINKS = [
  {
    href: "/activity/inference",
    title: "INFERENCE_RUNS",
    desc: "Recent model executions and latency summary from RPC-backed probes.",
    Icon: Brain,
    accent: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  },
  {
    href: "/activity/models",
    title: "MODEL_REGISTRY",
    desc: "Registered models and compatibility tags for worker assignment.",
    Icon: Cpu,
    accent: "text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20",
  },
  {
    href: "/apps",
    title: "WORKER_APP",
    desc: "Install or open the DeAI Worker app for compute jobs on your node.",
    Icon: Boxes,
    accent: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
] as const;

export default function JobsPage() {
  return (
    <div className="space-y-os-8">
      <header className="border-b border-border pb-os-4">
        <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">WORKLOAD_JOBS</h1>
        <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-2xl uppercase tracking-wider">
          Command-center entry points for DeAI workloads. On-chain job receipts merge into Activity.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-os-4 md:grid-cols-2 lg:grid-cols-3">
        {JOB_LINKS.map(({ href, title, desc, Icon, accent }) => (
          <Link key={href} href={href} className="group block outline-none">
            <Card className="h-full border border-border transition-colors hover:border-zinc-500 hover:bg-bg-elev">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-os-sm border ${accent}`}
              >
                <Icon size={20} aria-hidden />
              </div>
              <h2 className="mt-os-4 text-title font-mono font-semibold text-zinc-100 group-hover:text-white transition-colors">
                {title}
              </h2>
              <p className="mt-os-2 text-body text-zinc-400 leading-relaxed">{desc}</p>
              <div className="mt-os-4 pt-os-3 border-t border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Action</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-zinc-300 group-hover:text-accent-ai transition-colors uppercase tracking-widest">
                  OPEN
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border border-border bg-bg-elev">
        <div className="flex items-center gap-2 mb-os-2">
          <span className="h-2 w-2 bg-accent-ai rounded-sm animate-pulse-glow" />
          <p className="text-caption font-mono font-semibold uppercase tracking-widest text-accent-ai">
            DECENTRALIZED_DEMO
          </p>
        </div>
        <p className="text-body font-mono text-zinc-400">
          End-to-end Python workload flow is documented under{" "}
          <code className="rounded-sm bg-bg-card border border-border px-1.5 py-0.5 text-caption text-zinc-200">
            services/core/core/deai/RUNBOOK.md
          </code>{" "}
          (<span className="text-zinc-200">deai_submit.py</span> → worker →{" "}
          <span className="text-zinc-200">result-*.json</span>).
        </p>
      </Card>
    </div>
  );
}
