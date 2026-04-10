import React from "react";

export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className={`ui-field input-field${className ? ` ${className}` : ""}`}>
      {label ? <label className="ui-field-label input-label">{label}</label> : null}
      <input className={`ui-input input-control${error ? " has-error" : ""}`} {...props} />
      {error ? <span className="ui-field-error input-error">{error}</span> : null}
    </div>
  );
}
