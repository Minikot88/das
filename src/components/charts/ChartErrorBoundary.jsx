/**
 * components/charts/ChartErrorBoundary.jsx
 * Elite Error Boundary for chart rendering.
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
    console.error("[ChartErrorBoundary] Catching rendering error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="chart-error-state" role="alert">
        <span className="chart-error-icon">⚠</span>
        <p className="chart-error-title">Visualization Error</p>
        <p className="chart-error-msg">{this.state.error?.message ?? "Component crashed during render."}</p>
        <button className="chart-error-retry" onClick={this.reset}>
          ↺ Re-initialize
        </button>
      </div>
    );
  }
}
