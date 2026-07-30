import React, { memo } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DatabaseRoundedIcon from "@mui/icons-material/StorageRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { ChartDefinition, MappingSlot } from "@modules/dashboards/designer-v2/components/types";

type BottomStatusProps = {
  chart?: ChartDefinition;
  mappings: MappingSlot[];
  datasourceName: string;
  sourceLabel: string;
  rowCount: number;
  fieldCount: number;
  filteredRowCount: number;
  activeFilterCount: number;
  saveStatus: "saved" | "saving" | "unsaved" | "failed";
  lastSavedAt: string;
};

function BottomStatus({
  chart,
  mappings,
  datasourceName,
  sourceLabel,
  rowCount,
  fieldCount,
  filteredRowCount,
  activeFilterCount,
  saveStatus,
  lastSavedAt,
}: BottomStatusProps) {
  const yAxis = mappings.find((slot) => slot.id === "yAxis");

  return (
    <Box
      data-testid="dashboard-v2-status-bar"
      component="footer"
      sx={{
        height: 26,
        flex: "0 0 26px",
        px: 1.25,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 1,
        borderTop: "1px solid",
        borderColor: tokens.color.borderSubtle,
        bgcolor: "background.paper",
        overflow: "hidden",
        color: "text.secondary",
        "& .MuiTypography-caption": { fontSize: 9.5, lineHeight: 1.3, fontWeight: 400, flexShrink: 0 },
        "& .MuiSvgIcon-root": { fontSize: 10 },
      }}
    >
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "block", sm: "none" } }}>
        {sourceLabel} · {filteredRowCount.toLocaleString("th-TH")} rows
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" minWidth={0} sx={{ display: { xs: "none", sm: "flex" } }}>
        <DatabaseRoundedIcon sx={{ color: tokens.color.textMuted }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          Source: {sourceLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          Datasource: {datasourceName}
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Typography variant="caption" color="text.secondary" noWrap>
          {filteredRowCount.toLocaleString("th-TH")} / {rowCount.toLocaleString("th-TH")} Rows
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {fieldCount} Fields
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {activeFilterCount} Filters
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
        <TuneRoundedIcon sx={{ color: tokens.color.primary }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {chart?.thaiName ?? "ยังไม่เลือกกราฟ"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {chart?.name ?? "No chart"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          Aggregation: {yAxis?.aggregation ?? "None"}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" minWidth={0} sx={{ display: { xs: "none", md: "flex" } }}>
        <CheckCircleRoundedIcon color={saveStatus === "failed" ? "error" : saveStatus === "unsaved" ? "warning" : "success"} fontSize="small" />
        <Typography variant="caption" color="text.secondary" noWrap>
          {saveStatus === "saving" ? "กำลังบันทึก" : saveStatus === "failed" ? "บันทึกไม่สำเร็จ" : saveStatus === "unsaved" ? "ยังไม่ได้บันทึก" : "บันทึกแล้ว"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          บันทึกล่าสุด {lastSavedAt}
        </Typography>
      </Stack>
    </Box>
  );
}

export default memo(BottomStatus);
