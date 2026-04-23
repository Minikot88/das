function normalizeHex(color, fallback = "#1d4ed8") {
  const value = String(color ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function hexToRgb(color) {
  const normalized = normalizeHex(color);
  const numeric = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function mixColors(left, right, ratio = 0.5) {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);

  return rgbToHex({
    r: leftRgb.r + (rightRgb.r - leftRgb.r) * safeRatio,
    g: leftRgb.g + (rightRgb.g - leftRgb.g) * safeRatio,
    b: leftRgb.b + (rightRgb.b - leftRgb.b) * safeRatio,
  });
}

export function tintColor(color, amount = 0.2) {
  return mixColors(color, "#ffffff", amount);
}

export function shadeColor(color, amount = 0.2) {
  return mixColors(color, "#0f172a", amount);
}

function uniqueColors(colors = []) {
  return Array.from(new Set(colors.map((color) => normalizeHex(color)).filter(Boolean)));
}

function createMonochromeScale(baseColor, accentColor = "#dbeafe") {
  const base = normalizeHex(baseColor);
  const accent = normalizeHex(accentColor);

  return uniqueColors([
    shadeColor(base, 0.18),
    shadeColor(base, 0.08),
    base,
    mixColors(base, accent, 0.25),
    tintColor(base, 0.28),
    tintColor(base, 0.44),
  ]);
}

function createPreset(key, config) {
  const colors = uniqueColors(config.colors);
  const single = normalizeHex(config.single ?? colors[0] ?? "#1d4ed8");
  const accent = normalizeHex(config.accent ?? single, single);
  const tint = normalizeHex(config.tint ?? colors[1] ?? tintColor(single, 0.22), single);

  return {
    key,
    value: key,
    label: config.label,
    group: config.group,
    description: config.description ?? "",
    toneLabel: config.toneLabel ?? "",
    keywords: config.keywords ?? [],
    single,
    accent,
    tint,
    colors,
    swatches: colors.slice(0, 6),
    surfaceMode: config.surfaceMode ?? "auto",
    tooltipMode: config.tooltipMode ?? "auto",
    glass: config.glass ?? false,
    barGradient: config.barGradient ?? false,
    areaGradient: config.areaGradient ?? true,
    gradientAxis: config.gradientAxis ?? "vertical",
    barOpacity: config.barOpacity ?? 0.92,
    barBottomOpacity: config.barBottomOpacity ?? 0.8,
    areaTopOpacity: config.areaTopOpacity ?? 0.18,
    areaBottomOpacity: config.areaBottomOpacity ?? 0.04,
    arcOpacity: config.arcOpacity ?? 0.9,
    scatterOpacity: config.scatterOpacity ?? 0.72,
    bubbleOpacity: config.bubbleOpacity ?? 0.36,
    pointFillOpacity: config.pointFillOpacity ?? 1,
    pieSpacing: config.pieSpacing ?? 1,
    pieHoverOffset: config.pieHoverOffset ?? 2,
    surfaceTintStrengthLight: config.surfaceTintStrengthLight ?? (config.glass ? 0.12 : 0.08),
    surfaceTintStrengthDark: config.surfaceTintStrengthDark ?? (config.glass ? 0.2 : 0.14),
    borderTintStrengthLight: config.borderTintStrengthLight ?? 0.22,
    borderTintStrengthDark: config.borderTintStrengthDark ?? 0.34,
    gridTintStrengthLight: config.gridTintStrengthLight ?? 0.2,
    gridTintStrengthDark: config.gridTintStrengthDark ?? 0.24,
    surfaceAlphaLight: config.surfaceAlphaLight ?? (config.glass ? 0.9 : 1),
    surfaceAlphaDark: config.surfaceAlphaDark ?? (config.glass ? 0.9 : 1),
  };
}

export const CHART_THEME_GROUPS = [
  {
    id: "core",
    label: "Core",
    description: "Balanced presets for everyday dashboards and builder workflows.",
  },
  {
    id: "pastel",
    label: "Pastel",
    description: "Softer palettes with lighter saturation and calm contrast.",
  },
  {
    id: "transparent",
    label: "Transparent",
    description: "Glass-like and translucent themes for layered chart surfaces.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Sharper dark-surface presets for premium dashboard views.",
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Formal palettes for executive reporting and boardroom summaries.",
  },
  {
    id: "vibrant",
    label: "Vibrant",
    description: "Confident color-led themes that still feel product-grade.",
  },
  {
    id: "mono",
    label: "Single Hue",
    description: "Monochrome and high-contrast presets for focused reading.",
  },
];

export const CHART_PALETTES = {
  default: createPreset("default", {
    label: "Default",
    group: "core",
    description: "The balanced Mini BI palette for general dashboard use.",
    toneLabel: "Balanced",
    keywords: ["default", "balanced", "mini bi", "standard"],
    colors: ["#2563eb", "#0f766e", "#7c3aed", "#15803d", "#d97706", "#be123c"],
    areaGradient: true,
  }),
  "clean-saas": createPreset("clean-saas", {
    label: "Clean SaaS",
    group: "core",
    description: "Modern blue-teal product colors for clean analytics interfaces.",
    toneLabel: "Modern",
    keywords: ["saas", "clean", "blue", "teal", "product"],
    colors: ["#1d4ed8", "#0891b2", "#4f46e5", "#0f766e", "#64748b", "#16a34a"],
    areaGradient: true,
  }),
  "professional-neutral": createPreset("professional-neutral", {
    label: "Professional Neutral",
    group: "core",
    description: "Restrained neutrals with just enough blue-green contrast for long reading sessions.",
    toneLabel: "Neutral",
    keywords: ["professional", "neutral", "formal", "calm"],
    colors: ["#334155", "#2563eb", "#0f766e", "#475569", "#0284c7", "#64748b"],
    areaTopOpacity: 0.14,
    areaBottomOpacity: 0.03,
  }),
  "minimal-ink": createPreset("minimal-ink", {
    label: "Minimal Ink",
    group: "core",
    description: "Sparse, sharp, and editorial with only a few accent colors.",
    toneLabel: "Minimal",
    keywords: ["minimal", "ink", "editorial", "clean"],
    colors: ["#111827", "#2563eb", "#334155", "#475569", "#0f766e", "#64748b"],
    areaGradient: false,
    barGradient: false,
    arcOpacity: 0.86,
  }),
  "muted-analytics": createPreset("muted-analytics", {
    label: "Muted Analytics",
    group: "core",
    description: "Lower saturation colors designed for dense analytical dashboards.",
    toneLabel: "Muted",
    keywords: ["muted", "analytics", "subtle", "calm"],
    colors: ["#3b82f6", "#14b8a6", "#8b5cf6", "#64748b", "#84cc16", "#f59e0b"],
    barOpacity: 0.86,
    areaTopOpacity: 0.16,
  }),
  "soft-pastel": createPreset("soft-pastel", {
    label: "Soft Pastel",
    group: "pastel",
    description: "A light pastel mix that still keeps chart separation readable.",
    toneLabel: "Pastel",
    keywords: ["pastel", "soft", "light"],
    colors: ["#8fb4ff", "#9dd9d2", "#c4b5fd", "#f8b4c8", "#f6c177", "#a7f3d0"],
    barOpacity: 0.88,
    areaTopOpacity: 0.2,
    areaBottomOpacity: 0.05,
  }),
  "cool-pastel": createPreset("cool-pastel", {
    label: "Cool Pastel",
    group: "pastel",
    description: "Cool blue, mint, and lavender tones for airy charts.",
    toneLabel: "Cool",
    keywords: ["pastel", "cool", "mint", "lavender"],
    colors: ["#93c5fd", "#67e8f9", "#a5b4fc", "#86efac", "#c4b5fd", "#bae6fd"],
    barOpacity: 0.88,
  }),
  "warm-pastel": createPreset("warm-pastel", {
    label: "Warm Pastel",
    group: "pastel",
    description: "Peach, amber, and rose shades for warmer dashboards.",
    toneLabel: "Warm",
    keywords: ["pastel", "warm", "peach", "amber", "rose"],
    colors: ["#f9a8d4", "#fdba74", "#fcd34d", "#fca5a5", "#c4b5fd", "#86efac"],
    barOpacity: 0.88,
  }),
  "rose-soft": createPreset("rose-soft", {
    label: "Rose Soft",
    group: "pastel",
    description: "A rose-led pastel palette with gentle violet and champagne support.",
    toneLabel: "Soft",
    keywords: ["rose", "soft", "pastel", "pink"],
    colors: ["#fda4af", "#f9a8d4", "#c4b5fd", "#fdba74", "#fde68a", "#93c5fd"],
    barOpacity: 0.87,
  }),
  "sunset-soft": createPreset("sunset-soft", {
    label: "Sunset Soft",
    group: "pastel",
    description: "Soft sunset-inspired coral and violet tones with product polish.",
    toneLabel: "Soft",
    keywords: ["sunset", "soft", "coral", "violet"],
    colors: ["#fb7185", "#fb923c", "#f59e0b", "#c084fc", "#38bdf8", "#fda4af"],
    barOpacity: 0.88,
  }),
  "transparent-blue": createPreset("transparent-blue", {
    label: "Transparent Blue",
    group: "transparent",
    description: "Layered blue glass styling for charts inside bright cards.",
    toneLabel: "Glass",
    keywords: ["transparent", "glass", "blue"],
    colors: ["#2563eb", "#60a5fa", "#38bdf8", "#1d4ed8", "#14b8a6", "#8b5cf6"],
    glass: true,
    barGradient: true,
    areaGradient: true,
    barOpacity: 0.74,
    barBottomOpacity: 0.46,
    areaTopOpacity: 0.24,
    areaBottomOpacity: 0.02,
  }),
  "transparent-teal": createPreset("transparent-teal", {
    label: "Transparent Teal",
    group: "transparent",
    description: "Fresh teal glass styling for clean preview and embed surfaces.",
    toneLabel: "Glass",
    keywords: ["transparent", "glass", "teal", "mint"],
    colors: ["#0f766e", "#14b8a6", "#2dd4bf", "#0891b2", "#2563eb", "#84cc16"],
    glass: true,
    barGradient: true,
    areaGradient: true,
    barOpacity: 0.72,
    barBottomOpacity: 0.44,
    areaTopOpacity: 0.24,
    areaBottomOpacity: 0.02,
  }),
  "transparent-violet": createPreset("transparent-violet", {
    label: "Transparent Violet",
    group: "transparent",
    description: "Indigo-violet glass styling that feels premium without going neon.",
    toneLabel: "Glass",
    keywords: ["transparent", "glass", "violet", "indigo"],
    colors: ["#7c3aed", "#8b5cf6", "#6366f1", "#a78bfa", "#06b6d4", "#ec4899"],
    glass: true,
    barGradient: true,
    areaGradient: true,
    barOpacity: 0.72,
    barBottomOpacity: 0.42,
    areaTopOpacity: 0.24,
    areaBottomOpacity: 0.02,
  }),
  "glass-light": createPreset("glass-light", {
    label: "Glass Light",
    group: "transparent",
    description: "A lighter translucent theme for polished public and embed views.",
    toneLabel: "Glass",
    keywords: ["glass", "light", "embed", "transparent"],
    colors: ["#2563eb", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#0f766e"],
    surfaceMode: "light",
    glass: true,
    barGradient: true,
    barOpacity: 0.78,
    barBottomOpacity: 0.5,
    areaTopOpacity: 0.22,
    areaBottomOpacity: 0.03,
  }),
  "glass-dark": createPreset("glass-dark", {
    label: "Glass Dark",
    group: "transparent",
    description: "A dark translucent preset for layered dashboards and panels.",
    toneLabel: "Glass",
    keywords: ["glass", "dark", "transparent", "layered"],
    colors: ["#60a5fa", "#2dd4bf", "#a78bfa", "#fbbf24", "#f472b6", "#38bdf8"],
    surfaceMode: "dark",
    tooltipMode: "dark",
    glass: true,
    barGradient: true,
    barOpacity: 0.82,
    barBottomOpacity: 0.56,
    areaTopOpacity: 0.26,
    areaBottomOpacity: 0.04,
  }),
  "elegant-dark": createPreset("elegant-dark", {
    label: "Elegant Dark",
    group: "dark",
    description: "Lux dark surfaces with refined accent colors for premium dashboards.",
    toneLabel: "Dark",
    keywords: ["dark", "elegant", "premium"],
    colors: ["#60a5fa", "#22d3ee", "#8b5cf6", "#34d399", "#f59e0b", "#fb7185"],
    surfaceMode: "dark",
    tooltipMode: "dark",
    barGradient: true,
    barOpacity: 0.9,
    barBottomOpacity: 0.68,
    areaTopOpacity: 0.28,
    areaBottomOpacity: 0.05,
  }),
  graphite: createPreset("graphite", {
    label: "Graphite",
    group: "dark",
    description: "Graphite-gray charts with crisp accents for strong dark BI layouts.",
    toneLabel: "Dark",
    keywords: ["graphite", "dark", "gray"],
    colors: ["#94a3b8", "#38bdf8", "#818cf8", "#34d399", "#f59e0b", "#e2e8f0"],
    surfaceMode: "dark",
    tooltipMode: "dark",
    areaGradient: false,
  }),
  "executive-navy": createPreset("executive-navy", {
    label: "Executive Navy",
    group: "dark",
    description: "A deep navy palette for executive dashboards and board-ready charts.",
    toneLabel: "Executive",
    keywords: ["navy", "executive", "boardroom", "dark"],
    colors: ["#60a5fa", "#38bdf8", "#22c55e", "#fbbf24", "#a78bfa", "#f87171"],
    surfaceMode: "dark",
    tooltipMode: "dark",
    barGradient: true,
  }),
  "dark-contrast": createPreset("dark-contrast", {
    label: "Dark Contrast",
    group: "dark",
    description: "High-contrast dark mode for presentation screens and dense dashboards.",
    toneLabel: "High Contrast",
    keywords: ["dark", "contrast", "high contrast", "presentation"],
    colors: ["#f8fafc", "#60a5fa", "#2dd4bf", "#fbbf24", "#f472b6", "#a78bfa"],
    surfaceMode: "dark",
    tooltipMode: "dark",
    barOpacity: 0.96,
    arcOpacity: 0.96,
    scatterOpacity: 0.82,
    bubbleOpacity: 0.42,
  }),
  "enterprise-blue": createPreset("enterprise-blue", {
    label: "Enterprise Blue",
    group: "enterprise",
    description: "A dependable enterprise palette with strong blue leadership.",
    toneLabel: "Enterprise",
    keywords: ["enterprise", "blue", "formal"],
    colors: ["#1d4ed8", "#2563eb", "#0f766e", "#475569", "#0891b2", "#7c3aed"],
    barGradient: false,
    areaGradient: true,
  }),
  boardroom: createPreset("boardroom", {
    label: "Boardroom",
    group: "enterprise",
    description: "Navy, slate, and deep green tuned for executive reporting decks.",
    toneLabel: "Executive",
    keywords: ["boardroom", "executive", "formal", "report"],
    colors: ["#1e3a8a", "#334155", "#0f766e", "#a16207", "#7c3aed", "#0f172a"],
    barGradient: false,
    areaGradient: false,
  }),
  "slate-formal": createPreset("slate-formal", {
    label: "Slate Formal",
    group: "enterprise",
    description: "Slate-led charts with indigo support for polished formal reporting.",
    toneLabel: "Formal",
    keywords: ["slate", "formal", "neutral"],
    colors: ["#334155", "#475569", "#1d4ed8", "#0f766e", "#64748b", "#7c3aed"],
    areaGradient: false,
  }),
  "classic-report": createPreset("classic-report", {
    label: "Classic Report",
    group: "enterprise",
    description: "Traditional report-friendly colors that keep numbers easy to scan.",
    toneLabel: "Report",
    keywords: ["classic", "report", "formal"],
    colors: ["#2563eb", "#64748b", "#16a34a", "#ca8a04", "#7c3aed", "#dc2626"],
    areaGradient: false,
    barGradient: false,
  }),
  "modern-finance": createPreset("modern-finance", {
    label: "Modern Finance",
    group: "enterprise",
    description: "Blue-green finance styling tuned for KPI and operational views.",
    toneLabel: "Finance",
    keywords: ["finance", "blue", "green", "kpi"],
    colors: ["#0f766e", "#2563eb", "#0891b2", "#1e40af", "#22c55e", "#64748b"],
    areaGradient: true,
    barGradient: false,
  }),
  "vibrant-modern": createPreset("vibrant-modern", {
    label: "Vibrant Modern",
    group: "vibrant",
    description: "Stronger product colors with enough restraint for professional dashboards.",
    toneLabel: "Vibrant",
    keywords: ["vibrant", "modern", "bold"],
    colors: ["#2563eb", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#16a34a"],
    barGradient: true,
  }),
  "premium-indigo": createPreset("premium-indigo", {
    label: "Premium Indigo",
    group: "vibrant",
    description: "Indigo-violet emphasis for a richer premium analytics look.",
    toneLabel: "Premium",
    keywords: ["indigo", "premium", "violet"],
    colors: ["#4338ca", "#6366f1", "#8b5cf6", "#06b6d4", "#0f766e", "#f59e0b"],
    barGradient: true,
    areaGradient: true,
  }),
  "emerald-business": createPreset("emerald-business", {
    label: "Emerald Business",
    group: "vibrant",
    description: "Emerald and teal-led charts for growth, ops, and business metrics.",
    toneLabel: "Business",
    keywords: ["emerald", "business", "green", "ops"],
    colors: ["#059669", "#0f766e", "#14b8a6", "#2563eb", "#84cc16", "#f59e0b"],
    barGradient: true,
  }),
  ocean: createPreset("ocean", {
    label: "Ocean",
    group: "vibrant",
    description: "A blue-teal gradient-friendly palette that feels clean and energetic.",
    toneLabel: "Blue / Teal",
    keywords: ["ocean", "blue", "teal"],
    colors: ["#0369a1", "#0284c7", "#0891b2", "#0f766e", "#2563eb", "#38bdf8"],
    barGradient: true,
  }),
  aurora: createPreset("aurora", {
    label: "Aurora",
    group: "vibrant",
    description: "Cyan, indigo, and violet tones built for layered gradients.",
    toneLabel: "Gradient",
    keywords: ["aurora", "gradient", "cyan", "violet"],
    colors: ["#06b6d4", "#22d3ee", "#6366f1", "#8b5cf6", "#14b8a6", "#ec4899"],
    barGradient: true,
    areaGradient: true,
  }),
  royal: createPreset("royal", {
    label: "Royal",
    group: "vibrant",
    description: "Royal blue and purple with subtle gold support for a luxury feel.",
    toneLabel: "Bold",
    keywords: ["royal", "luxury", "blue", "purple"],
    colors: ["#1d4ed8", "#4338ca", "#7c3aed", "#ca8a04", "#0f766e", "#be123c"],
    barGradient: true,
  }),
  forest: createPreset("forest", {
    label: "Forest",
    group: "vibrant",
    description: "A green-led palette for operations, ESG, and business health dashboards.",
    toneLabel: "Green",
    keywords: ["forest", "green", "operations", "esg"],
    colors: ["#166534", "#15803d", "#0f766e", "#65a30d", "#2563eb", "#a16207"],
    barGradient: true,
  }),
  "amber-clean": createPreset("amber-clean", {
    label: "Amber Clean",
    group: "vibrant",
    description: "Bright amber support balanced with blue and teal for clean contrast.",
    toneLabel: "Amber",
    keywords: ["amber", "clean", "warm"],
    colors: ["#d97706", "#f59e0b", "#2563eb", "#0f766e", "#7c3aed", "#be123c"],
    barGradient: true,
  }),
  "cyan-dash": createPreset("cyan-dash", {
    label: "Cyan Dash",
    group: "vibrant",
    description: "Cyan-led widget styling for modern dashboard cards.",
    toneLabel: "Cyan",
    keywords: ["cyan", "dash", "widget", "dashboard"],
    colors: ["#0891b2", "#06b6d4", "#2563eb", "#14b8a6", "#6366f1", "#f59e0b"],
    barGradient: true,
  }),
  "purple-analytics": createPreset("purple-analytics", {
    label: "Purple Analytics",
    group: "vibrant",
    description: "Purple-indgo analytics styling with clean supporting accents.",
    toneLabel: "Purple",
    keywords: ["purple", "analytics", "indigo"],
    colors: ["#6d28d9", "#7c3aed", "#8b5cf6", "#2563eb", "#14b8a6", "#ec4899"],
    barGradient: true,
    areaGradient: true,
  }),
  "monochrome-blue": createPreset("monochrome-blue", {
    label: "Monochrome Blue",
    group: "mono",
    description: "A single-hue blue scale for cohesive dashboards with subtle rank order.",
    toneLabel: "Single Hue",
    keywords: ["monochrome", "blue", "single hue"],
    colors: createMonochromeScale("#2563eb", "#bfdbfe"),
    areaGradient: false,
    barGradient: true,
  }),
  "monochrome-gray": createPreset("monochrome-gray", {
    label: "Monochrome Gray",
    group: "mono",
    description: "A formal grayscale palette for restrained reporting surfaces.",
    toneLabel: "Single Hue",
    keywords: ["monochrome", "gray", "formal", "single hue"],
    colors: createMonochromeScale("#475569", "#e2e8f0"),
    areaGradient: false,
    barGradient: false,
  }),
  "high-contrast": createPreset("high-contrast", {
    label: "High Contrast",
    group: "mono",
    description: "Sharper contrast for presentation screens and accessibility-heavy views.",
    toneLabel: "Contrast",
    keywords: ["contrast", "high contrast", "accessible"],
    colors: ["#111827", "#2563eb", "#10b981", "#f59e0b", "#dc2626", "#ffffff"],
    areaGradient: false,
    barGradient: false,
    surfaceMode: "auto",
    arcOpacity: 0.96,
    barOpacity: 0.96,
    scatterOpacity: 0.84,
  }),
};

const GROUP_ORDER = CHART_THEME_GROUPS.reduce((accumulator, group, index) => {
  accumulator[group.id] = index;
  return accumulator;
}, {});

export const ALIASES = {
  blue: "enterprise-blue",
  green: "emerald-business",
  vibrant: "vibrant-modern",
  pastel: "soft-pastel",
  dark: "elegant-dark",
  cool: "clean-saas",
  warm: "amber-clean",
  executive: "executive-navy",
  oceanic: "ocean",
  echarts: "enterprise-blue",
  "echarts-classic": "enterprise-blue",
};

export function resolveChartThemeKey(theme = "default") {
  const requested = String(theme ?? "default").trim();
  if (CHART_PALETTES[requested]) return requested;
  const alias = ALIASES[requested];
  if (alias && CHART_PALETTES[alias]) return alias;
  return "default";
}

export function getChartPalette(theme = "default") {
  const paletteKey = resolveChartThemeKey(theme);
  return CHART_PALETTES[paletteKey] ?? CHART_PALETTES.default;
}

export function getChartThemePresets() {
  return Object.values(CHART_PALETTES).sort((left, right) => {
    const leftGroupOrder = GROUP_ORDER[left.group] ?? 999;
    const rightGroupOrder = GROUP_ORDER[right.group] ?? 999;

    if (leftGroupOrder !== rightGroupOrder) return leftGroupOrder - rightGroupOrder;
    return left.label.localeCompare(right.label);
  });
}

export function getChartThemeGroups() {
  return CHART_THEME_GROUPS.map((group) => ({
    ...group,
    themes: getChartThemePresets().filter((theme) => theme.group === group.id),
  })).filter((group) => group.themes.length > 0);
}
