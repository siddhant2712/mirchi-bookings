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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded shadow-lg p-6 overflow-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-red-700">
                  Application Error
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  An unexpected error occurred while rendering the application.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                >
                  Reload
                </button>
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, info: null });
                  }}
                  className="px-3 py-1 rounded border text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="text-sm font-semibold">Error</h2>
              <pre className="p-3 mt-2 bg-gray-100 rounded text-xs whitespace-pre-wrap">
                {String(this.state.error)}
              </pre>
            </div>

            {this.state.info?.componentStack && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold">Component stack</h2>
                <pre className="p-3 mt-2 bg-gray-100 rounded text-xs whitespace-pre-wrap">
                  {this.state.info.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactNode;
  }
}
