/**
 * ChartErrorBoundary.jsx — React error boundary for individual chart cards.
 * Catches render errors and shows a graceful fallback instead of crashing the whole app.
 */
import React from "react";

export default class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // EXTENSION: Send to error tracking service (Sentry, Datadog, etc.)
    console.error("[ChartErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="chart-error-state" role="alert">
        <span className="chart-error-icon">⚠</span>
        <p className="chart-error-title">Chart failed to render</p>
        <p className="chart-error-msg">{this.state.error?.message ?? "Unknown error"}</p>
        <button className="chart-error-retry" onClick={this.reset}>
          ↺ Retry
        </button>
      </div>
    );
  }
}
