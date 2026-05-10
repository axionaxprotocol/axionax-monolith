import { Card } from "@/components/card";
import { WalletActions } from "@/components/wallet-actions";
import { KeyRound } from "lucide-react";
import { OErrorBoundary } from "@/components/error-boundary";

export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <div className="space-y-os-8">
      <header className="border-b border-border pb-os-4">
        <h1 className="text-headline font-mono font-semibold tracking-tight text-zinc-100 uppercase">VAULT_WALLET</h1>
        <p className="text-body font-mono text-zinc-500 mt-os-2 max-w-xl uppercase tracking-wider">
          Receive, balance, and send flows for AXIO. Signing integrates with your browser wallet or CLI.
        </p>
      </header>

      <OErrorBoundary moduleName="WALLET_ACTIONS">
        <WalletActions />
      </OErrorBoundary>

      <Card className="bg-bg-elev rounded-none">
        <div className="flex flex-col sm:flex-row items-start gap-os-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-none border border-accent-ai/20 bg-accent-ai/10 text-accent-ai">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="font-mono font-semibold text-title text-zinc-100 uppercase tracking-widest">
              KEYS_ON_DEVICE
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-os-2 uppercase tracking-wider">
              Create or import a keystore when local vault support ships. Keys never leave this device.
            </p>
            <div className="mt-os-4 flex flex-wrap gap-os-2">
              <button
                type="button"
                disabled
                className="rounded-none bg-bg-card border border-border px-os-4 py-1.5 text-[9px] font-mono uppercase tracking-widest text-zinc-500 cursor-not-allowed"
              >
                CREATE_WALLET (SOON)
              </button>
              <button
                type="button"
                disabled
                className="rounded-none bg-bg-card border border-border px-os-4 py-1.5 text-[9px] font-mono uppercase tracking-widest text-zinc-500 cursor-not-allowed"
              >
                IMPORT_KEYSTORE (SOON)
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-bg-elev rounded-none">
        <div className="font-mono font-semibold text-title text-zinc-100 mb-os-3 uppercase tracking-widest">
          SECURITY_CHECKLIST
        </div>
        <ul className="text-[10px] font-mono text-zinc-400 space-y-os-2 uppercase tracking-wider">
          <li className="flex items-start gap-2"><span className="text-accent-ai">»</span> Backup keystore JSON to an offline location.</li>
          <li className="flex items-start gap-2"><span className="text-accent-ai">»</span> Never share your wallet password.</li>
          <li className="flex items-start gap-2"><span className="text-accent-ai">»</span> Use VPN / Tor before exposing RPC publicly.</li>
          <li className="flex items-start gap-2"><span className="text-accent-ai">»</span> Rotate keys after suspected compromise.</li>
        </ul>
      </Card>
    </div>
  );
}
