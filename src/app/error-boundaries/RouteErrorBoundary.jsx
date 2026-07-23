import React from "react";
import { useLocation } from "react-router-dom";

class RouteErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <section className="route-error-state" role="alert">
          <span>Recovery</span>
          <h1>Workspace view could not render</h1>
          <p>{this.state.error?.message || "Reload the page or return to another workspace view."}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return (
    <RouteErrorBoundaryInner key={location.pathname}>
      {children}
    </RouteErrorBoundaryInner>
  );
}
