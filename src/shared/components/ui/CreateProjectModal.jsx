import React, { useState } from "react";
import { useI18n } from "@shared/lib/i18n";
import useFocusTrap from "@shared/hooks/useFocusTrap";
import Button from "@shared/components/ui/Button";
import Input from "@shared/components/ui/Input";

export default function CreateProjectModal({ onClose, onCreate }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useFocusTrap(true, onClose);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("home.projectNameRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onCreate(name.trim());
      onClose();
    } catch (submitError) {
      setError(submitError?.message || "Unable to create project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="modal-box ui-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-copy">
            <h2 className="modal-title" id="create-project-title">{t("home.newProject")}</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label={t("common.close")}>x</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <Input
            id="project-name-input"
            className="modal-field"
            label={t("home.projectName")}
            error={error || undefined}
            type="text"
            placeholder=""
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            autoFocus
            disabled={submitting}
          />
          <div className="modal-actions">
            <Button type="button" variant="ghost" className="modal-btn cancel" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
            <Button type="submit" variant="primary" className="modal-btn primary" disabled={submitting}>{submitting ? "กำลังสร้าง..." : t("home.createProject")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
