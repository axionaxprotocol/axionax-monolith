import { LogViewer } from "@/components/log-viewer";
import { buildLogSeedLines } from "@/lib/log-seed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LogsPage() {
  const seedLines = await buildLogSeedLines();

  return (
    <div className="space-y-os-8">
      <header className="border-b border-border pb-os-4">
        <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">SYS_LOGS</h1>
        <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-xl uppercase tracking-wider">
          RPC-backed seed lines plus a lightweight tail simulation until WebSocket log streaming lands on the node.
        </p>
      </header>

      <LogViewer seedLines={seedLines} />
    </div>
  );
}
