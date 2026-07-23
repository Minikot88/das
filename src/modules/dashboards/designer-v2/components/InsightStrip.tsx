import React, { memo, useState } from "react";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Button, Menu, MenuItem, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { DemoInsight } from "@modules/dashboards/designer-v2/components/demo/demoTypes";

type InsightStripProps = {
  insights: DemoInsight[];
};

function iconFor(severity: DemoInsight["severity"]) {
  if (severity === "success") return <TrendingUpRoundedIcon sx={{ fontSize: 14 }} />;
  if (severity === "warning") return <WarningAmberRoundedIcon sx={{ fontSize: 14 }} />;
  return <InsightsRoundedIcon sx={{ fontSize: 14 }} />;
}

function colorFor(severity: DemoInsight["severity"]) {
  if (severity === "success") return tokens.color.success;
  if (severity === "warning") return tokens.color.warning;
  return tokens.color.primary;
}

function InsightStrip({ insights }: InsightStripProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  if (!insights.length) return null;
  const visibleInsights = insights.slice(0, 2);
  const extraInsights = insights.slice(2);

  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: tokens.color.borderSubtle,
        pt: 0.5,
        minHeight: 34,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ overflow: "hidden" }}>
        {visibleInsights.map((insight) => (
          <Box
            key={insight.id}
            sx={{
              flex: { xs: "1 1 auto", sm: "1 1 0" },
              minWidth: 0,
              border: "1px solid",
              borderColor: tokens.color.borderSubtle,
              bgcolor: tokens.color.surfaceMuted,
              px: 0.75,
              py: 0.35,
            }}
          >
            <Stack direction="row" spacing={0.6} alignItems="center" minWidth={0}>
              <Box sx={{ display: "grid", placeItems: "center", color: colorFor(insight.severity), flexShrink: 0 }}>
                {iconFor(insight.severity)}
              </Box>
              <Box minWidth={0}>
                <Typography variant="caption" noWrap sx={{ display: "block", color: "text.primary", fontSize: 10 }}>
                  {insight.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", xl: "block" }, fontWeight: 400, lineHeight: 1.25, fontSize: 10 }}>
                  {insight.description}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ))}
        {extraInsights.length ? (
          <>
            <Button size="small" variant="text" onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ height: 24, minHeight: 24, px: 0.75, fontSize: 10, flex: "0 0 auto" }}>
              ดูเพิ่มเติม
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              {extraInsights.map((insight) => (
                <MenuItem key={insight.id} onClick={() => setAnchorEl(null)}>
                  <Stack spacing={0.25} sx={{ maxWidth: 320 }}>
                    <Typography variant="body2">{insight.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {insight.description}
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}

export default memo(InsightStrip);
