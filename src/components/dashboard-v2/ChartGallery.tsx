import React, { memo, useMemo, useState } from "react";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Button, Chip, IconButton, Menu, MenuItem, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@/components/dashboard-v2/theme";
import { chartCategories, isChartRecommended } from "@/components/dashboard-v2/utils/chartRegistry";
import type { ChartPreset } from "@/components/dashboard-v2/demo/demoTypes";
import type { ChartCategory, ChartDefinition, ChartType, MappingSlot } from "@/components/dashboard-v2/types";

type ChartGalleryProps = {
  charts: ChartDefinition[];
  selectedChartId: ChartType | null;
  selectedCategory: ChartCategory;
  mappings: MappingSlot[];
  presets: ChartPreset[];
  onCategoryChange: (category: ChartCategory) => void;
  onSelectChart: (chartId: ChartType) => void;
  onApplyPreset: (presetId: string) => void;
};

function ChartGallery({ charts, selectedChartId, selectedCategory, mappings, presets, onCategoryChange, onSelectChart, onApplyPreset }: ChartGalleryProps) {
  const [presetAnchor, setPresetAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const compactCategories = useMemo(() => chartCategories.filter((category) => ["all", "basic", "trend", "advanced"].includes(category.id)), []);
  const visibleCharts = useMemo(
    () => charts.filter((chart) => selectedCategory === "all" || chart.category === selectedCategory),
    [charts, selectedCategory]
  );
  const visibleTiles = useMemo(() => {
    const primaryTiles = visibleCharts.slice(0, 5);
    const selectedChart = selectedChartId ? visibleCharts.find((chart) => chart.id === selectedChartId) : undefined;
    if (!selectedChart || primaryTiles.some((chart) => chart.id === selectedChart.id)) return primaryTiles;
    return [selectedChart, ...primaryTiles.filter((chart) => chart.id !== selectedChart.id).slice(0, 4)];
  }, [selectedChartId, visibleCharts]);
  const overflowCharts = useMemo(
    () => visibleCharts.filter((chart) => !visibleTiles.some((visibleChart) => visibleChart.id === chart.id)),
    [visibleCharts, visibleTiles]
  );

  return (
    <Paper
      data-testid="dashboard-v2-chart-selector"
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 76,
        minWidth: 0,
        width: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        position: "relative",
        zIndex: 2,
        overflow: "visible",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={0.75} sx={{ px: 0.75, py: 0.6, height: "100%", minHeight: 0, overflow: "visible" }}>
        <Box
          sx={{
            minHeight: 20,
            display: "grid",
            gridTemplateColumns: "74px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <Typography variant="subtitle2" fontWeight={500} noWrap sx={{ fontSize: 11, lineHeight: 1.25 }}>
            เลือกรูปแบบ
          </Typography>
          <Stack
            direction="row"
            spacing={0}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 0.5,
              overflowX: "hidden",
              minWidth: 0,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {compactCategories.map((category) => {
              const selected = selectedCategory === category.id;

              return (
                <Chip
                  key={category.id}
                  icon={category.icon as React.ReactElement}
                  label={category.label}
                  color="default"
                  variant="outlined"
                  onClick={() => onCategoryChange(category.id)}
                  sx={{
                    minWidth: 0,
                    maxWidth: "100%",
                    px: 0.5,
                    height: 22,
                    flexShrink: 0,
                    fontSize: 10,
                    lineHeight: 1.35,
                    color: selected ? tokens.color.primary : tokens.color.textMuted,
                    bgcolor: selected ? tokens.color.selectedSurface : "transparent",
                    borderColor: selected ? tokens.color.selectedBorder : "transparent",
                    "& .MuiChip-icon": { display: { xs: "none", xl: "inline-flex" }, fontSize: 12 },
                    "& .MuiChip-label": { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" },
                    "&:hover": {
                      bgcolor: tokens.color.primarySubtle,
                      borderColor: selected ? tokens.color.selectedBorder : tokens.color.borderSubtle,
                    },
                  }}
                />
              );
            })}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<TuneRoundedIcon />}
            disabled={!presets.length}
            onClick={(event) => setPresetAnchor(event.currentTarget)}
            sx={{ height: 28, minHeight: 28, px: 1, fontSize: 10, lineHeight: 1.2, flexShrink: 0 }}
          >
            Presets
          </Button>
          <Menu anchorEl={presetAnchor} open={Boolean(presetAnchor)} onClose={() => setPresetAnchor(null)}>
            {presets.map((preset) => (
              <MenuItem
                key={preset.id}
                onClick={() => {
                  setPresetAnchor(null);
                  onApplyPreset(preset.id);
                }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" sx={{ fontSize: 12 }}>
                    {preset.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                    {preset.description}
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "stretch",
            minHeight: 0,
            overflowX: "clip",
            overflowY: "visible",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {visibleTiles.map((chart) => {
            const isSelected = chart.id === selectedChartId;
            const recommended = isChartRecommended(chart, mappings);
            const disabled = !chart.enabled;

            return (
              <Tooltip key={chart.id} title={disabled ? chart.disabledReason ?? "ยังไม่พร้อมใช้งาน" : chart.description} arrow>
                <Box
                  component="button"
                  type="button"
                  aria-disabled={disabled}
                  onClick={() => {
                    if (!disabled) onSelectChart(chart.id);
                  }}
                  aria-label={`เลือก ${chart.thaiName}`}
                  sx={{
                    appearance: "none",
                    height: 38,
                    width: "auto",
                    minWidth: { xs: 76, lg: 88, xl: 104 },
                    flex: "1 1 84px",
                    p: "4px 8px",
                    border: "1px solid",
                    borderColor: isSelected ? tokens.color.selectedBorder : tokens.color.borderSubtle,
                    borderRadius: `${tokens.radius.gallery}px`,
                    bgcolor: isSelected ? tokens.color.selectedSurface : "transparent",
                    color: disabled ? tokens.color.textMuted : "text.primary",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.52 : 1,
                    position: "relative",
                    overflow: "visible",
                    alignItems: "center",
                    gap: 0.5,
                    textAlign: "left",
                    transition: `background-color ${tokens.motion.base}, border-color ${tokens.motion.base}, opacity ${tokens.motion.base}`,
                    "&:hover": {
                      bgcolor: disabled ? "transparent" : tokens.color.primarySubtle,
                      borderColor: disabled ? "transparent" : tokens.color.borderHover,
                      boxShadow: "none",
                      transform: "none",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${tokens.color.focusOutline}`,
                      outlineOffset: 1,
                    },
                    display: "flex",
                  }}
                >
                  {isSelected ? (
                    <Box component="span" sx={{ position: "absolute", left: 0, top: 7, bottom: 7, width: 2, bgcolor: "primary.main" }} />
                  ) : null}
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 18,
                      height: 18,
                      flex: "0 0 18px",
                      borderRadius: `${tokens.radius.gallery}px`,
                      display: "grid",
                      placeItems: "center",
                      color: isSelected ? "primary.main" : tokens.color.textMuted,
                      bgcolor: isSelected ? tokens.color.surface : "transparent",
                      border: "1px solid",
                      borderColor: isSelected ? tokens.color.borderSubtle : "transparent",
                      "& svg": { fontSize: 14 },
                    }}
                  >
                    {chart.icon}
                  </Box>
                  <Box minWidth={0} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={0.5} alignItems="flex-start" minWidth={0}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "normal",
                          fontSize: 11,
                          lineHeight: 1.3,
                          fontWeight: 500,
                          minWidth: 0,
                          flex: "1 1 auto",
                        }}
                      >
                        {chart.thaiName}
                      </Typography>
                      {recommended && !disabled ? (
                        <Box sx={{ display: { xs: "none", xl: "block" }, flex: "0 0 auto", px: 0.5, py: 0.1, border: "1px solid", borderColor: tokens.color.borderSubtle, color: "primary.main", bgcolor: tokens.color.surface, fontSize: 9, lineHeight: 1.25 }}>
                          แนะนำ
                        </Box>
                      ) : null}
                    </Stack>
                    {disabled ? (
                      <Typography variant="caption" noWrap sx={{ display: "block", fontSize: 10, lineHeight: 1.35, color: "text.secondary" }}>
                        Coming soon
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
          {overflowCharts.length ? (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={(event) => setMoreAnchor(event.currentTarget)}
                sx={{ alignSelf: "center", height: 28, minHeight: 28, px: 0.75, flex: "0 0 auto", fontSize: 10, lineHeight: 1.2 }}
              >
                เพิ่มเติม
              </Button>
              <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                {overflowCharts.map((chart) => (
                  <MenuItem
                    key={chart.id}
                    disabled={!chart.enabled}
                    onClick={() => {
                      setMoreAnchor(null);
                      onSelectChart(chart.id);
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                      <Box sx={{ display: "grid", placeItems: "center", color: "text.secondary", "& svg": { fontSize: 15 } }}>
                        {chart.icon}
                      </Box>
                      <Typography variant="body2" noWrap>
                        {chart.thaiName}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
          <IconButton
            aria-label="ดูรูปแบบกราฟเพิ่มเติม"
            onClick={() => onCategoryChange("all")}
            sx={{
              alignSelf: "center",
              display: "none",
              border: "1px solid",
              borderColor: tokens.color.borderSubtle,
              borderRadius: `${tokens.radius.control}px`,
              width: 28,
              height: 28,
              bgcolor: "background.paper",
              "&:hover": { bgcolor: tokens.color.primarySubtle },
            }}
          >
            <ArrowForwardIosRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Stack>
    </Paper>
  );
}

export default memo(ChartGallery);
