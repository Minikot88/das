import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useI18n } from "../utils/i18n";

export default function LoginPage() {
  const { locale, t } = useI18n();
  const login = useStore((state) => state.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const features = t("auth.features");
  const isThai = locale === "th";
  const heroSubtitle = t("auth.heroSubtitle") || (
    isThai
      ? "รวมแดชบอร์ด ตัวสร้างกราฟ และมุมมองสำหรับแชร์ไว้ใน workflow เดียวที่อ่านง่ายและทำงานต่อได้ทันที"
      : "Bring dashboards, chart building, and share-ready views together in one cleaner workflow."
  );
  const loginSubtitle = t("auth.loginSubtitle") || (
    isThai
      ? "เข้าสู่ระบบเพื่อกลับไปจัดการ dashboard, builder และมุมมองสำหรับทีมของคุณ"
      : "Sign in to return to your dashboards, builder workspace, and shared views."
  );
  const heroBadge = isThai ? "พื้นที่วิเคราะห์ข้อมูล" : "Analytics Workspace";
  const heroMetrics = isThai
    ? [
        { value: "12+", label: "มุมมองที่พร้อมใช้งาน" },
        { value: "3 นาที", label: "ตั้งแต่สำรวจจนพร้อมแชร์" },
        { value: "99%", label: "พื้นที่ทำงานที่เป็นระเบียบ" },
      ]
    : [
        { value: "12+", label: "Ready-made views" },
        { value: "3 min", label: "From setup to share" },
        { value: "99%", label: "Structured workspace" },
      ];
  const heroPreviewItems = isThai
    ? [
        { label: "แดชบอร์ดหลัก", value: "ภาพรวมยอดขาย" },
        { label: "ตัวสร้างกราฟ", value: "พร้อมแมปฟิลด์" },
      ]
    : [
        { label: "Live dashboard", value: "Sales overview" },
        { label: "Builder", value: "Visual mappings ready" },
      ];
  const formKicker = isThai ? "กลับเข้าสู่พื้นที่วิเคราะห์" : "Welcome back";
  const formStatus = isThai ? "พร้อมใช้งาน" : "Ready";
  const formFootnote = isThai
    ? "เข้าสู่ระบบเดิมได้ทันที หรือใช้ข้อมูลตัวอย่างเพื่อสำรวจ workflow แบบเต็ม"
    : "Jump back into your workspace or explore the full flow with the demo credentials.";
  const passwordPlaceholder = isThai ? "กรอกรหัสผ่าน" : "Enter your password";

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
    <div className="auth-page-v2 auth-page-login">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-hero-copy">
            <span className="auth-product-badge">{heroBadge}</span>
            <div className="auth-hero-logo">
              <span className="auth-logo-icon"><span className="auth-logo-dot" /><span className="auth-logo-dot sm" /></span>
              <span className="auth-logo-name">{t("app.name")}</span>
            </div>
            <div className="auth-hero-text">
              <h1 className="auth-hero-headline">{t("auth.heroHeadline")}<br /><span className="auth-hero-accent">{t("auth.heroAccent")}</span></h1>
              <p className="auth-hero-sub">{heroSubtitle}</p>
            </div>
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

          <div className="auth-hero-visual" aria-hidden="true">
            <div className="auth-visual-card auth-visual-card-main">
              <div className="auth-visual-chip-row">
                <span className="auth-visual-chip">{isThai ? "พื้นที่ทำงานสด" : "Live workspace"}</span>
                <span className="auth-visual-chip is-soft">{t("app.name")}</span>
              </div>
              <div className="auth-visual-metric-grid">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="auth-visual-metric">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                ))}
              </div>
              <div className="auth-visual-chart">
                <div className="auth-visual-bars">
                  <span style={{ height: "34%" }} />
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "76%" }} />
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "86%" }} />
                </div>
                <div className="auth-visual-trend">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="auth-floating-card auth-floating-card-top">
              {heroPreviewItems.map((item) => (
                <div key={item.label} className="auth-floating-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="auth-floating-card auth-floating-card-bottom">
              <span className="auth-floating-label">{isThai ? "พร้อมแชร์" : "Share-ready"}</span>
              <strong>{isThai ? "มุมมองสะอาดสำหรับรีวิว" : "Clean views for review"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card-v2">
          <div className="auth-card-topline">
            <span className="auth-card-kicker">{formKicker}</span>
            <span className="auth-card-status">{formStatus}</span>
          </div>
          <div className="auth-card-header">
            <h2 className="auth-title-v2">{t("auth.loginTitle")}</h2>
            <p className="auth-subtitle-v2">{loginSubtitle}</p>
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
              <input id="login-password" className="auth-input-v2" type="password" placeholder={passwordPlaceholder} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </div>
            <button className="auth-btn-v2" type="submit" disabled={loading}>{loading ? t("auth.signingIn") : t("auth.signInAction")}</button>
          </form>
          <div className="auth-card-footer">
            <p className="auth-switch-v2">{t("auth.noAccount")} <Link to="/register">{t("auth.createOne")}</Link></p>
            <p className="auth-footnote-v2">{formFootnote}</p>
          </div>
          <div className="auth-divider-v2"><span>{t("auth.demoCredentials")}</span></div>
          <div className="auth-demo-credentials">
            <span className="auth-demo-pill">demo@dataviz.bi</span>
            <span className="auth-demo-pill">demo1234</span>
          </div>
          <button className="auth-demo-btn" type="button" onClick={() => { setEmail("demo@dataviz.bi"); setPassword("demo1234"); }}>{t("auth.fillDemoCredentials")}</button>
        </div>
      </div>
    </div>
  );
}
