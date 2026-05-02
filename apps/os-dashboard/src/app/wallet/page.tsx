import { Card } from "@/components/card";
import { WalletActions } from "@/components/wallet-actions";
import { KeyRound } from "lucide-react";
import { DEFAULT_NODES, getBalance, getNodeStatus } from "@/lib/rpc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Demo receive address for balance probe — replace with keystore once wired. */
const DEMO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

function formatWeiToAxio(wei: bigint): string {
  const base = 10n ** 18n;
  const whole = wei / base;
  const rem = wei % base;
  if (rem === 0n) return `${whole}.0`;
  const frac = rem.toString().padStart(18, "0").replace(/0+$/, "") || "0";
  return `${whole}.${frac}`;
}

async function firstReachableRpc(): Promise<string | null> {
  for (const ep of DEFAULT_NODES) {
    const s = await getNodeStatus(ep);
    if (s.online) return ep.url;
  }
  return null;
}

export default async function WalletPage() {
  const rpcUrl = await firstReachableRpc();
  const bal = rpcUrl ? await getBalance(rpcUrl, DEMO_ADDRESS) : null;
  const weiStr =
    bal?.ok ? bal.data.toString() : "0";
  const formatted =
    bal?.ok ? formatWeiToAxio(bal.data) : "0.0";

  return (
    <div className="space-y-os-section">
      <header>
        <h1 className="text-headline font-semibold tracking-tight">Wallet</h1>
        <p className="text-body text-zinc-500 mt-os-2 max-w-xl">
          Receive, balance, and send flows for AXIO. Signing integrates with your
          browser wallet or CLI in a later release.
        </p>
      </header>

      {!rpcUrl && (
        <Card className="border border-rose-500/20 bg-rose-500/5">
          <p className="text-body text-rose-200">
            No RPC reachable — balance probe skipped.
          </p>
        </Card>
      )}

      <WalletActions
        address={DEMO_ADDRESS}
        balanceWei={weiStr}
        balanceFormatted={formatted}
      />

      <Card>
        <div className="flex items-start gap-os-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="font-semibold text-title text-zinc-200">
              Keys on device
            </div>
            <p className="text-body text-zinc-500 mt-os-2">
              Create or import a keystore when local vault support ships. Keys never
              leave this device.
            </p>
            <div className="mt-os-4 flex flex-wrap gap-os-2">
              <button
                type="button"
                disabled
                className="rounded-xl bg-white/5 px-os-4 py-os-2 text-body text-zinc-500 cursor-not-allowed"
              >
                Create wallet (soon)
              </button>
              <button
                type="button"
                disabled
                className="rounded-xl bg-white/5 px-os-4 py-os-2 text-body text-zinc-500 cursor-not-allowed"
              >
                Import keystore (soon)
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-semibold text-title text-zinc-200 mb-os-3">
          Security checklist
        </div>
        <ul className="text-body text-zinc-400 space-y-os-2">
          <li>Backup keystore JSON to an offline location.</li>
          <li>Never share your wallet password.</li>
          <li>Use VPN / Tor before exposing RPC publicly.</li>
          <li>Rotate keys after suspected compromise.</li>
        </ul>
      </Card>
    </div>
  );
}
