import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // This logs to the Tauri terminal (stdout/stderr)
    console.error("[ErrorBoundary] Uncaught error:", error.message);
    console.error("[ErrorBoundary] Stack:", error.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  private handleCopy = () => {
    const text = `${this.state.error?.message}\n\n${this.state.error?.stack}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true } as Partial<State> as State);
      setTimeout(() => this.setState({ copied: false } as Partial<State> as State), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      const copied = (this.state as State & { copied?: boolean }).copied;
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-foreground">
          <h1 className="text-lg font-bold text-destructive">Runtime Error</h1>
          <div className="relative max-w-xl w-full">
            <button
              className="absolute right-2 top-2 rounded bg-background/80 px-2 py-1 text-xs border border-border hover:bg-accent"
              onClick={this.handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <pre className="w-full overflow-auto rounded bg-muted p-4 pr-16 text-xs whitespace-pre-wrap select-all">
              {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack}
            </pre>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
            <button
              className="rounded border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
              onClick={this.handleCopy}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
