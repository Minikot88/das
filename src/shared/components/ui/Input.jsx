import React, { useId } from "react";

export default function Input({
  label,
  error,
  className = "",
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`ui-field input-field${className ? ` ${className}` : ""}`}>
      {label ? <label className="ui-field-label input-label" htmlFor={inputId}>{label}</label> : null}
      <input
        {...props}
        id={inputId}
        className={`ui-input input-control${error ? " has-error" : ""}`}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
      />
      {error ? <span className="ui-field-error input-error" id={errorId} role="alert">{error}</span> : null}
    </div>
  );
}
