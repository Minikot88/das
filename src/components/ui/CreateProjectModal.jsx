import React, { useState } from "react";
import { useI18n } from "../../utils/i18n";
import Button from "./Button";
import Input from "./Input";

export default function CreateProjectModal({ onClose, onCreate }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box ui-surface" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-copy">
            <h2 className="modal-title">{t("home.newProject")}</h2>
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
            <Button type="submit" variant="primary" className="modal-btn primary" disabled={submitting}>{submitting ? "Creating..." : t("home.createProject")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
