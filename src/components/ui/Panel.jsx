import React from "react";

export default function Panel({ children, compact = false, className = "", ...props }) {
  return (
    <section className={`ui-panel${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </section>
  );
}
