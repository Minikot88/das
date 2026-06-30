import React, { memo, useEffect, useState } from "react";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GridOnRoundedIcon from "@mui/icons-material/GridOnRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { dashboardV2Tokens as tokens } from "./theme";
import type { DemoThemeId, DemoThemePreset } from "./demo/demoTypes";
import type { ChartConfig, ChartSettingKey, ChartSettings } from "./types";
import { getChartDefinition } from "./utils/chartRegistry";

type PropertyPanelProps = {
  config: ChartConfig;
  saveStatus: "saved" | "saving" | "unsaved";
  lastSavedAt: string;
  onSettingsChange: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
  onSave: () => void;
  onPreview: () => void;
  onShare: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportPng: () => void;
  onReset: () => void;
  onCopyConfig: () => void;
  onReplaceConfig: (config: ChartConfig) => void;
  themePresets: DemoThemePreset[];
  onThemePresetChange: (themeId: DemoThemeId) => void;
};

const sections = [
  { id: "axis", title: "แกน (Axis)", icon: <TuneRoundedIcon /> },
  { id: "labels", title: "ป้ายกำกับ (Labels)", icon: <LabelRoundedIcon /> },
  { id: "legend", title: "คำอธิบาย (Legend)", icon: <SettingsRoundedIcon /> },
  { id: "colors", title: "สี (Colors)", icon: <PaletteRoundedIcon /> },
  { id: "grid", title: "เส้นกริด (Grid)", icon: <GridOnRoundedIcon /> },
  { id: "tooltip", title: "Tooltip", icon: <AutoFixHighRoundedIcon /> },
  { id: "animation", title: "การแสดงผล (Animation)", icon: <SpeedRoundedIcon /> },
  { id: "advanced", title: "ขั้นสูง (Advanced)", icon: <CodeRoundedIcon /> },
] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary">
      {children}
    </Typography>
  );
}

function ColorInput({ value, onChange, label }: { value: string; label: string; onChange: (value: string) => void }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
      <FieldLabel>{label}</FieldLabel>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        sx={{
          width: 32,
          height: 24,
          p: 0,
          border: "1px solid",
          borderColor: tokens.color.border,
          bgcolor: "transparent",
          cursor: "pointer",
        }}
      />
    </Stack>
  );
}

