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
    <div className="space-y-os-section">
      <header className="flex flex-col gap-os-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline font-semibold tracking-tight">Activity</h1>
          <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
            On-chain jobs and transactions observed from the configured validator
            RPCs — DeAI worker events will merge here when the notification bus is
            live.
          </p>
          <div className="mt-os-3 flex flex-wrap gap-os-2 text-body">
            <Link
              href="/activity/inference"
              className="text-accent hover:underline underline-offset-4"
            >
              Inference runs
            </Link>
            <span className="text-zinc-600">·</span>
            <Link
              href="/activity/models"
              className="text-accent hover:underline underline-offset-4"
            >
              Model registry
            </Link>
            <span className="text-zinc-600">·</span>
            <Link
              href="/jobs"
              className="text-accent hover:underline underline-offset-4"
            >
              Jobs hub
            </Link>
          </div>
        </div>
        {rpcUrl && (
          <div className="text-caption uppercase text-zinc-500 font-mono">
            source · {rpcLabel}
          </div>
        )}
      </header>

      {error && (
        <Card className="border border-amber-500/20 bg-amber-500/5">
          <p className="text-body text-amber-200">{error}</p>
          <p className="text-caption text-zinc-500 mt-os-3">
            Tip: ensure nodes in <code className="font-mono text-zinc-400">@axionax/sdk</code>{" "}
            <code className="font-mono text-zinc-400">DEFAULT_NODES</code> match your testnet.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-os-4">
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-white/5 px-os-panel py-os-3">
            <div className="text-overline uppercase tracking-wider text-zinc-500">
              Chain feed
            </div>
            <span className="inline-flex items-center gap-os-2 rounded-full bg-accent/10 px-os-3 py-os-1 text-caption font-mono text-accent">
              <Cpu size={12} />
              live RPC
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase text-zinc-500">
                  <th className="px-os-panel py-os-3 font-medium">Type</th>
                  <th className="px-os-panel py-os-3 font-medium">Block</th>
                  <th className="px-os-panel py-os-3 font-medium hidden sm:table-cell">
                    Time (UTC)
                  </th>
                  <th className="px-os-panel py-os-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !error ? (
                  <tr>
                    <td colSpan={4} className="px-os-panel py-os-8 text-zinc-500">
                      No blocks returned yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition"
                    >
                      <td className="px-os-panel py-os-3 font-mono">
                        <span
                          className={
                            row.kind === "block"
                              ? "text-accent-chain"
                              : "text-accent-ai"
                          }
                        >
                          {row.kind === "block" ? "block" : "tx"}
                        </span>
                      </td>
                      <td className="px-os-panel py-os-3 font-mono tabular-nums text-zinc-200">
                        {row.blockNumber.toLocaleString()}
                      </td>
                      <td className="px-os-panel py-os-3 font-mono text-zinc-500 hidden sm:table-cell">
                        {formatTime(row.at)}
                      </td>
                      <td className="px-os-panel py-os-3 text-zinc-400">
                        {row.kind === "tx" && row.txHash ? (
                          <span className="font-mono text-xs break-all">
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

        <Card className="flex flex-col gap-os-4">
          <div className="text-title font-semibold text-zinc-200">Operator</div>
          <p className="text-body text-zinc-500">
            Cross-check peers and latency on the Nodes screen while tailing
            activity.
          </p>
          <Link
            href="/nodes"
            className="inline-flex items-center gap-os-2 rounded-xl bg-white/5 px-os-4 py-os-3 text-body text-zinc-200 hover:bg-white/10 transition"
          >
            Open node health
            <ExternalLink size={14} />
          </Link>
          <Link
            href="/logs"
            className="inline-flex items-center gap-os-2 rounded-xl border border-matte-800 px-os-4 py-os-3 text-body text-zinc-300 hover:border-zinc-600 transition"
          >
            View log stream
          </Link>
        </Card>
      </div>
    </div>
  );
}
