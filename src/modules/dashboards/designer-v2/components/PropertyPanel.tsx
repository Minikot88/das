import React, { memo, useEffect, useMemo, useState } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
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
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { DemoThemeId, DemoThemePreset } from "@modules/dashboards/designer-v2/components/demo/demoTypes";
import type {
  AxisTitleSetting,
  ChartConfig,
  ChartSettings,
  MappingSlot,
  SortMode,
} from "@modules/dashboards/designer-v2/components/types";
import {
  axisTitleFor,
  mappingSummary,
  resolvedAxisTitle,
} from "@modules/dashboards/designer-v2/components/utils/axisTitles";

type PropertyPanelProps = {
  config: ChartConfig;
  onSettingsChange: <K extends keyof ChartSettings>(section: K, patch: Partial<ChartSettings[K]>) => void;
  onSortChange?: (sort: SortMode) => void;
  onSave: () => void;
  onPreview: () => void;
  onShare?: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportPng: () => void;
  onReset: () => void;
  onCopyConfig: () => void;
  onReplaceConfig: (config: ChartConfig) => void;
  themePresets: DemoThemePreset[];
  onThemePresetChange: (themeId: DemoThemeId) => void;
};

const workflowSections = [
  { id: "basic", label: "พื้นฐาน" },
  { id: "data", label: "ข้อมูลและแกน" },
  { id: "appearance", label: "รูปแบบ" },
  { id: "display", label: "การแสดงผล" },
  { id: "advanced", label: "ขั้นสูง" },
] as const;

type WorkflowSection = (typeof workflowSections)[number]["id"];

function CompactSwitch({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          inputProps={{ "aria-label": `${label}: ${checked ? "เปิด" : "ปิด"}` }}
        />
      }
      label={`${label} · ${checked ? "เปิด" : "ปิด"}`}
      sx={{ m: 0, minHeight: 30, "& .MuiFormControlLabel-label": { fontSize: 12 } }}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Typography variant="caption" color="text.secondary">{children}</Typography>;
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
        sx={{ width: 36, height: 28, p: 0, border: "1px solid", borderColor: "divider", bgcolor: "transparent" }}
      />
    </Stack>
  );
}

function slot(config: ChartConfig, id: MappingSlot["id"]) {
  return config.mappings.find((item) => item.id === id);
}

function AxisDisplayEditor({
  label,
  mapping,
  setting,
  showAxis,
  onShowAxis,
  onTitleChange,
  onReset,
}: {
  label: "X Axis" | "Y Axis";
  mapping?: MappingSlot;
  setting: AxisTitleSetting;
  showAxis: boolean;
  onShowAxis: (value: boolean) => void;
  onTitleChange: (value: string) => void;
  onReset: () => void;
}) {
  const field = mapping?.fields[0];
  const summary = field ? mappingSummary(mapping.id, field, mapping.aggregation) : null;
  const value = resolvedAxisTitle(setting, field, mapping?.aggregation);
  return (
    <Box sx={{ p: 1, border: "1px solid", borderColor: tokens.color.borderSubtle, borderRadius: `${tokens.radius.control}px` }}>
      <Stack spacing={0.65}>
        <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>
          {label} · {summary?.expression || "ยังไม่ได้เลือกฟิลด์"}
        </Typography>
        {field ? (
          <>
            <Typography variant="caption" color="text.secondary">{summary?.reason}</Typography>
            <Typography variant="caption" color="text.secondary">{field.table}</Typography>
            <Typography variant="caption" color="text.secondary">
              ประเภท: {field.type} · Field: {field.name}{mapping?.aggregation && mapping.aggregation !== "None" ? ` · การคำนวณ: ${mapping.aggregation}` : ""}
            </Typography>
          </>
        ) : null}
        <TextField
          label={`ชื่อแสดงผล ${label}`}
          size="small"
          value={value}
          placeholder={axisTitleFor(field, mapping?.aggregation)}
          onChange={(event) => onTitleChange(event.target.value)}
          helperText={setting.titleMode === "auto" ? "อัตโนมัติจาก field และการคำนวณ" : "กำหนดเอง"}
        />
        {setting.titleMode === "custom" ? (
          <Button size="small" variant="text" onClick={onReset} aria-label={`กลับไปใช้ชื่ออัตโนมัติ ${label}`} sx={{ alignSelf: "flex-start" }}>
            กลับไปใช้ชื่ออัตโนมัติ
          </Button>
        ) : (
          <Button size="small" variant="text" onClick={onReset} aria-label={`กลับไปใช้ชื่ออัตโนมัติ ${label}`} sx={{ display: "none" }}>
            กลับไปใช้ชื่ออัตโนมัติ
          </Button>
        )}
        <CompactSwitch checked={showAxis} label={`แสดง ${label}`} onChange={onShowAxis} />
      </Stack>
    </Box>
  );
}

