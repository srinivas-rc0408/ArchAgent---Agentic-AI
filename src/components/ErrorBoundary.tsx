import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-black/40 border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-md">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-white font-bold tracking-widest uppercase mb-4">
            Module Re-calibrating
          </h2>
          <p className="text-white/60 text-sm max-w-md mb-8">
            An unexpected interference caused this workspace module to fault. The core engine remains stable.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-white text-black hover:bg-zinc-200 uppercase tracking-widest text-[10px] font-black h-12 px-8 rounded-xl"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Retry Initialization
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
