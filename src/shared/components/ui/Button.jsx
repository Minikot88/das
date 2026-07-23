import React from "react";

export default function Button({ children, variant = "secondary", icon, className = "", ...props }) {
  let styles = "ui-button button-base";
  if (variant === "primary") styles += " is-primary button-primary";
  if (variant === "secondary") styles += " is-secondary button-secondary";
  if (variant === "ghost") styles += " is-ghost button-ghost";
  if (variant === "danger") styles += " is-danger button-danger";
  if (props.disabled) styles += " is-disabled";
  if (className) styles += ` ${className}`;

  return (
    <button className={styles} {...props}>
      {icon ? <span className="button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
