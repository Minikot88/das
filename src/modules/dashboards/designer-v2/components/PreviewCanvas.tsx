import React, { memo } from "react";
import FitScreenRoundedIcon from "@mui/icons-material/FitScreenRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TabletMacRoundedIcon from "@mui/icons-material/TabletMacRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { Box, Button, ButtonGroup, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useDrop } from "react-dnd";
import ChartErrorBoundary from "@modules/dashboards/designer-v2/components/components/charts/ChartErrorBoundary";
import ChartPreview from "@modules/dashboards/designer-v2/components/components/charts/ChartPreview";
import InsightStrip from "@modules/dashboards/designer-v2/components/InsightStrip";
import type { DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { ChartConfig, ChartDefinition, DataField, DeviceMode, DragFieldItem, TransformedChartData } from "@modules/dashboards/designer-v2/components/types";
import type { DemoInsight } from "@modules/dashboards/designer-v2/components/demo/demoTypes";

type PreviewCanvasProps = {
  chart?: ChartDefinition;
  config: ChartConfig;
  datasetRows: DemoDatasetRow[];
  fields: DataField[];
  transformedData?: TransformedChartData;
  previewMode: boolean;
  deviceMode: DeviceMode;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  insights: DemoInsight[];
  previewRef: React.RefObject<HTMLDivElement | null>;
  onDeviceChange: (mode: DeviceMode) => void;
  onZoomChange: (zoom: number) => void;
  onCanvasDrop: (item: DragFieldItem) => void;
  onUndo: () => void;
  onRedo: () => void;
  onRefresh: () => void;
  onResetChart: () => void;
};

function getCanvasWidth(mode: DeviceMode) {
  if (mode === "mobile") return 390;
  if (mode === "tablet") return 768;
  return "100%";
}

function isDarkHexColor(value: string) {
  const normalized = value.trim().replace("#", "");
  if (normalized.length !== 6) return false;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.42;
}

function PreviewCanvas({
  chart,
  config,
  datasetRows,
  fields,
  transformedData,
  previewMode,
  deviceMode,
  zoom,
  canUndo,
  canRedo,
  insights,
  previewRef,
  onDeviceChange,
  onZoomChange,
  onCanvasDrop,
  onUndo,
  onRedo,
  onRefresh,
  onResetChart,
}: PreviewCanvasProps) {
  const previewIsDark = isDarkHexColor(config.settings.general.backgroundColor);
  const previewTextColor = previewIsDark ? "#F8FAFC" : tokens.color.text;
  const previewMutedTextColor = previewIsDark ? "#CBD5E1" : tokens.color.textMuted;
  const [{ isOver }, dropRef] = useDrop<DragFieldItem, void, { isOver: boolean }>(() => ({
    accept: "FIELD",
    drop: (item) => onCanvasDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [onCanvasDrop]);

  return (
    <Paper
      data-testid="dashboard-v2-preview"
      elevation={0}
      sx={{
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        border: "1px solid",
        borderColor: tokens.color.border,
        borderRadius: `${tokens.radius.preview}px`,
        display: "grid",
        gridTemplateRows: previewMode ? "minmax(0, 1fr)" : "30px minmax(0, 1fr)",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      {!previewMode ? (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle, bgcolor: "background.paper" }}
      >
        <Typography variant="subtitle1" sx={{ color: "text.primary", fontSize: 12, fontWeight: 500, lineHeight: 1.25 }}>
          Preview
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              border: "1px solid",
              borderColor: tokens.color.borderSubtle,
              borderRadius: `${tokens.radius.control}px`,
              bgcolor: tokens.color.surface,
              "& .MuiIconButton-root": { width: 24, height: 24 },
              "& .MuiSvgIcon-root": { fontSize: 14 },
            }}
          >
            <Tooltip title="ย้อนกลับ">
              <span>
                <IconButton onClick={onUndo} disabled={!canUndo} aria-label="ย้อนกลับใน Canvas" title={canUndo ? "ย้อนกลับการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ย้อนกลับ"}>
                  <UndoRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="ทำซ้ำ">
              <span>
                <IconButton onClick={onRedo} disabled={!canRedo} aria-label="ทำซ้ำใน Canvas" title={canRedo ? "ทำซ้ำการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ทำซ้ำ"}>
                  <RedoRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="รีเฟรช">
              <IconButton onClick={onRefresh} aria-label="รีเฟรช Preview">
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              border: "1px solid",
              borderColor: tokens.color.borderSubtle,
              borderRadius: `${tokens.radius.control}px`,
              bgcolor: tokens.color.surface,
              "& .MuiSvgIcon-root": { fontSize: 14 },
            }}
          >
            <ButtonGroup variant="outlined" size="small" sx={{ "& .MuiButton-root": { height: 24, minHeight: 24, px: 0.85, fontSize: 10 } }}>
              <Button startIcon={<FitScreenRoundedIcon />} onClick={() => onZoomChange(100)}>
                Fit
              </Button>
              <Button startIcon={<ZoomInRoundedIcon />} onClick={() => onZoomChange(Math.min(160, zoom + 10))}>
                {zoom}%
              </Button>
            </ButtonGroup>
            <ButtonGroup variant="outlined" size="small" sx={{ "& .MuiIconButton-root": { width: 24, height: 24, borderRadius: 0 } }}>
              <IconButton color={deviceMode === "desktop" ? "primary" : "default"} onClick={() => onDeviceChange("desktop")} aria-label="Desktop Preview">
                <MonitorRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton color={deviceMode === "tablet" ? "primary" : "default"} onClick={() => onDeviceChange("tablet")} aria-label="Tablet Preview">
                <TabletMacRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton color={deviceMode === "mobile" ? "primary" : "default"} onClick={() => onDeviceChange("mobile")} aria-label="Mobile Preview">
                <PhoneIphoneRoundedIcon fontSize="small" />
              </IconButton>
            </ButtonGroup>
          </Box>
        </Stack>
      </Stack>
      ) : null}

      <Box
        ref={(node: HTMLDivElement | null) => { dropRef(node); }}
        sx={{
          minHeight: 0,
          minWidth: 0,
          p: 1,
          overflow: "hidden",
          bgcolor: isOver ? tokens.color.primarySubtle : tokens.color.surfaceMuted,
          transition: `background-color ${tokens.motion.base}`,
        }}
      >
        <Box
          ref={previewRef}
          data-dashboard-v2-preview-surface="true"
          sx={{
            width: getCanvasWidth(deviceMode),
            maxWidth: "100%",
            height: "100%",
            minHeight: 0,
            minWidth: 0,
            mx: "auto",
            p: `${config.settings.general.padding}px`,
            bgcolor: config.settings.general.backgroundColor,
            border: deviceMode === "desktop" && zoom === 100 ? 0 : "1px solid",
            borderColor: tokens.color.borderSubtle,
            borderRadius: `${config.settings.general.radius}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: `transform ${tokens.motion.base}, width ${tokens.motion.base}`,
            overflow: "hidden",
          }}
        >
          <Stack spacing={0.75} sx={{ height: "100%", minHeight: 0 }}>
            {config.settings.general.showTitle || config.settings.general.showSubtitle ? (
              <Box>
                {config.settings.general.showTitle ? (
                  <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 500, color: previewTextColor }}>
                    {config.settings.general.title || chart?.thaiName}
                  </Typography>
                ) : null}
                {config.settings.general.showSubtitle ? (
                  <Typography variant="body2" sx={{ color: previewMutedTextColor, fontSize: 11 }}>
                    {config.settings.general.subtitle}
                  </Typography>
                ) : null}
              </Box>
            ) : null}
            {config.textElements.length || config.imageName ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {config.textElements.map((text, index) => (
                  <Box key={`${text}-${index}`} sx={{ px: 1, py: 0.5, border: "1px solid", borderColor: tokens.color.border, color: previewTextColor, fontSize: 12 }}>
                    {text}
                  </Box>
                ))}
                {config.imageName ? (
                  <Box sx={{ px: 1, py: 0.5, border: "1px solid", borderColor: tokens.color.border, color: previewTextColor, fontSize: 12 }}>
                    รูปภาพ: {config.imageName}
                  </Box>
                ) : null}
              </Stack>
            ) : null}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ChartErrorBoundary onReset={onResetChart}>
                <ChartPreview
                  config={config}
                  datasetRows={datasetRows}
                  fields={fields}
                  previewMode={previewMode}
                  deviceMode={deviceMode}
                  zoom={zoom}
                  transformedData={transformedData}
                />
              </ChartErrorBoundary>
            </Box>
            {!previewMode ? <InsightStrip insights={insights} /> : null}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}

export default memo(PreviewCanvas);
