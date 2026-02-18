import React from "react";

interface State {
  hasError: boolean;
  error?: Error | null;
  info?: { componentStack: string } | null;
}

export default class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info });
    // Also log to console
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">The application encountered an error while rendering.</p>
          <details className="mt-4 whitespace-pre-wrap bg-muted/50 p-3 rounded">
            <summary className="cursor-pointer">Show error details</summary>
            <pre className="text-xs mt-2">{this.state.error?.toString()}{this.state.info?.componentStack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
