import React from "react";

export default class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Chart render failed.",
    };
  }

  componentDidCatch() {
    // Swallow render errors and show a stable chart state card instead.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-status-card is-error">
          <span className="chart-status-kicker">Chart</span>
          <strong className="chart-status-title">Render error</strong>
          <p className="chart-status-description">{this.state.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

