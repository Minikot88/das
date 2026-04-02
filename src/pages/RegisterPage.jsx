import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useI18n } from "../utils/i18n";

export default function RegisterPage() {
  const { t } = useI18n();
  const register = useStore((state) => state.register);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const steps = t("auth.steps");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordLength"));
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 700));
    register(email, password, name);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="auth-page-v2">
      <div className="auth-hero register-hero">
        <div className="auth-hero-inner">
          <div className="auth-hero-logo">
            <span className="auth-logo-icon"><span className="auth-logo-dot" /><span className="auth-logo-dot sm" /></span>
            <span className="auth-logo-name">{t("app.name")}</span>
          </div>
          <h1 className="auth-hero-headline">{t("auth.registerHeroHeadline")}<br /><span className="auth-hero-accent">{t("auth.registerHeroAccent")}</span></h1>
          <p className="auth-hero-sub">{t("auth.registerHeroSubtitle")}</p>
          <ol className="auth-steps-list">
            {steps.map((step) => (
              <li key={step.step} className="auth-step-item">
                <span className="auth-step-num">{step.step}</span>
                <div>
                  <div className="auth-feature-title">{step.title}</div>
                  <div className="auth-feature-desc">{step.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card-v2">
          <div className="auth-card-header">
            <h2 className="auth-title-v2">{t("auth.registerTitle")}</h2>
            <p className="auth-subtitle-v2">{t("auth.registerSubtitle")}</p>
          </div>
          <form className="auth-form-v2" onSubmit={handleSubmit} noValidate>
            {error ? <div className="auth-error-v2" role="alert">{error}</div> : null}
            <div className="auth-field-v2">
              <label className="auth-label-v2" htmlFor="reg-name">{t("auth.fullName")}</label>
              <input id="reg-name" className="auth-input-v2" type="text" placeholder="Jane Smith" value={name} onChange={(event) => setName(event.target.value)} autoFocus autoComplete="name" />
            </div>
            <div className="auth-field-v2">
              <label className="auth-label-v2" htmlFor="reg-email">{t("auth.workEmail")}</label>
              <input id="reg-email" className="auth-input-v2" type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </div>
            <div className="auth-field-v2">
              <label className="auth-label-v2" htmlFor="reg-password">{t("auth.password")}</label>
              <input id="reg-password" className="auth-input-v2" type="password" placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
            </div>
            <button className="auth-btn-v2" type="submit" disabled={loading}>{loading ? t("auth.creatingAccount") : t("auth.createAccountAction")}</button>
          </form>
          <p className="auth-switch-v2">{t("auth.alreadyHaveAccount")} <Link to="/login">{t("auth.signInLink")}</Link></p>
        </div>
      </div>
    </div>
  );
}
