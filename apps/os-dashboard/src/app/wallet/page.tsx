import { Card } from "@/components/card";
import { KeyRound, Plus, Upload } from "lucide-react";

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Wallet</h1>
        <p className="text-sm text-zinc-500">
          Manage your validator/worker keys safely on-device.
        </p>
      </header>

      <Card>
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
            <KeyRound size={20} />
          </div>
          <div className="flex-1">
            <div className="font-semibold">No wallet detected</div>
            <p className="text-sm text-zinc-500 mt-1">
              Create a new wallet or import an existing keystore. Keys never
              leave this device.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-accent text-bg px-3 py-1.5 text-sm font-medium hover:bg-accent-dim">
                <Plus size={14} /> Create wallet
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-bg-elev text-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-800">
                <Upload size={14} /> Import keystore
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Security checklist</div>
        <ul className="text-sm text-zinc-400 space-y-2">
          <li>· Backup your keystore JSON to an offline location</li>
          <li>· Never share your wallet password</li>
          <li>· Enable Tor / VPN before exposing RPC publicly</li>
          <li>· Rotate keys after suspected compromise</li>
        </ul>
      </Card>
    </div>
  );
}
