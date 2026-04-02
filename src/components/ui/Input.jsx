import React from "react";

export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className={`input-field${className ? ` ${className}` : ""}`}>
      {label ? <label className="input-label">{label}</label> : null}
      <input className={`input-control${error ? " has-error" : ""}`} {...props} />
      {error ? <span className="input-error">{error}</span> : null}
    </div>
  );
}
