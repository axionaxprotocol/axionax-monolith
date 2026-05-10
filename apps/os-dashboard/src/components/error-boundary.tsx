"use client";

import { Component, type ReactNode } from "react";
import { Skull, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // In production, this would send to Sentry / Datadog
    console.error("OS Module Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-bg-card border border-accent-danger/50 rounded-none w-full min-h-[300px]">
          <div className="h-12 w-12 bg-accent-danger/10 border border-accent-danger/30 flex items-center justify-center rounded-none text-accent-danger mb-4">
            <Skull size={24} strokeWidth={2} />
          </div>
          <h2 className="text-title font-mono font-bold text-zinc-100 uppercase tracking-widest mb-1">
            MODULE_CRASHED
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 text-center max-w-md">
            {this.props.moduleName ? `THE [${this.props.moduleName}] MODULE` : "A SYSTEM MODULE"} ENCOUNTERED A FATAL EXCEPTION AND WAS SANDBOXED TO PREVENT OS CORRUPTION.
          </p>
          
          <div className="bg-bg-elev border border-border p-3 w-full max-w-md overflow-x-auto mb-6">
            <code className="text-[9px] font-mono text-accent-danger whitespace-pre-wrap break-all">
              {this.state.error?.message || "Unknown Exception"}
            </code>
          </div>

          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 bg-zinc-200 hover:bg-white text-obsidian-950 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors rounded-none"
          >
            <RotateCcw size={12} />
            RESTART_MODULE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
