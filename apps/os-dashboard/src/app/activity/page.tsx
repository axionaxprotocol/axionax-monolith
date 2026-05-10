import Link from "next/link";
import { Cpu, ExternalLink } from "lucide-react";
import { Card } from "@/components/card";
import { fetchChainActivity } from "@/lib/activity-feed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

export default async function ActivityPage() {
  const { rows, rpcLabel, rpcUrl, error } = await fetchChainActivity({
    maxBlocks: 16,
    maxTxRows: 40,
  });

  return (
    <div className="space-y-os-8">
      <header className="flex flex-col gap-os-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-os-4">
        <div>
          <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">ACTIVITY_FEED</h1>
          <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-xl uppercase tracking-wider">
            On-chain jobs and transactions observed from the configured validator RPCs.
          </p>
          <div className="mt-os-4 flex flex-wrap gap-os-2">
            <Link
              href="/activity/inference"
              className="text-caption font-mono uppercase tracking-widest text-accent-ai hover:text-accent-ai/80 hover:bg-accent-ai/10 px-2 py-1 rounded-sm transition-colors border border-transparent hover:border-accent-ai/20"
            >
              [ INFERENCE_RUNS ]
            </Link>
            <Link
              href="/activity/models"
              className="text-caption font-mono uppercase tracking-widest text-accent-chain hover:text-accent-chain/80 hover:bg-accent-chain/10 px-2 py-1 rounded-sm transition-colors border border-transparent hover:border-accent-chain/20"
            >
              [ MODEL_REGISTRY ]
            </Link>
            <Link
              href="/jobs"
              className="text-caption font-mono uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/5 px-2 py-1 rounded-sm transition-colors border border-transparent hover:border-white/10"
            >
              [ JOBS_HUB ]
            </Link>
          </div>
        </div>
        {rpcUrl && (
          <div className="text-micro uppercase text-zinc-500 font-mono tracking-widest border border-border bg-bg-elev px-2 py-1 rounded-sm">
            SRC: {rpcLabel}
          </div>
        )}
      </header>

      {error && (
        <Card className="border border-accent-warn/20 bg-accent-warn/5">
          <p className="text-body font-mono text-accent-warn">ERR: {error}</p>
          <p className="text-caption font-mono text-zinc-500 mt-os-3 uppercase tracking-wider">
            Hint: ensure nodes in <code className="text-zinc-400 bg-bg-elev px-1">@axionax/sdk</code>{" "}
            <code className="text-zinc-400 bg-bg-elev px-1">DEFAULT_NODES</code> match your testnet.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-os-4">
        <Card className="lg:col-span-2 overflow-hidden p-0 flex flex-col bg-bg-card">
          <div className="flex items-center justify-between border-b border-border px-os-4 py-os-3 bg-bg-elev">
            <div className="text-micro uppercase tracking-widest text-zinc-500 font-mono">
              CHAIN_EVENT_STREAM
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent-ai/10 border border-accent-ai/20 px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono text-accent-ai">
              <Cpu size={10} />
              LIVE_RPC
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body font-mono">
              <thead className="bg-bg-elev">
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-os-4 py-os-2 font-medium">Type</th>
                  <th className="px-os-4 py-os-2 font-medium">Block</th>
                  <th className="px-os-4 py-os-2 font-medium hidden sm:table-cell">
                    Time_UTC
                  </th>
                  <th className="px-os-4 py-os-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && !error ? (
                  <tr>
                    <td colSpan={4} className="px-os-4 py-os-8 text-zinc-500 text-center uppercase tracking-widest text-micro">
                      NO_BLOCKS_RETURNED
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-bg-elev transition-colors"
                    >
                      <td className="px-os-4 py-os-2">
                        <span
                          className={`text-[10px] uppercase tracking-widest ${
                            row.kind === "block"
                              ? "text-accent-chain"
                              : "text-accent-ai"
                          }`}
                        >
                          {row.kind === "block" ? "BLK" : "TX"}
                        </span>
                      </td>
                      <td className="px-os-4 py-os-2 tabular-nums text-zinc-200">
                        {row.blockNumber.toLocaleString()}
                      </td>
                      <td className="px-os-4 py-os-2 text-zinc-500 hidden sm:table-cell">
                        {formatTime(row.at)}
                      </td>
                      <td className="px-os-4 py-os-2 text-zinc-400">
                        {row.kind === "tx" && row.txHash ? (
                          <span className="text-xs break-all">
                            {row.txHash.slice(0, 18)}…
                          </span>
                        ) : (
                          row.detail
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col gap-os-4 bg-bg-elev h-fit">
          <div className="text-title font-mono font-semibold text-zinc-200 uppercase tracking-widest">OPERATOR_TOOLS</div>
          <p className="text-caption font-mono text-zinc-500 uppercase tracking-wider leading-relaxed">
            Cross-check peers and latency on the Nodes screen while tailing activity.
          </p>
          <div className="flex flex-col gap-os-2 mt-os-2">
            <Link
              href="/nodes"
              className="inline-flex items-center justify-between rounded-os-sm bg-bg-card border border-border px-os-4 py-os-3 text-caption font-mono uppercase tracking-widest text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              NODE_HEALTH
              <ExternalLink size={14} className="text-zinc-500" />
            </Link>
            <Link
              href="/logs"
              className="inline-flex items-center justify-between rounded-os-sm bg-bg-card border border-border px-os-4 py-os-3 text-caption font-mono uppercase tracking-widest text-zinc-200 hover:border-zinc-500 transition-colors"
            >
              LOG_STREAM
              <ExternalLink size={14} className="text-zinc-500" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
