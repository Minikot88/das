import React from "react";
import { useI18n } from "../../utils/i18n";

const LANGUAGES = [
  { id: "en", label: "EN" },
  { id: "th", label: "TH" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLanguage, t } = useI18n();

  return (
    <div className={`language-switcher${compact ? " compact" : ""}`} role="group" aria-label={t("common.language")}>
      {LANGUAGES.map((language) => (
        <button
          key={language.id}
          type="button"
          className={`language-switcher-btn${locale === language.id ? " active" : ""}`}
          onClick={() => setLanguage(language.id)}
          aria-pressed={locale === language.id}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
