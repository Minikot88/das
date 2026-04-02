import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useI18n } from "../utils/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const login = useStore((state) => state.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const features = t("auth.features");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    setLoading(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 700));
    login(email, password);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="auth-page-v2">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-hero-logo">
            <span className="auth-logo-icon"><span className="auth-logo-dot" /><span className="auth-logo-dot sm" /></span>
            <span className="auth-logo-name">{t("app.name")}</span>
          </div>
          <h1 className="auth-hero-headline">{t("auth.heroHeadline")}<br /><span className="auth-hero-accent">{t("auth.heroAccent")}</span></h1>
          <p className="auth-hero-sub">{t("auth.heroSubtitle")}</p>
          <ul className="auth-feature-list">
            {features.map((feature, index) => (
              <li key={feature.title} className="auth-feature-item">
                <span className="auth-feature-icon">0{index + 1}</span>
                <div>
                  <div className="auth-feature-title">{feature.title}</div>
                  <div className="auth-feature-desc">{feature.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-card-v2">
          <div className="auth-card-header">
            <h2 className="auth-title-v2">{t("auth.loginTitle")}</h2>
            <p className="auth-subtitle-v2">{t("auth.loginSubtitle")}</p>
          </div>
          <form className="auth-form-v2" onSubmit={handleSubmit} noValidate>
            {error ? <div className="auth-error-v2" role="alert">{error}</div> : null}
            <div className="auth-field-v2">
              <label className="auth-label-v2" htmlFor="login-email">{t("auth.email")}</label>
              <input id="login-email" className="auth-input-v2" type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus autoComplete="email" />
            </div>
            <div className="auth-field-v2">
              <div className="auth-label-row">
                <label className="auth-label-v2" htmlFor="login-password">{t("auth.password")}</label>
                <span className="auth-link-sm">{t("auth.forgotPassword")}</span>
              </div>
              <input id="login-password" className="auth-input-v2" type="password" placeholder="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            <button className="auth-btn-v2" type="submit" disabled={loading}>{loading ? t("auth.signingIn") : t("auth.signInAction")}</button>
          </form>
          <p className="auth-switch-v2">{t("auth.noAccount")} <Link to="/register">{t("auth.createOne")}</Link></p>
          <div className="auth-divider-v2"><span>{t("auth.demoCredentials")}</span></div>
          <button className="auth-demo-btn" type="button" onClick={() => { setEmail("demo@dataviz.bi"); setPassword("demo1234"); }}>{t("auth.fillDemoCredentials")}</button>
        </div>
      </div>
    </div>
  );
}
