import { ArrowLeft, Skull } from "lucide-react";
import Link from "next/link";
import { fetchPropsentinelDashboard } from "@/lib/propsentinel";
import { PropsentinelClient } from "@/components/propsentinel/dashboard-client";
import { OErrorBoundary } from "@/components/error-boundary";

export const dynamic = "force-dynamic";

export default async function PropsentinelPage() {
  const initialData = await fetchPropsentinelDashboard();

  return (
    <div className="space-y-4 animate-slide-up">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-3">
        <div>
          <Link href="/apps" className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors mb-2 outline-none focus-visible:ring-1 focus-visible:ring-white rounded-sm">
            <ArrowLeft size={10} />
            BACK
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-6 w-6 bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center rounded-sm text-accent-danger">
              <Skull size={12} strokeWidth={2.5} />
            </div>
            <h1 className="text-title font-mono font-semibold tracking-tight text-zinc-100 uppercase">
              PROPSENTINEL_RISK_ENGINE
            </h1>
          </div>
        </div>
      </header>

      {/* Client-side hydration for Real-time WebSockets isolated in an Error Boundary */}
      <OErrorBoundary moduleName="PROPSENTINEL_RISK">
        <PropsentinelClient initialData={initialData} />
      </OErrorBoundary>
    </div>
  );
}
