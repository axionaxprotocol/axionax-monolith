import Link from "next/link";
import { Terminal, Cpu, Shield, Activity, Network, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Axionax Protocol | Brutal Intelligence",
  description: "Decentralized AI operating environment and compute network.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-zinc-300 font-mono flex flex-col items-center justify-center p-4">
      {/* Brutalist Grid Container */}
      <div className="w-full max-w-5xl border border-border bg-bg-card p-6 md:p-12 space-y-12">
        
        {/* Header / Hero */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-accent-ai/10 border border-accent-ai/30 flex items-center justify-center">
                <Terminal size={24} className="text-accent-ai" />
              </div>
              <div>
                <h1 className="text-[2rem] md:text-[3rem] font-bold text-zinc-100 leading-none tracking-tighter uppercase">
                  AXIONAX_PROTOCOL
                </h1>
                <div className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] mt-1">
                  Decentralized_AI_Compute_Engine
                </div>
              </div>
            </div>
            <p className="max-w-xl text-sm text-zinc-400 leading-relaxed uppercase tracking-wider">
              A high-performance, deterministic execution layer for AI workloads. 
              Axionax merges decentralized consensus with bare-metal compute efficiency.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 border border-border px-3 py-1 bg-bg-elev">
              <span className="h-2 w-2 bg-accent-ok rounded-none animate-pulse-glow" />
              <span className="text-[10px] uppercase tracking-widest text-accent-ok">NETWORK_LIVE</span>
            </div>
            <Link 
              href="/" 
              className="flex items-center gap-2 bg-zinc-200 text-obsidian-950 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors"
            >
              INITIALIZE_OS <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        {/* System Architecture Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureBlock 
            icon={Cpu} 
            title="DEAI_WORKERS" 
            desc="Distributed GPU/NPU instances executing inference models. Proof-of-Compute secured."
            tone="accent-ai"
          />
          <FeatureBlock 
            icon={Network} 
            title="GOSSIP_CONSENSUS" 
            desc="Sub-second state finality via optimized p2p messaging and deterministic EVM."
            tone="accent-info"
          />
          <FeatureBlock 
            icon={Shield} 
            title="HYDRA_SENTINEL" 
            desc="Real-time risk management and anomaly detection at the protocol level."
            tone="accent-danger"
          />
        </section>

        {/* Global Telemetry (Mocked for Landing) */}
        <section className="border border-border bg-bg-elev p-6">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Activity size={12} />
              GLOBAL_TELEMETRY
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TelemetryStat label="TOTAL_COMPUTE" value="1.42 PFLOPS" />
            <TelemetryStat label="ACTIVE_NODES" value="8,492" />
            <TelemetryStat label="EPOCH_TIME" value="400ms" />
            <TelemetryStat label="TOTAL_STAKED" value="45.2M AXIO" />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest text-zinc-500">
          <div>© {new Date().getFullYear()} AXIONAX_FOUNDATION. STRICTLY CONFIDENTIAL.</div>
          <div className="flex gap-4">
            <Link href="https://github.com/axionax" className="hover:text-zinc-300">GITHUB</Link>
            <Link href="/docs" className="hover:text-zinc-300">DOCS</Link>
            <Link href="/apps/propsentinel" className="hover:text-zinc-300">RISK_ENGINE</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureBlock({ icon: Icon, title, desc, tone }: { icon: any, title: string, desc: string, tone: string }) {
  return (
    <div className="border border-border bg-bg-elev p-4 flex flex-col gap-4 hover:border-zinc-600 transition-colors">
      <div className={`h-8 w-8 border border-border flex items-center justify-center text-${tone}`}>
        <Icon size={16} />
      </div>
      <div>
        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest mb-2">{title}</h3>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TelemetryStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-lg font-bold text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}
