import { Card } from "@/components/card";
import {
  Cpu,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  type: "llm" | "vision" | "audio" | "embedding" | "depth";
  size: string; // e.g. "70B", "v3", "Medium"
  precision: "FP16" | "INT8" | "INT4" | "FP32";
  status: "active" | "deprecated" | "beta";
  deployedOn: string[]; // node names
  totalInferences: number;
  avgLatencyMs: number;
  lastUsed: number; // timestamp
}

// ---------------------------------------------------------------------------
// Mock model registry
// ---------------------------------------------------------------------------

const MODEL_CATALOG: Omit<ModelInfo, "deployedOn" | "totalInferences" | "avgLatencyMs" | "lastUsed">[] = [
  { id: "m-llama70b", name: "DeAI-LLaMA-3-70B", version: "3.2", type: "llm", size: "70B", precision: "INT8", status: "active" },
  { id: "m-llama8b", name: "DeAI-LLaMA-3-8B", version: "3.1", type: "llm", size: "8B", precision: "INT4", status: "active" },
  { id: "m-sdxl", name: "DeAI-SDXL", version: "v3.2", type: "vision", size: "v3", precision: "FP16", status: "active" },
  { id: "m-yolo", name: "DeAI-YOLOv11", version: "nano", type: "vision", size: "nano", precision: "INT8", status: "active" },
  { id: "m-whisper", name: "DeAI-Whisper", version: "Medium", type: "audio", size: "Medium", precision: "FP16", status: "active" },
  { id: "m-bge", name: "DeAI-BGE-M3", version: "1.0", type: "embedding", size: "M3", precision: "INT8", status: "active" },
  { id: "m-zoe", name: "DeAI-ZoeDepth", version: "v2.1", type: "depth", size: "v2", precision: "FP16", status: "active" },
  { id: "m-llama13b", name: "DeAI-LLaMA-2-13B", version: "2.0", type: "llm", size: "13B", precision: "INT8", status: "deprecated" },
  { id: "m-sam", name: "DeAI-SAM", version: "beta1", type: "vision", size: "base", precision: "FP16", status: "beta" },
  { id: "m-ast", name: "DeAI-AST", version: "v1", type: "audio", size: "Large", precision: "FP32", status: "beta" },
];

const NODES = [
  "Axionax-Sentinel-Alpha",
  "Axionax-Sentinel-Beta",
  "Axionax-Worker-Gamma",
  "Node 1 (EU)",
  "Node 2 (ES)",
];

function buildModelRegistry(): ModelInfo[] {
  const now = Date.now();
  return MODEL_CATALOG.map((m) => {
    const deployedOn = m.status === "deprecated"
      ? NODES.slice(0, 1)
      : m.status === "beta"
      ? NODES.slice(0, 2)
      : NODES.slice(0, 3 + Math.floor(Math.random() * 2));
    return {
      ...m,
      deployedOn,
      totalInferences: Math.floor(Math.random() * 50000 + 1000),
      avgLatencyMs: Math.floor(Math.random() * 3000 + 100),
      lastUsed: now - Math.floor(Math.random() * 86400000),
    };
  }).sort((a, b) => b.totalInferences - a.totalInferences);
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ModelInfo["status"] }) {
  const map: Record<
    ModelInfo["status"],
    { label: string; cls: string; Icon: LucideIcon }
  > = {
    active: {
      label: "Active",
      cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
      Icon: CheckCircle2,
    },
    deprecated: {
      label: "Deprecated",
      cls: "bg-zinc-400/10 text-zinc-400 border-zinc-400/30",
      Icon: XCircle,
    },
    beta: {
      label: "Beta",
      cls: "bg-amber-400/10 text-amber-300 border-amber-400/30",
      Icon: Loader2,
    },
  };
  const { label, cls, Icon } = map[status]!;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: ModelInfo["type"] }) {
  const cls =
    type === "llm"
      ? "bg-indigo-400/10 text-indigo-300 border-indigo-400/30"
      : type === "vision"
      ? "bg-violet-400/10 text-violet-300 border-violet-400/30"
      : type === "audio"
      ? "bg-sky-400/10 text-sky-300 border-sky-400/30"
      : type === "embedding"
      ? "bg-cyan-400/10 text-cyan-300 border-cyan-400/30"
      : "bg-emerald-400/10 text-emerald-300 border-emerald-400/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Database size={10} />
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ModelRegistryPage() {
  const models = buildModelRegistry();

  const active = models.filter((m) => m.status === "active").length;
  const totalInferences = models.reduce((a, m) => a + m.totalInferences, 0);
  const deployedCount = models.reduce((a, m) => a + m.deployedOn.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">DeAI Model Registry</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Available models, deployment status, and usage statistics across nodes.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Models</div>
          <div className="mt-1 text-xl font-semibold">{models.length}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Active</div>
          <div className="mt-1 text-xl font-semibold text-emerald-300">{active}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Deployments</div>
          <div className="mt-1 text-xl font-semibold text-teal-300">{deployedCount}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Total Inferences</div>
          <div className="mt-1 text-xl font-semibold text-indigo-300">
            {(totalInferences / 1_000).toFixed(0)}k
          </div>
        </div>
      </div>

      {/* ---- Model List ---- */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Cpu size={16} className="text-teal-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Model Catalog
          </h2>
          <span className="rounded-full bg-teal-400/10 px-2 py-0.5 text-[11px] text-teal-300">
            {models.length}
          </span>
        </div>

        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="glass rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Row 1: Name + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100 truncate">
                    {model.name}
                  </span>
                  <span className="text-[11px] text-zinc-500">v{model.version}</span>
                </div>
                <StatusBadge status={model.status} />
              </div>

              {/* Row 2: Type + Size + Precision */}
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <TypeBadge type={model.type} />
                <span className="flex items-center gap-1">
                  <Zap size={12} />
                  {model.size}
                </span>
                <span className="flex items-center gap-1">
                  <Database size={12} />
                  {model.precision}
                </span>
              </div>

              {/* Row 3: Stats */}
              <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                <span>
                  {(model.totalInferences / 1000).toFixed(1)}k inferences
                </span>
                <span>
                  {model.avgLatencyMs} ms avg
                </span>
                <span className="ml-auto">
                  Last used {new Date(model.lastUsed).toLocaleDateString()}
                </span>
              </div>

              {/* Row 4: Deployed nodes */}
              <div className="flex flex-wrap gap-1.5">
                {model.deployedOn.map((node) => (
                  <span
                    key={node}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    <Cpu size={10} />
                    {node}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
