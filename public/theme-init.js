(function initializeTheme() {
  try {
    var storedTheme = localStorage.getItem("mini-bi-theme") || "light";
    if (["light", "dark", "system"].indexOf(storedTheme) === -1) storedTheme = "light";
    var resolvedTheme = storedTheme === "system"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : storedTheme;
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") resolvedTheme = "light";
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = storedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
