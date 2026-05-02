import { LogViewer } from "@/components/log-viewer";
import { buildLogSeedLines } from "@/lib/log-seed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LogsPage() {
  const seedLines = await buildLogSeedLines();

  return (
    <div className="space-y-os-section">
      <header>
        <h1 className="text-headline font-semibold tracking-tight">Logs</h1>
        <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
          RPC-backed seed lines plus a lightweight tail simulation until WebSocket
          log streaming lands on the node.
        </p>
      </header>

      <LogViewer seedLines={seedLines} />
    </div>
  );
}
