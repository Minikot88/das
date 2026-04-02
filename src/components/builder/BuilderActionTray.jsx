import React from "react";
import Button from "../ui/Button";

export default function BuilderActionTray({
  saveSuccess,
  canAddChart,
  validationSummary,
  resetBuilderState,
  navigate,
  handleSave,
  saveLabel = "Save Visual",
  saveDescription = "Save to chart library.",
  readyLabel = "Dashboard library",
  cancelLabel = "Cancel",
  onCancel,
  saveDisabledReason = null,
}) {
  const blockerCount = validationSummary?.blockers?.length ?? 0;
  const isDisabled = !canAddChart || Boolean(saveDisabledReason);

  return (
    <div className="builder-config-section builder-inspector-section builder-action-section">
      <div className="builder-section-head">
        <div>
          <span className="builder-query-label">Save</span>
          <p className="builder-section-description">
            {blockerCount
              ? "Resolve blockers to save."
              : saveDescription}
          </p>
        </div>
      </div>

      <div className="builder-inspector-subrow">
        <span>{canAddChart ? "Ready to save" : "Draft only"}</span>
        <span>{saveSuccess ? "Saved" : readyLabel}</span>
      </div>

      <div className="builder-action-tray compact">
        <p className="builder-action-message">
          {blockerCount
            ? "Draft mode."
            : saveDisabledReason || "Ready to save."}
        </p>
        <div className="builder-action-row flex gap-2">
          <Button
            variant="ghost"
            className="flex-1 text-xs builder-action-btn-secondary"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              resetBuilderState();
              navigate("/dashboard");
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            className="flex-1 text-xs builder-action-btn-primary"
            onClick={handleSave}
            disabled={isDisabled}
          >
            {saveSuccess ? "Saved" : blockerCount ? `${blockerCount} blockers` : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
