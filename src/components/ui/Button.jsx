import React from "react";

export default function Button({ children, variant = "secondary", icon, className = "", ...props }) {
  let styles = "button-base";
  if (variant === "primary") styles += " button-primary";
  if (variant === "secondary") styles += " button-secondary";
  if (variant === "ghost") styles += " button-ghost";
  if (variant === "danger") styles += " button-danger";
  if (props.disabled) styles += " is-disabled";
  if (className) styles += ` ${className}`;

  return (
    <button className={styles} {...props}>
      {icon ? <span className="button-icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