function AxislessMappingSummary({ config }: { config: ChartConfig }) {
  const category = slot(config, "category");
  const value = slot(config, "value");
  return (
    <Stack spacing={0.75}>
      {[{ label: "Category", mapping: category }, { label: "Value", mapping: value }].map(({ label, mapping }) => {
        const field = mapping?.fields[0];
        const summary = field ? mappingSummary(mapping.id, field, mapping.aggregation) : null;
        return (
          <Box key={label} sx={{ p: 1, border: "1px solid", borderColor: tokens.color.borderSubtle, borderRadius: `${tokens.radius.control}px` }}>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>
              {label} · {summary?.expression || "ยังไม่ได้เลือกฟิลด์"}
            </Typography>
            {field ? <Typography variant="caption" color="text.secondary">{field.table} · {summary?.reason}</Typography> : null}
          </Box>
        );
      })}
    </Stack>
  );
}

function PropertyPanel({
  config,
  onSettingsChange,
  onSortChange,
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
  const [expanded, setExpanded] = useState<WorkflowSection>("data");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const axisless = ["pie", "donut", "gauge", "progress-ring", "treemap", "sunburst", "sankey", "funnel", "radar", "polar-area", "radial-bar", "kpi-card", "metric-card", "scorecard", "table", "summary-table", "pivot-table", "matrix-table"].includes(config.chartType ?? "");
  const xMapping = slot(config, "xAxis");
  const yMapping = slot(config, "yAxis");
  const selectedTheme = useMemo(
    () => themePresets.find((theme) => theme.id === config.settings.general.themePreset) ?? themePresets[0],
    [config.settings.general.themePreset, themePresets],
  );

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
    setJsonError(null);
  }, [config]);

  function importJsonConfig() {
    try {
      onReplaceConfig(JSON.parse(jsonText) as ChartConfig);
      setJsonError(null);
    } catch {
      setJsonError("JSON ไม่ถูกต้อง กรุณาตรวจรูปแบบก่อนนำเข้า");
    }
  }

  function updateAxisTitle(axis: "x" | "y", customTitle: string) {
    const key = axis === "x" ? "xTitle" : "yTitle";
    onSettingsChange("axis", { [key]: { titleMode: "custom", customTitle } });
  }

  function resetAxisTitle(axis: "x" | "y") {
    const key = axis === "x" ? "xTitle" : "yTitle";
    onSettingsChange("axis", { [key]: { titleMode: "auto", customTitle: "" } });
  }

  return (
    <Paper
      data-testid="dashboard-v2-settings-panel"
      elevation={0}
      sx={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", overflow: "hidden", border: "1px solid", borderColor: "divider", borderRadius: 0 }}
    >
      <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.3 }}>ตั้งค่า</Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={onSave} aria-label="บันทึกกราฟ" size="small">บันทึก</Button>
          <Button variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={onPreview} aria-label="พรีวิวกราฟ" size="small">พรีวิว</Button>
          {onShare ? <IconButton onClick={onShare} aria-label="แชร์กราฟ" size="small"><ShareRoundedIcon /></IconButton> : null}
          <IconButton onClick={(event) => setExportAnchor(event.currentTarget)} aria-label="ส่งออกกราฟ" aria-haspopup="menu" aria-expanded={Boolean(exportAnchor)} size="small"><DownloadRoundedIcon /></IconButton>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => { setExportAnchor(null); onExportJson(); }}>ส่งออก JSON</MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); onExportCsv(); }}>ส่งออก CSV</MenuItem>
            <MenuItem onClick={() => { setExportAnchor(null); onExportPng(); }}>ส่งออก PNG</MenuItem>
          </Menu>
        </Stack>
      </Box>

      <Box sx={{ minHeight: 0, overflowY: "auto" }}>
        {workflowSections.map((section) => (
          <Accordion
            key={section.id}
            expanded={expanded === section.id}
            onChange={(_, open) => setExpanded(open ? section.id : "data")}
            disableGutters
            elevation={0}
            sx={{ borderBottom: "1px solid", borderColor: tokens.color.borderSubtle, borderRadius: "0 !important", "&::before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} aria-controls={`${section.id}-settings`} aria-label={section.label}>
              <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600 }}>{section.label}</Typography>
            </AccordionSummary>
            <AccordionDetails id={`${section.id}-settings`} sx={{ px: 1, pt: 0, pb: 1 }}>
              {section.id === "basic" ? (
                <Stack spacing={0.75}>
                  <TextField label="ชื่อกราฟ" size="small" value={config.settings.general.title} onChange={(event) => onSettingsChange("general", { title: event.target.value })} />
                  <TextField label="คำอธิบาย" size="small" value={config.settings.general.subtitle} onChange={(event) => onSettingsChange("general", { subtitle: event.target.value })} />
                  <CompactSwitch checked={config.settings.general.showTitle} label="แสดงชื่อกราฟ" onChange={(showTitle) => onSettingsChange("general", { showTitle })} />
                  <CompactSwitch checked={config.settings.general.showSubtitle} label="แสดงคำอธิบาย" onChange={(showSubtitle) => onSettingsChange("general", { showSubtitle })} />
                </Stack>
              ) : null}

              {section.id === "data" ? (
                <Stack spacing={0.75}>
                  {axisless ? <AxislessMappingSummary config={config} /> : (
                    <>
                      <AxisDisplayEditor
                        label="X Axis"
                        mapping={xMapping}
                        setting={config.settings.axis.xTitle}
                        showAxis={config.settings.axis.showXAxis}
                        onShowAxis={(showXAxis) => onSettingsChange("axis", { showXAxis })}
                        onTitleChange={(value) => updateAxisTitle("x", value)}
                        onReset={() => resetAxisTitle("x")}
                      />
                      <Select size="small" value={config.sort} onChange={(event) => onSortChange?.(event.target.value as SortMode)} aria-label="การเรียง X Axis" fullWidth>
                        <MenuItem value="none">ไม่เรียง</MenuItem>
                        <MenuItem value="ascending">น้อยไปมาก</MenuItem>
                        <MenuItem value="descending">มากไปน้อย</MenuItem>
                        <MenuItem value="dateOrder">ตามวันที่</MenuItem>
                        <MenuItem value="monthOrder">ตามเดือน</MenuItem>
                      </Select>
                      <AxisDisplayEditor
                        label="Y Axis"
                        mapping={yMapping}
                        setting={config.settings.axis.yTitle}
                        showAxis={config.settings.axis.showYAxis}
                        onShowAxis={(showYAxis) => onSettingsChange("axis", { showYAxis })}
                        onTitleChange={(value) => updateAxisTitle("y", value)}
                        onReset={() => resetAxisTitle("y")}
                      />
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Legend: {slot(config, "legend")?.fields.map((field) => field.name).join(", ") || "ยังไม่ได้เลือก"} · Tooltip: {slot(config, "tooltip")?.fields.map((field) => field.name).join(", ") || "ยังไม่ได้เลือก"}
                  </Typography>
                </Stack>
              ) : null}

              {section.id === "appearance" ? (
                <Stack spacing={0.75}>
                  <Select
                    size="small"
                    value={selectedTheme?.id ?? ""}
                    onChange={(event) => onThemePresetChange(event.target.value as DemoThemeId)}
                    aria-label="Theme"
                    fullWidth
                  >
                    {themePresets.map((theme) => <MenuItem key={theme.id} value={theme.id}>{theme.name}</MenuItem>)}
                  </Select>
                  <Select size="small" value={config.settings.colors.palette} onChange={(event) => onSettingsChange("colors", { palette: event.target.value as ChartSettings["colors"]["palette"] })} aria-label="Palette" fullWidth>
                    {["default", "business", "pastel", "vivid", "monochrome"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select>
                  <ColorInput label="Background" value={config.settings.general.backgroundColor} onChange={(backgroundColor) => onSettingsChange("general", { backgroundColor })} />
                  <FieldLabel>Padding</FieldLabel>
                  <Slider aria-label="Padding" value={config.settings.general.padding} min={8} max={48} step={4} onChange={(_, value) => onSettingsChange("general", { padding: value as number })} />
                  <FieldLabel>Radius</FieldLabel>
                  <Slider aria-label="Radius" value={config.settings.general.radius} min={0} max={16} onChange={(_, value) => onSettingsChange("general", { radius: value as number })} />
                </Stack>
              ) : null}

              {section.id === "display" ? (
                <Stack spacing={0.25}>
                  <CompactSwitch checked={config.settings.legend.showLegend} label="Legend" onChange={(showLegend) => onSettingsChange("legend", { showLegend })} />
                  <CompactSwitch checked={config.settings.tooltip.enabled} label="Tooltip" onChange={(enabled) => onSettingsChange("tooltip", { enabled })} />
                  <CompactSwitch checked={config.settings.labels.showDataLabels} label="Data labels" onChange={(showDataLabels) => onSettingsChange("labels", { showDataLabels })} />
                  <CompactSwitch checked={config.settings.grid.showGrid} label="Grid" disabled={axisless} onChange={(showGrid) => onSettingsChange("grid", { showGrid })} />
                </Stack>
              ) : null}

              {section.id === "advanced" ? (
                <Stack spacing={0.75}>
                  {!axisless ? (
                    <>
                      <Select size="small" value={config.settings.axis.numberFormat} onChange={(event) => onSettingsChange("axis", { numberFormat: event.target.value as ChartSettings["axis"]["numberFormat"] })} aria-label="รูปแบบตัวเลข" fullWidth>
                        {["default", "compact", "currency", "percent"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </Select>
                      <Select size="small" value={config.settings.axis.dateFormat} onChange={(event) => onSettingsChange("axis", { dateFormat: event.target.value as ChartSettings["axis"]["dateFormat"] })} aria-label="รูปแบบวันที่" fullWidth>
                        {["MMM", "MMM YYYY", "DD/MM/YYYY"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </Select>
                      <Select size="small" value={config.settings.axis.rotateXLabels} onChange={(event) => onSettingsChange("axis", { rotateXLabels: event.target.value as 0 | 30 | 45 | 90 })} aria-label="การหมุนข้อความ" fullWidth>
                        {[0, 30, 45, 90].map((value) => <MenuItem key={value} value={value}>{value}°</MenuItem>)}
                      </Select>
                      <ColorInput label="Grid color" value={config.settings.grid.color} onChange={(color) => onSettingsChange("grid", { color })} />
                    </>
                  ) : null}
                  <CompactSwitch checked={config.settings.animation.enabled} label="Animation" onChange={(enabled) => onSettingsChange("animation", { enabled })} />
                  <TextField
                    label="JSON configuration"
                    multiline
                    minRows={7}
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    error={Boolean(jsonError)}
                    helperText={jsonError ?? "แก้ไขแล้วกด Import"}
                  />
                  {jsonError ? <Alert severity="error" role="alert">{jsonError}</Alert> : null}
                  <Stack direction="row" spacing={0.5}>
                    <Button variant="outlined" fullWidth onClick={importJsonConfig}>Import</Button>
                    <Button variant="outlined" fullWidth onClick={onCopyConfig}>Copy</Button>
                  </Stack>
                  <Button color="error" variant="outlined" onClick={onReset}>Reset chart config</Button>
                </Stack>
              ) : null}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Paper>
  );
}

export default memo(PropertyPanel);
