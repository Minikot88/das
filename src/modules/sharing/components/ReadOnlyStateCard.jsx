import React from "react";
import { Link } from "react-router";

export default function ReadOnlyStateCard({
  kicker,
  title,
  description,
  loading = false,
  headingLevel = 2,
  linkTo,
  linkLabel,
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className={`readonly-state-card${loading ? " loading" : ""}`}>
      {loading ? (
        <div className="readonly-state-loader" aria-hidden="true">
          <div className="readonly-state-loader-orb" />
          <div className="readonly-state-loader-bar short" />
          <div className="readonly-state-loader-bar" />
        </div>
      ) : (
        <div className="readonly-state-icon" aria-hidden="true">
          <span />
        </div>
      )}
      <div className="readonly-state-copy">
        {kicker ? <div className="readonly-state-kicker">{kicker}</div> : null}
        <Heading className="readonly-state-title">{title}</Heading>
        <p className="readonly-state-description">{description}</p>
      </div>
      {linkTo && linkLabel ? (
        <Link to={linkTo} className="share-back-link readonly-state-link">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