function PropertyPanel({
  config,
  saveStatus,
  lastSavedAt,
  onSettingsChange,
  onSave,
  onPreview,
  onShare,
  onExportJson,
  onExportCsv,
  onExportPng,
  onReset,
  onCopyConfig,
  onReplaceConfig,
  themePresets,
  onThemePresetChange,
}: PropertyPanelProps) {
  const [expandedSection, setExpandedSection] = useState<(typeof sections)[number]["id"] | "">("axis");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const selectedDefinition = getChartDefinition(config.chartType);
  const supportsSetting = (key: ChartSettingKey) => selectedDefinition?.supportedSettings.includes(key) ?? true;
  const tableLikeChart =
    config.chartType === "table" ||
    config.chartType === "summary-table" ||
    config.chartType === "pivot-table" ||
    config.chartType === "matrix-table";
  const axislessChart =
    tableLikeChart ||
    config.chartType === "pie" ||
    config.chartType === "donut" ||
    config.chartType === "gauge" ||
    config.chartType === "progress-ring" ||
    config.chartType === "kpi-card" ||
    config.chartType === "metric-card" ||
    config.chartType === "scorecard" ||
    config.chartType === "treemap" ||
    config.chartType === "sunburst" ||
    config.chartType === "sankey" ||
    config.chartType === "funnel" ||
    config.chartType === "radar" ||
    config.chartType === "polar-area" ||
    config.chartType === "radial-bar";
  const gridlessChart = axislessChart;
  const labelsSupported =
    config.chartType !== "kpi-card" &&
    config.chartType !== "kpi-trend" &&
    config.chartType !== "metric-card" &&
    config.chartType !== "scorecard" &&
    config.chartType !== "gauge" &&
    config.chartType !== "progress-ring" &&
    !tableLikeChart &&
    config.chartType !== "scatter" &&
    config.chartType !== "bubble";

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
    setJsonError(null);
  }, [config]);

  function importJsonConfig() {
    try {
      const parsed = JSON.parse(jsonText) as ChartConfig;
      onReplaceConfig(parsed);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "JSON ไม่ถูกต้อง");
    }
  }

  function updateSeriesColor(index: number, value: string) {
    const nextColors = [...config.settings.colors.seriesColors];
    nextColors[index] = value;
    onSettingsChange("colors", { seriesColors: nextColors });
  }

  function closeExportMenu() {
    setExportAnchor(null);
  }

  const selectedThemePreset =
    themePresets.find((theme) => theme.id === config.settings.general.themePreset) ?? themePresets[0];

  function isSectionSupported(sectionId: (typeof sections)[number]["id"]) {
    if (sectionId === "advanced") return true;
    if (!supportsSetting(sectionId)) return false;
    if (sectionId === "axis" && axislessChart) return false;
    if (sectionId === "grid" && gridlessChart) return false;
    if (sectionId === "labels" && !labelsSupported) return false;
    if (sectionId === "legend" && tableLikeChart) return false;
    return true;
  }

  return (
    <Paper
      data-testid="dashboard-v2-settings-panel"
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        overflow: "hidden",
        minWidth: 0,
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          position: "relative",
          zIndex: tokens.zIndex.sticky,
          px: 1,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: tokens.color.borderSubtle,
          bgcolor: tokens.color.surface,
          minWidth: 0,
        }}
      >
        <Stack spacing={0.75} minWidth={0}>
          <Box minWidth={0}>
            <Typography variant="overline" color="text.secondary" fontWeight={500} sx={{ fontSize: 12, letterSpacing: ".04em", lineHeight: 1.25 }}>
              ตั้งค่า
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11, lineHeight: 1.35 }}>
              การตั้งค่ากราฟ
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
              minHeight: 34,
              minWidth: 0,
              "& .MuiButton-root": {
                height: 30,
                minHeight: 30,
                px: 0.75,
                fontSize: 11,
                lineHeight: 1.25,
                borderRadius: `${tokens.radius.control}px`,
              },
              "& .MuiButton-startIcon": { mr: 0.35 },
              "& .MuiButton-startIcon svg": { fontSize: 15 },
              "& .MuiIconButton-root": {
                width: 30,
                height: 30,
                border: "1px solid",
                borderColor: tokens.color.border,
                borderRadius: `${tokens.radius.control}px`,
              },
              "& .MuiSvgIcon-root": { fontSize: 15 },
            }}
          >
            <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={onSave} aria-label="บันทึกกราฟ">
              บันทึก
            </Button>
            <Button variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={onPreview} aria-label="พรีวิวกราฟ">
              พรีวิว
            </Button>
            <IconButton onClick={onShare} aria-label="แชร์กราฟ" title="แชร์">
              <ShareRoundedIcon />
            </IconButton>
            <IconButton
              onClick={(event) => setExportAnchor(event.currentTarget)}
              aria-label="ส่งออกกราฟ"
              title="ส่งออก"
              aria-haspopup="menu"
              aria-expanded={Boolean(exportAnchor)}
            >
              <DownloadRoundedIcon />
            </IconButton>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={closeExportMenu}>
              <MenuItem
                onClick={() => {
                  closeExportMenu();
                  onExportJson();
                }}
              >
                ส่งออก JSON
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeExportMenu();
                  onExportCsv();
                }}
              >
                ส่งออก CSV
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeExportMenu();
                  void onExportPng();
                }}
              >
                ส่งออก PNG
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Box>

      <Box
        className="dashboard-v2-scrollarea"
        sx={{
          overflowY: "auto",
          overflowX: "hidden",
          minWidth: 0,
          p: 0,
          "& *": { minWidth: 0 },
          "& .MuiFormControl-root, & .MuiTextField-root, & .MuiInputBase-root, & .MuiSlider-root": {
            width: "100%",
            maxWidth: "100%",
          },
          "& .MuiOutlinedInput-root": { minHeight: 32, borderRadius: `${tokens.radius.control}px` },
          "& .MuiInputBase-input": { py: 0.5, fontSize: 12, lineHeight: 1.35 },
          "& .MuiSelect-select": { py: 0.45, fontSize: 12, lineHeight: 1.35 },
          "& .MuiFormControlLabel-label": { fontSize: 12, lineHeight: 1.4 },
          "& .MuiFormControlLabel-root": { minHeight: 26, mr: 0 },
          "& .MuiSwitch-root": { width: 30, height: 17, p: 0.25 },
          "& .MuiSwitch-switchBase": { p: 0.5 },
          "& .MuiSwitch-thumb": { width: 12, height: 12 },
          "& .MuiSwitch-track": { borderRadius: 999 },
          "& .MuiSlider-root": { py: 0.75 },
          "& .MuiSlider-rail, & .MuiSlider-track": { height: 2 },
          "& .MuiSlider-thumb": { width: 12, height: 12 },
        }}
      >
        <Box
          sx={{
            px: 0.75,
            py: 0.75,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surface,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, mb: 0.75 }}>
            Quick settings
          </Typography>
          <Stack spacing={0.75}>
            <TextField
              label="ชื่อกราฟ"
              size="small"
              value={config.settings.general.title}
              onChange={(event) => onSettingsChange("general", { title: event.target.value })}
            />
            <TextField
              label="คำอธิบาย"
              size="small"
              value={config.settings.general.subtitle}
              onChange={(event) => onSettingsChange("general", { subtitle: event.target.value })}
            />
            <FieldLabel>Theme Preset</FieldLabel>
            <Select
              size="small"
              value={config.settings.general.themePreset ?? selectedThemePreset?.id ?? "default-blue"}
              onChange={(event) => onThemePresetChange(event.target.value as DemoThemeId)}
              fullWidth
              aria-label="Theme Preset"
              inputProps={{ "aria-label": "Theme Preset" }}
            >
              {themePresets.map((theme) => (
                <MenuItem key={theme.id} value={theme.id}>
                  <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                    <Stack direction="row" spacing={0.25} sx={{ flex: "0 0 auto" }}>
                      {theme.seriesColors.slice(0, 4).map((color) => (
                        <Box key={color} sx={{ width: 10, height: 10, bgcolor: color, border: "1px solid", borderColor: tokens.color.borderSubtle }} />
                      ))}
                    </Stack>
                    <Box minWidth={0}>
                      <Typography variant="body2" noWrap sx={{ fontSize: 12 }}>
                        {theme.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: 10, fontWeight: 400 }}>
                        {theme.description}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            <Stack spacing={0.25}>
              <FormControlLabel
                control={<Switch checked={config.settings.general.showTitle} onChange={(event) => onSettingsChange("general", { showTitle: event.target.checked })} />}
                label="แสดงชื่อกราฟ"
                sx={{ m: 0 }}
              />
              <FormControlLabel
                control={<Switch checked={config.settings.general.showSubtitle} onChange={(event) => onSettingsChange("general", { showSubtitle: event.target.checked })} />}
                label="แสดงคำอธิบายรอง"
                sx={{ m: 0 }}
              />
            </Stack>
          </Stack>
        </Box>

        <Box
          sx={{
            px: 0.75,
            py: 0.75,
            borderBottom: "1px solid",
            borderColor: tokens.color.borderSubtle,
            bgcolor: tokens.color.surfaceMuted,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, mb: 0.75 }}>
            Style
          </Typography>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FieldLabel>Background</FieldLabel>
                <Select
                  size="small"
                  value={config.settings.general.backgroundColor}
                  onChange={(event) => onSettingsChange("general", { backgroundColor: event.target.value })}
                  fullWidth
                  aria-label="พื้นหลังกราฟ"
                >
                  <MenuItem value="#FFFFFF">White</MenuItem>
                  <MenuItem value="#F8F9FB">Light Gray</MenuItem>
                  <MenuItem value="#F4F7FB">Soft Blue Gray</MenuItem>
                  <MenuItem value="#0F172A">Executive Dark</MenuItem>
                </Select>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FieldLabel>Palette</FieldLabel>
                <Select
                  size="small"
                  value={config.settings.colors.palette}
                  onChange={(event) => onSettingsChange("colors", { palette: event.target.value as ChartSettings["colors"]["palette"] })}
                  fullWidth
                  aria-label="ชุดสี"
                >
                  <MenuItem value="default">Default</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="pastel">Pastel</MenuItem>
                  <MenuItem value="vivid">Vivid</MenuItem>
                  <MenuItem value="monochrome">Monochrome</MenuItem>
                </Select>
              </Box>
            </Stack>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <FieldLabel>Padding</FieldLabel>
                <Typography variant="caption" color="text.secondary">{config.settings.general.padding}px</Typography>
              </Stack>
              <Slider value={config.settings.general.padding} min={8} max={48} step={4} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("general", { padding: value as number })} />
            </Box>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <FieldLabel>Radius</FieldLabel>
                <Typography variant="caption" color="text.secondary">{config.settings.general.radius}px</Typography>
              </Stack>
              <Slider value={config.settings.general.radius} min={0} max={16} step={1} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("general", { radius: value as number })} />
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
              {config.settings.colors.seriesColors.slice(0, 8).map((color) => (
                <Box key={color} sx={{ width: 16, height: 10, bgcolor: color, border: "1px solid", borderColor: tokens.color.borderSubtle }} />
              ))}
            </Stack>
          </Stack>
        </Box>

        {sections.map((section) => {
          const expanded = expandedSection === section.id;
          const sectionSupported = isSectionSupported(section.id);
          return (
            <Accordion
              key={section.id}
              expanded={expanded}
              onChange={(_, isExpanded) => setExpandedSection(isExpanded ? section.id : "")}
              disableGutters
              elevation={0}
              sx={{
                border: 0,
                borderBottom: "1px solid",
                borderLeft: expanded ? `2px solid ${tokens.color.primary}` : "2px solid transparent",
                borderColor: expanded ? tokens.color.borderSubtle : tokens.color.borderSubtle,
                borderRadius: "0 !important",
                bgcolor: tokens.color.surface,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />}
                aria-controls={`${section.id}-content`}
                id={`${section.id}-header`}
                sx={{
                  minHeight: "34px !important",
                  px: 0.75,
                  "& .MuiAccordionSummary-content": { my: 0, alignItems: "center" },
                  "& .MuiAccordionSummary-expandIconWrapper": { color: sectionSupported ? "text.secondary" : tokens.color.textMuted },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      display: "grid",
                      placeItems: "center",
                      color: expanded ? "primary.main" : "text.secondary",
                      "& svg": { fontSize: 14 },
                    }}
                  >
                    {section.icon}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontSize: 11.5, lineHeight: 1.25 }}>
                    {section.title}
                  </Typography>
                </Stack>
              </AccordionSummary>

              {expanded ? (
              <AccordionDetails sx={{ pt: 0.25, pb: 0.75, px: 0.75, overflow: "hidden" }}>
                {!sectionSupported ? (
                  <Alert severity="info">การตั้งค่านี้ไม่รองรับกับกราฟชนิดปัจจุบัน</Alert>
                ) : (
                  <>
                {section.id === "axis" ? (
                  <Stack spacing={0.75}>
                    <FormControlLabel control={<Switch checked={config.settings.axis.showXAxis} onChange={(event) => onSettingsChange("axis", { showXAxis: event.target.checked })} />} label="แสดง X Axis" />
                    <FormControlLabel control={<Switch checked={config.settings.axis.showYAxis} onChange={(event) => onSettingsChange("axis", { showYAxis: event.target.checked })} />} label="แสดง Y Axis" />
                    <FormControlLabel control={<Switch checked={config.settings.axis.showAxisLabels} onChange={(event) => onSettingsChange("axis", { showAxisLabels: event.target.checked })} />} label="แสดงชื่อแกน" />
                    <TextField label="ชื่อแกน X" size="small" value={config.settings.axis.xAxisLabel} onChange={(event) => onSettingsChange("axis", { xAxisLabel: event.target.value })} />
                    <TextField label="ชื่อแกน Y" size="small" value={config.settings.axis.yAxisLabel} onChange={(event) => onSettingsChange("axis", { yAxisLabel: event.target.value })} />
                    <Select size="small" value={config.settings.axis.rotateXLabels} onChange={(event) => onSettingsChange("axis", { rotateXLabels: event.target.value as 0 | 30 | 45 | 90 })} fullWidth aria-label="หมุน label แกน X">
                      {[0, 30, 45, 90].map((value) => <MenuItem key={value} value={value}>{value}°</MenuItem>)}
                    </Select>
                    <Select size="small" value={config.settings.axis.numberFormat} onChange={(event) => onSettingsChange("axis", { numberFormat: event.target.value as ChartSettings["axis"]["numberFormat"] })} fullWidth aria-label="รูปแบบตัวเลข">
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="compact">Compact</MenuItem>
                      <MenuItem value="currency">Currency</MenuItem>
                      <MenuItem value="percent">Percent</MenuItem>
                    </Select>
                    <Select size="small" value={config.settings.axis.dateFormat} onChange={(event) => onSettingsChange("axis", { dateFormat: event.target.value as ChartSettings["axis"]["dateFormat"] })} fullWidth aria-label="รูปแบบวันที่">
                      <MenuItem value="MMM">MMM</MenuItem>
                      <MenuItem value="MMM YYYY">MMM YYYY</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    </Select>
                  </Stack>
                ) : null}

                {section.id === "labels" ? (
                  <Stack spacing={0.75}>
                    {!labelsSupported ? <Alert severity="info">กราฟชนิดนี้ยังไม่รองรับ data labels</Alert> : null}
                    <FormControlLabel disabled={!labelsSupported} control={<Switch checked={config.settings.labels.showDataLabels} onChange={(event) => onSettingsChange("labels", { showDataLabels: event.target.checked })} />} label="แสดง data labels" />
                    <Select disabled={!labelsSupported} size="small" value={config.settings.labels.position} onChange={(event) => onSettingsChange("labels", { position: event.target.value as ChartSettings["labels"]["position"] })} fullWidth aria-label="ตำแหน่ง labels">
                      <MenuItem value="top">Top</MenuItem>
                      <MenuItem value="inside">Inside</MenuItem>
                      <MenuItem value="outside">Outside</MenuItem>
                    </Select>
                    <FieldLabel>ขนาดตัวอักษร</FieldLabel>
                    <Slider disabled={!labelsSupported} value={config.settings.labels.fontSize} min={9} max={18} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("labels", { fontSize: value as number })} />
                    <ColorInput label="สี label" value={config.settings.labels.color} onChange={(value) => onSettingsChange("labels", { color: value })} />
                  </Stack>
                ) : null}

                {section.id === "legend" ? (
                  <Stack spacing={0.75}>
                    <FormControlLabel control={<Switch checked={config.settings.legend.showLegend} onChange={(event) => onSettingsChange("legend", { showLegend: event.target.checked })} />} label="แสดง Legend" />
                    <Select size="small" value={config.settings.legend.position} onChange={(event) => onSettingsChange("legend", { position: event.target.value as ChartSettings["legend"]["position"] })} fullWidth aria-label="ตำแหน่ง Legend">
                      <MenuItem value="top">Top</MenuItem>
                      <MenuItem value="bottom">Bottom</MenuItem>
                      <MenuItem value="left">Left</MenuItem>
                      <MenuItem value="right">Right</MenuItem>
                    </Select>
                    <Select size="small" value={config.settings.legend.align} onChange={(event) => onSettingsChange("legend", { align: event.target.value as ChartSettings["legend"]["align"] })} fullWidth aria-label="การจัด Legend">
                      <MenuItem value="start">Start</MenuItem>
                      <MenuItem value="center">Center</MenuItem>
                      <MenuItem value="end">End</MenuItem>
                    </Select>
                    <FieldLabel>ขนาด Legend</FieldLabel>
                    <Slider value={config.settings.legend.fontSize} min={9} max={18} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("legend", { fontSize: value as number })} />
                  </Stack>
                ) : null}

                {section.id === "colors" ? (
                  <Stack spacing={0.75}>
                    {config.settings.colors.seriesColors.slice(0, 6).map((color, index) => (
                      <ColorInput key={index} label={`Series ${index + 1}`} value={color} onChange={(value) => updateSeriesColor(index, value)} />
                    ))}
                    <FieldLabel>Opacity</FieldLabel>
                    <Slider value={config.settings.colors.opacity} min={20} max={100} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("colors", { opacity: value as number })} />
                    <ColorInput label="สีเส้นขอบ" value={config.settings.colors.borderColor} onChange={(value) => onSettingsChange("colors", { borderColor: value })} />
                  </Stack>
                ) : null}

                {section.id === "grid" ? (
                  <Stack spacing={0.75}>
                    <FormControlLabel control={<Switch checked={config.settings.grid.showGrid} onChange={(event) => onSettingsChange("grid", { showGrid: event.target.checked })} />} label="แสดงเส้นกริด" />
                    <Select size="small" value={config.settings.grid.lineType} onChange={(event) => onSettingsChange("grid", { lineType: event.target.value as ChartSettings["grid"]["lineType"] })} fullWidth aria-label="รูปแบบเส้นกริด">
                      <MenuItem value="solid">Solid</MenuItem>
                      <MenuItem value="dashed">Dashed</MenuItem>
                      <MenuItem value="dotted">Dotted</MenuItem>
                    </Select>
                    <FieldLabel>ความโปร่งใส</FieldLabel>
                    <Slider value={config.settings.grid.opacity} min={0} max={100} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("grid", { opacity: value as number })} />
                    <ColorInput label="สีเส้นกริด" value={config.settings.grid.color} onChange={(value) => onSettingsChange("grid", { color: value })} />
                  </Stack>
                ) : null}

                {section.id === "tooltip" ? (
                  <Stack spacing={0.75}>
                    <FormControlLabel control={<Switch checked={config.settings.tooltip.enabled} onChange={(event) => onSettingsChange("tooltip", { enabled: event.target.checked })} />} label="เปิด Tooltip" />
                    <Select size="small" value={config.settings.tooltip.theme} onChange={(event) => onSettingsChange("tooltip", { theme: event.target.value as ChartSettings["tooltip"]["theme"] })} fullWidth aria-label="ธีม Tooltip">
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                    </Select>
                    <FieldLabel>Border radius</FieldLabel>
                    <Slider value={config.settings.tooltip.borderRadius} min={0} max={16} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("tooltip", { borderRadius: value as number })} />
                    <FormControlLabel control={<Switch checked={config.settings.tooltip.showSeriesName} onChange={(event) => onSettingsChange("tooltip", { showSeriesName: event.target.checked })} />} label="แสดงชื่อซีรีส์" />
                    <FormControlLabel control={<Switch checked={config.settings.tooltip.showFormattedValue} onChange={(event) => onSettingsChange("tooltip", { showFormattedValue: event.target.checked })} />} label="จัดรูปแบบค่า" />
                  </Stack>
                ) : null}

                {section.id === "animation" ? (
                  <Stack spacing={0.75}>
                    <FormControlLabel control={<Switch checked={config.settings.animation.enabled} onChange={(event) => onSettingsChange("animation", { enabled: event.target.checked })} />} label="เปิด Animation" />
                    <FieldLabel>Duration</FieldLabel>
                    <Slider value={config.settings.animation.duration} min={0} max={1200} step={20} valueLabelDisplay="auto" onChange={(_, value) => onSettingsChange("animation", { duration: value as number })} />
                    <Select size="small" value={config.settings.animation.easing} onChange={(event) => onSettingsChange("animation", { easing: event.target.value as ChartSettings["animation"]["easing"] })} fullWidth aria-label="Easing">
                      <MenuItem value="ease">ease</MenuItem>
                      <MenuItem value="ease-in">ease-in</MenuItem>
                      <MenuItem value="ease-out">ease-out</MenuItem>
                      <MenuItem value="ease-in-out">ease-in-out</MenuItem>
                    </Select>
                  </Stack>
                ) : null}

                {section.id === "advanced" ? (
                  <Stack spacing={0.75}>
                    <TextField
                      label="JSON Config"
                      multiline
                      minRows={8}
                      size="small"
                      value={jsonText}
                      onChange={(event) => setJsonText(event.target.value)}
                      error={Boolean(jsonError)}
                      helperText={jsonError ?? "แก้ไข JSON แล้วกด Import Config"}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" fullWidth onClick={importJsonConfig}>
                        Import
                      </Button>
                      <Button variant="outlined" fullWidth onClick={onCopyConfig}>
                        Copy
                      </Button>
                    </Stack>
                    <Button color="error" variant="outlined" onClick={onReset}>
                      Reset chart config
                    </Button>
                  </Stack>
                ) : null}
                  </>
                )}
              </AccordionDetails>
              ) : null}
            </Accordion>
          );
        })}
      </Box>

      <Box sx={{ height: 44, px: 1, py: 0.6, borderTop: "1px solid", borderColor: "divider", bgcolor: tokens.color.surface }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="caption" color={saveStatus === "unsaved" ? "warning.main" : "success.main"} sx={{ display: "block", fontSize: 11, fontWeight: 500 }}>
              {saveStatus === "saving" ? "Saving" : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Auto save
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" textAlign="right">
            Last saved {lastSavedAt}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

export default memo(PropertyPanel);
